"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  FileText,
  FileImage,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Download,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useLanguage } from "@/app/lib/language-context";
import { useToast } from "@/components/ToastProvider";
import {
  getSettingsLocations,
  getSettingsDepartments,
  addFile,
  updateFile,
  getFile,
  runOcr,
  runCameraOcr,
  uploadFileToStorage,
  FileData,
} from "@/app/lib/firestore";
import OcrSearchableText from "@/components/OcrSearchableText";
import ModernSelect from "@/components/ModernSelect";
type ClientTessWorker = {
  recognize: (image: File | Blob) => Promise<{ data?: { text?: string } }>;
  terminate: () => Promise<unknown>;
};

let _clientTessWorker: ClientTessWorker | null = null;
let _clientTessWorkerCreating: Promise<ClientTessWorker> | null = null;

type FileStatus =
  | "available"
  | "processing"
  | "failed"
  | "checked_out"
  | "in_archive";
const OCR_JOB_STORAGE_KEY = "ocrBackgroundFileId";
const OCR_CLIENT_TIMEOUT_MS = 600000; // 10m for large PDFs and first-time lang download
const STORAGE_UPLOAD_TIMEOUT_MS = 180000;

function getFileKind(file: File) {
  const type = file.type || "";
  const name = file.name || "";
  const isImage =
    type.startsWith("image/") || /\.(png|jpe?g|bmp|tiff?|webp)$/i.test(name);
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  return {
    isImage,
    isPdf,
    supported: isImage || isPdf,
  };
}

async function safeReadJson<T>(response: Response): Promise<{
  ok: boolean;
  status: number;
  json: T | null;
  rawText: string;
}> {
  const rawText = await response.text();
  if (!rawText) {
    return {
      ok: response.ok,
      status: response.status,
      json: null,
      rawText: "",
    };
  }

  try {
    return {
      ok: response.ok,
      status: response.status,
      json: JSON.parse(rawText) as T,
      rawText,
    };
  } catch {
    return { ok: response.ok, status: response.status, json: null, rawText };
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tr, locale } = useLanguage();
  const { showToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [ocrResult, setOcrResult] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDiagnostics, setCameraDiagnostics] = useState<{
    secureContext: boolean;
    permission: string;
    deviceCount: number;
    deviceError?: string;
  } | null>(null);
  const [ocrEngineInfo, setOcrEngineInfo] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [backgroundFileId, setBackgroundFileId] = useState<string | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<FileStatus | "idle">(
    "idle",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<
    "image" | "pdf" | "unknown" | null
  >(null);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);

  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  const getSafeExportBaseName = useCallback(() => {
    const rawBase = (fileName || file?.name || "ocr_result")
      .replace(/\.[^.]+$/, "")
      .trim();

    const sanitized = rawBase.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    return sanitized || "ocr_result";
  }, [fileName, file]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Keep blob URL alive briefly to avoid browser race conditions
    // that can result in broken or missing downloaded files.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  }, []);

  const runClientOcrFallback = useCallback(async (targetFile: File) => {
    if (typeof window === "undefined") return "";

    if (_clientTessWorkerCreating) {
      _clientTessWorker = await _clientTessWorkerCreating;
    }

    if (!_clientTessWorker) {
      _clientTessWorkerCreating = (async () => {
        const tesseract = await import("tesseract.js");
        // Keep langs aligned with backend default
        const worker = (await tesseract.createWorker(
          "ara+eng",
        )) as unknown as ClientTessWorker;
        return worker;
      })();

      try {
        _clientTessWorker = await _clientTessWorkerCreating;
      } finally {
        _clientTessWorkerCreating = null;
      }
    }

    const result = await _clientTessWorker.recognize(targetFile);
    return String(result?.data?.text || "").trim();
  }, []);

  const downloadAsTxt = useCallback(() => {
    if (!ocrResult.trim()) return;

    const blob = new Blob([ocrResult], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(blob, `${getSafeExportBaseName()}.txt`);
    showToast("TXT file downloaded", "success");
  }, [ocrResult, downloadBlob, getSafeExportBaseName, showToast]);

  const downloadAsPdf = useCallback(async () => {
    if (!ocrResult.trim()) return;

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const lineHeight = 16;
      const maxTextWidth = pageWidth - margin * 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const lines = doc.splitTextToSize(ocrResult, maxTextWidth) as string[];
      let y = margin;

      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      const pdfBlob = doc.output("blob") as Blob;
      downloadBlob(pdfBlob, `${getSafeExportBaseName()}.pdf`);
      showToast("PDF file downloaded", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate PDF";
      setError(errorMessage);
      showToast(errorMessage, "error");
    }
  }, [ocrResult, downloadBlob, getSafeExportBaseName, showToast]);

  const downloadAsPng = useCallback(async () => {
    if (!ocrResult.trim()) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showToast("Failed to generate PNG", "error");
      return;
    }

    const width = 1400;
    const padding = 60;
    const titleFont = "bold 42px Arial";
    const bodyFont = "28px Arial";
    const lineHeight = 40;

    ctx.font = bodyFont;
    const maxLineWidth = width - padding * 2;
    const wrappedLines: string[] = [];

    for (const paragraph of ocrResult.split(/\r?\n/)) {
      if (!paragraph.trim()) {
        wrappedLines.push("");
        continue;
      }

      const words = paragraph.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxLineWidth) {
          currentLine = candidate;
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) wrappedLines.push(currentLine);
    }

    const minHeight = 900;
    const headerHeight = 120;
    const textBlockHeight = wrappedLines.length * lineHeight;
    const height = Math.max(
      minHeight,
      headerHeight + textBlockHeight + padding,
    );

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#38bdf8";
    ctx.font = titleFont;
    ctx.fillText("OCR Extracted Text", padding, 70);

    ctx.fillStyle = "#e5e7eb";
    ctx.font = bodyFont;
    let y = headerHeight;

    for (const line of wrappedLines) {
      if (line) {
        ctx.fillText(line, padding, y);
      }
      y += lineHeight;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      showToast("Failed to generate PNG", "error");
      return;
    }

    downloadBlob(blob, `${getSafeExportBaseName()}.png`);
    showToast("PNG image downloaded", "success");
  }, [ocrResult, downloadBlob, getSafeExportBaseName, showToast]);

  const persistFileRecord = useCallback(
    async (
      targetFile: File,
      ocrTextValue: string,
      options?: {
        status?: FileStatus;
        storageUrl?: string;
        notesOverride?: string;
      },
    ) => {
      if (!user) {
        const msg = "Missing user";
        setError(msg);
        showToast(msg, "error");
        return;
      }

      setUploading(true);
      setError("");

      try {
        const metadataPayload: FileData = {
          name: fileName || targetFile.name,
          originalName: targetFile.name,
          location,
          physicalLocation: location,
          department,
          fileType: targetFile.type,
          documentType: targetFile.type,
          uploadedBy: user.email || "",
          modifiedBy: user.email || "",
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: options?.notesOverride ?? notes,
          ocrText: ocrTextValue,
          fileSize: targetFile.size,
          storageUrl: options?.storageUrl,
          uploadedAt: new Date(),
          modifiedAt: new Date(),
          status: (options?.status || "available") as FileStatus,
        };

        const savedId = await addFile(metadataPayload);
        return savedId || null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error uploading file";
        setError(errorMessage);
        showToast(errorMessage, "error");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user, fileName, location, department, tags, notes, showToast],
  );

  const patchSavedFile = useCallback(
    async (
      fileId: string,
      updates: { ocrText?: string; status?: FileStatus; notes?: string },
    ) => {
      try {
        await updateFile(fileId, updates);
      } catch (err) {
        console.error("Failed to update saved file:", err);
        throw err;
      }
    },
    [],
  );

  const runBackgroundOcr = useCallback(
    async (savedFileId: string, targetFile: File) => {
      try {
        const ocrJson = await runOcr(targetFile);

        if (!ocrJson?.success) {
          throw new Error(ocrJson?.error || "Failed to run OCR");
        }

        const text = (ocrJson?.data?.text || "").trim();
        await patchSavedFile(savedFileId, {
          status: "available",
          ocrText: text,
          notes: `OCR complete (${ocrJson?.data?.engine || "engine"} • ${ocrJson?.data?.device || "cpu"})`,
        });

        setBackgroundStatus("available");
        setOcrResult(text || "(No text detected by OCR)");
        setOcrEngineInfo(
          `${ocrJson?.data?.engine || "easyocr"} • ${ocrJson?.data?.device || "cpu"}`,
        );
        if (typeof window !== "undefined") {
          localStorage.removeItem(OCR_JOB_STORAGE_KEY);
        }
        showToast("OCR completed in background", "success");
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "OCR background processing failed";

        await patchSavedFile(savedFileId, {
          status: "failed",
          notes: `OCR failed: ${errorMessage}`,
        }).catch(() => undefined);

        setBackgroundStatus("failed");
        setOcrEngineInfo("queue failed");
        setError(
          "File uploaded successfully, but OCR is unavailable/slow in this deployment.",
        );
      }
    },
    [patchSavedFile, showToast],
  );

  const pollBackgroundResult = useCallback(async (fileId: string) => {
    const startedAt = Date.now();
    const timeoutMs = 7 * 60 * 1000;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const fileData = await getFile(fileId);
        if (!fileData) throw new Error("File not found");

        const status = fileData.status;
        const text = (fileData.ocrText || "").trim();
        setBackgroundStatus(status || "processing");

        if (status === "failed") {
          throw new Error(fileData.notes || "OCR failed");
        }

        if (status === "available" || text) {
          setOcrResult(text || "(No text detected by OCR)");
          return;
        }

        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        console.error("Poll error:", err);
        throw err;
      }
    }
    throw new Error("OCR status polling timed out");
  }, []);

  const queueOcrWithPersistence = useCallback(
    async (targetFile: File) => {
      if (!user) {
        const msg = "Missing user";
        setError(msg);
        showToast(msg, "error");
        return;
      }

      setProcessing(true);
      setError("");

      const fileKind = getFileKind(targetFile);

      try {
        // ── Step 1: Run OCR FIRST (fast with cached tesseract.js) ──
        setOcrEngineInfo("running OCR model...");
        setOcrProgress(10);
        let ocrText = "";
        let ocrEngine = "";
        let ocrDevice = "cpu";
        let ocrSource = "";

        if (!fileKind.supported) {
          setOcrEngineInfo("OCR not supported for this file type");
          setOcrProgress(0);
        } else {
          try {
            setOcrProgress(20);
            const ocrJson = await runOcr(targetFile);

            setOcrProgress(70);
            if (ocrJson?.success) {
              ocrText = (ocrJson?.data?.text || "").trim();
              ocrEngine = ocrJson?.data?.engine || "tesseract.js";
              ocrDevice = ocrJson?.data?.device || "cpu";
              ocrSource = ocrJson?.data?.source || "";
              setOcrProgress(90);
            } else {
              console.warn("OCR returned error:", ocrJson?.error);
              setOcrProgress(0);
            }
          } catch (ocrErr) {
            const ocrErrMsg =
              ocrErr instanceof Error ? ocrErr.message : "OCR failed";
            console.warn("OCR failed:", ocrErrMsg);
            setOcrEngineInfo("OCR unavailable");
            setOcrProgress(0);
          }
        }

        // If server OCR didn't return text (common on Vercel), try client-side OCR for images.
        if (!ocrText && fileKind.isImage) {
          try {
            setOcrEngineInfo("running browser OCR...");
            const clientText = await runClientOcrFallback(targetFile);
            if (clientText) {
              ocrText = clientText;
              ocrEngine = "tesseract.js (browser)";
              ocrDevice = "client";
            }
          } catch (clientErr) {
            const msg =
              clientErr instanceof Error
                ? clientErr.message
                : "Browser OCR failed";
            console.warn("Browser OCR failed:", msg);
          }
        }

        // Show OCR result immediately and STOP processing state for UI
        if (ocrText) {
          setOcrResult(ocrText);
          const engineLabel =
            ocrSource === "pdf_text_layer"
              ? "PDF text layer"
              : ocrSource === "pdf_ocr"
                ? "PDF OCR"
                : ocrEngine;
          setOcrEngineInfo(`${engineLabel} • ${ocrDevice}`);
          setOcrProgress(100);
          setProcessing(false); // Stop the spinner immediately
          showToast("OCR completed successfully!", "success");
        } else {
          setOcrResult("(No text detected by OCR)");
          const engineLabel =
            ocrSource === "pdf_text_layer"
              ? "PDF text layer"
              : ocrSource === "pdf_ocr"
                ? "PDF OCR"
                : ocrEngine;
          setOcrEngineInfo(
            engineLabel
              ? `${engineLabel} • no text found`
              : fileKind.supported
                ? "OCR unavailable"
                : "OCR not supported for this file type",
          );
          setOcrProgress(0);
          setProcessing(false);
          if (fileKind.supported) {
            showToast("OCR failed on server; no text detected", "error");
          }
        }

        // ── Step 2: Upload to storage + save metadata (background) ──
        let storageUrl: string | undefined;

        try {
          const uploadResult = await uploadFileToStorage(
            targetFile,
            user.id || user.email || "anonymous",
            fileName || targetFile.name,
          );

          if (uploadResult && uploadResult.url) {
            storageUrl = uploadResult.url;
          } else {
            console.warn(
              "Storage upload failed (continuing without storage URL)",
            );
          }
        } catch (storageErr) {
          console.warn(
            "Storage upload failed (continuing without storage URL):",
            storageErr,
          );
        }

        // Save file metadata to Firestore
        const savedFileId = await persistFileRecord(targetFile, ocrText, {
          status: "available",
          storageUrl,
          notesOverride: ocrText
            ? `OCR complete (${ocrEngine} • ${ocrDevice})`
            : fileKind.supported
              ? "No OCR text extracted"
              : "OCR not supported for this file type",
        });

        if (savedFileId) {
          setBackgroundFileId(savedFileId);
          setBackgroundStatus("available");
          if (typeof window !== "undefined") {
            localStorage.removeItem(OCR_JOB_STORAGE_KEY);
          }
          showToast("File saved successfully!", "success");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error processing file";
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setProcessing(false);
      }
    },
    [user, persistFileRecord, runClientOcrFallback, showToast],
  );

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setFileName(selected.name.replace(/\.[^.]+$/, ""));
    setOcrResult("");
    setOcrEngineInfo("");
    setError("");
  }, []);

  const refreshCameraDiagnostics = useCallback(async () => {
    if (typeof window === "undefined") return;

    const secureContext = Boolean(window.isSecureContext);
    let permission = "unknown";
    let deviceCount = 0;
    let deviceError: string | undefined;

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        permission = result.state || "unknown";
      }
    } catch {
      permission = "unknown";
    }

    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        deviceCount = devices.filter((d) => d.kind === "videoinput").length;
      }
    } catch (err) {
      deviceError = err instanceof Error ? err.message : "Device check failed";
    }

    setCameraDiagnostics({
      secureContext,
      permission,
      deviceCount,
      deviceError,
    });
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewKind(null);
      setPdfPreviewError(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const type = file.type || "";
    const isImage =
      type.startsWith("image/") ||
      /\.(png|jpe?g|bmp|tiff?|webp)$/i.test(file.name);
    const isPdf = type === "application/pdf" || /\.pdf$/i.test(file.name);

    setPreviewUrl(url);
    setPreviewKind(isImage ? "image" : isPdf ? "pdf" : "unknown");
    setPdfPreviewError(null);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!file || previewKind !== "pdf") {
      return;
    }

    let canceled = false;

    const renderPdf = async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (canceled) {
          return;
        }

        const canvas = pdfCanvasRef.current;
        const wrapper = pdfWrapperRef.current;
        if (!canvas || !wrapper) {
          return;
        }

        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = Math.max(320, wrapper.clientWidth || 720);
        const scale = Math.min(2.5, maxWidth / viewport.width);
        const scaledViewport = page.getViewport({ scale });

        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        await page.render({ canvasContext: context, viewport: scaledViewport })
          .promise;
      } catch (err) {
        if (!canceled) {
          const message =
            err instanceof Error ? err.message : "Failed to render PDF preview";
          setPdfPreviewError(message);
        }
      }
    };

    void renderPdf();

    return () => {
      canceled = true;
    };
  }, [file, previewKind]);

  const stopCamera = useCallback(() => {
    const tracks = streamRef.current?.getTracks() || [];
    tracks.forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setCameraLoading(true);
    setCameraReady(false);

    try {
      if (typeof window === "undefined") {
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        const msg = "Camera is not supported in this browser.";
        setError(msg);
        showToast(msg, "error");
        await refreshCameraDiagnostics();
        return;
      }

      if (!window.isSecureContext) {
        const msg = "Camera requires HTTPS (or localhost).";
        setError(msg);
        showToast(msg, "error");
        await refreshCameraDiagnostics();
        return;
      }

      stopCamera();

      const primaryConstraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };
      const fallbackConstraints: MediaStreamConstraints = {
        video: true,
        audio: false,
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "OverconstrainedError" || name === "NotFoundError") {
          stream =
            await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } else {
          throw err;
        }
      }

      if (!stream) {
        throw new Error("Failed to start camera.");
      }

      streamRef.current = stream;
      setCameraOpen(true);
      await refreshCameraDiagnostics();
    } catch (err) {
      const errorName = err instanceof DOMException ? err.name : "";
      let message =
        err instanceof Error
          ? err.message
          : "Cannot access camera. Please allow permission.";

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError"
      ) {
        message =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (errorName === "NotFoundError") {
        message = "No camera device found.";
      } else if (errorName === "NotReadableError") {
        message = "Camera is already in use by another app.";
      } else if (errorName === "OverconstrainedError") {
        message = "Requested camera is not available.";
      } else if (errorName === "SecurityError") {
        message = "Camera requires HTTPS (or localhost).";
      }

      setError(message);
      showToast(message, "error");
      await refreshCameraDiagnostics();
    } finally {
      setCameraLoading(false);
    }
  }, [showToast, stopCamera, refreshCameraDiagnostics]);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  const processCameraCapture = useCallback(
    async (capturedFile: File) => {
      if (!user) {
        const msg = "Missing user";
        setError(msg);
        showToast(msg, "error");
        return;
      }

      setProcessing(true);
      setError("");
      setOcrProgress(10);
      setOcrEngineInfo("running camera OCR model...");

      let ocrText = "";
      let ocrEngine = "camera_ocr";
      let ocrDevice = "cpu";

      try {
        setOcrProgress(30);
        const ocrJson = await runCameraOcr(capturedFile);
        if (!ocrJson?.success) {
          throw new Error(ocrJson?.error || "Camera OCR failed");
        }

        ocrText = String(ocrJson?.data?.text || "").trim();
        ocrEngine = ocrJson?.data?.engine || ocrEngine;
        ocrDevice = ocrJson?.data?.device || ocrDevice;

        setOcrProgress(80);
        if (ocrText) {
          setOcrResult(ocrText);
          setOcrEngineInfo(`${ocrEngine} • ${ocrDevice}`);
          setOcrProgress(100);
          showToast("OCR completed successfully!", "success");
        } else {
          setOcrResult("(No text detected by OCR)");
          setOcrEngineInfo(`${ocrEngine} • no text found`);
          setOcrProgress(0);
          showToast("OCR completed but no text detected", "error");
        }

        let storageUrl: string | undefined;
        try {
          const uploadResult = await uploadFileToStorage(
            capturedFile,
            user.id || user.email || "anonymous",
            fileName || capturedFile.name,
          );

          if (uploadResult && uploadResult.url) {
            storageUrl = uploadResult.url;
          }
        } catch (storageErr) {
          console.warn(
            "Storage upload failed (continuing without storage URL):",
            storageErr,
          );
        }

        const savedFileId = await persistFileRecord(capturedFile, ocrText, {
          status: "available",
          storageUrl,
          notesOverride: ocrText
            ? `OCR complete (${ocrEngine} • ${ocrDevice})`
            : "No OCR text extracted",
        });

        if (savedFileId) {
          setBackgroundFileId(savedFileId);
          setBackgroundStatus("available");
          if (typeof window !== "undefined") {
            localStorage.removeItem(OCR_JOB_STORAGE_KEY);
          }
          showToast("File saved successfully!", "success");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Camera OCR failed";
        setError(errorMessage);
        showToast(errorMessage, "error");
        await queueOcrWithPersistence(capturedFile);
      } finally {
        setProcessing(false);
      }
    },
    [
      user,
      fileName,
      runCameraOcr,
      uploadFileToStorage,
      persistFileRecord,
      queueOcrWithPersistence,
      showToast,
    ],
  );

  const captureFromCamera = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      const msg = "Camera is not ready yet";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.95);
    });

    if (!blob) {
      const msg = "Failed to capture image from camera";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    const capturedFile = new File([blob], `camera_capture_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    handleFileSelect(capturedFile);
    closeCamera();
    showToast("Camera image captured", "success");
    await processCameraCapture(capturedFile);
  }, [closeCamera, handleFileSelect, processCameraCapture, showToast]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [locData, deptData] = await Promise.all([
          getSettingsLocations(),
          getSettingsDepartments(),
        ]);

        const validLocs = locData || [];
        const validDepts = deptData || [];

        setAvailableLocations(validLocs);
        setAvailableDepartments(validDepts);

        // Set defaults from loaded data
        if (validLocs.length > 0) {
          setLocation(validLocs[0].name);
        }
        if (validDepts.length > 0) {
          setDepartment(validDepts[0].name);
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
        showToast(
          "Failed to load locations and departments. Please refresh.",
          "error",
        );
      } finally {
        setLoadingOptions(false);
      }
    };
    void fetchOptions();
  }, [showToast]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedId = localStorage.getItem(OCR_JOB_STORAGE_KEY);
    if (!storedId) {
      return;
    }

    setBackgroundFileId(storedId);
    setBackgroundStatus("processing");

    void pollBackgroundResult(storedId)
      .then(() => {
        setBackgroundStatus("available");
      })
      .catch(() => {
        setBackgroundStatus("failed");
      });
  }, [pollBackgroundResult]);

  useEffect(() => {
    void refreshCameraDiagnostics();
  }, [refreshCameraDiagnostics]);

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) {
      return;
    }

    let canceled = false;
    video.srcObject = stream;

    const startPreview = async () => {
      try {
        await video.play();
        if (!canceled) {
          setCameraReady(true);
        }
      } catch {
        if (!canceled) {
          setError(
            "Camera opened but preview failed to start. Try closing and scanning again.",
          );
        }
      }
    };

    if (video.readyState >= 2) {
      void startPreview();
    } else {
      const onLoaded = () => {
        void startPreview();
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
    }

    return () => {
      canceled = true;
    };
  }, [cameraOpen]);

  const handleUpload = useCallback(async () => {
    if (!user) {
      showToast("Please login to upload files", "error");
      return;
    }
    if (!file) {
      showToast("Please select a file first", "error");
      return;
    }
    if (!location || !department) {
      showToast("Please select storage location and department", "error");
      return;
    }
    await queueOcrWithPersistence(file);
  }, [file, user, location, department, queueOcrWithPersistence, showToast]);

  const handlePublish = useCallback(async () => {
    if (!file || !user) {
      const msg = "Missing file or user";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    if (backgroundFileId) {
      showToast("File already saved via backend OCR flow", "success");
      router.push("/dashboard");
      return;
    }

    setUploading(true);
    setError("");

    try {
      await persistFileRecord(file, ocrResult);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error uploading file";
      setError(errorMessage);
      showToast(errorMessage, "error");
    }
  }, [
    file,
    user,
    backgroundFileId,
    ocrResult,
    persistFileRecord,
    router,
    showToast,
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {tr("upload.title", "Upload Document")}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {tr(
            "upload.description",
            "Upload paper or digital files and convert them to searchable text",
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload area + form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drop zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              dragActive
                ? "border-sky-400 bg-sky-500/10"
                : file
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-white/20 bg-white/5 hover:border-white/30 backdrop-blur-sm"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileSelect(dropped);
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setOcrResult("");
                  }}
                  className="ml-4 p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-white font-medium text-lg">
                  {tr("upload.dropHere", "Drop your documents here")}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  All file types up to 50MB
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-400 hover:bg-sky-500 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
                  >
                    {tr("upload.browseFiles", "Browse Files")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <button
                    onClick={startCamera}
                    disabled={cameraLoading}
                    className="border border-white/20 text-gray-300 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraLoading
                      ? "Starting Camera..."
                      : tr("upload.scan", "Scan")}
                  </button>
                </div>
              </>
            )}
          </div>

          {cameraDiagnostics &&
            (error.toLowerCase().includes("camera") ||
              error.toLowerCase().includes("permission") ||
              error.toLowerCase().includes("https")) && (
              <div className="glass-card p-4 text-xs text-gray-300 space-y-2">
                <div className="text-gray-400">Camera diagnostics</div>
                <div>
                  Secure context:{" "}
                  {cameraDiagnostics.secureContext ? "yes" : "no"}
                </div>
                <div>Permission: {cameraDiagnostics.permission}</div>
                <div>Video devices: {cameraDiagnostics.deviceCount}</div>
                {cameraDiagnostics.deviceError && (
                  <div className="text-red-400">
                    Device error: {cameraDiagnostics.deviceError}
                  </div>
                )}
              </div>
            )}

          {/* Preview */}
          {file && previewUrl && (
            <div className="glass-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">
                  {tr("upload.preview", "Preview")}
                </h2>
                <span className="text-xs text-gray-400">
                  {previewKind === "pdf"
                    ? tr("upload.previewPdf", "Page 1")
                    : previewKind === "image"
                      ? tr("upload.previewImage", "Image")
                      : tr("upload.previewFile", "File")}
                </span>
              </div>
              <div
                ref={pdfWrapperRef}
                className="rounded-2xl border border-white/15 bg-black/40 overflow-hidden min-h-[240px] aspect-[4/3] flex items-center justify-center"
              >
                {previewKind === "image" && (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-contain"
                  />
                )}
                {previewKind === "pdf" && (
                  <div className="w-full h-full flex items-center justify-center">
                    {pdfPreviewError ? (
                      <div className="text-center text-sm text-gray-400">
                        {tr(
                          "upload.previewUnavailable",
                          "Preview not available for this file type",
                        )}
                      </div>
                    ) : (
                      <canvas ref={pdfCanvasRef} className="w-full h-full" />
                    )}
                  </div>
                )}
                {previewKind === "unknown" && (
                  <div className="text-center text-sm text-gray-400 space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-white/90">{file.name}</div>
                    <div className="text-gray-500">
                      {tr(
                        "upload.previewUnavailable",
                        "Preview not available for this file type",
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File details form */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="font-semibold text-white">
              {tr("upload.fileDetails", "File Details")}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {tr("upload.fileName", "File Name")}
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Enter file name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {tr("upload.storageLocation", "Storage Location")}
                </label>
                <ModernSelect
                  options={availableLocations}
                  value={location}
                  onChange={setLocation}
                  placeholder={tr("upload.storageLocation", "Storage Location")}
                  icon={<MapPin className="w-4 h-4" />}
                  locale={locale}
                  loading={loadingOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {tr("upload.department", "Department")}
                </label>
                <ModernSelect
                  options={availableDepartments}
                  value={department}
                  onChange={setDepartment}
                  placeholder={tr("upload.department", "Department")}
                  icon={<FileText className="w-4 h-4" />}
                  locale={locale}
                  loading={loadingOptions}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {tr("upload.tags", "Tags")}
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="contract, legal, urgent..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {tr("upload.notes", "Notes")}
                </label>
                <input
                  type="text"
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || processing}
                className="flex-1 sm:flex-none bg-sky-500 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tr("upload.processingOcr", "Processing OCR...")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {tr("upload.startOcr", "Start OCR & Save")}
                  </>
                )}
              </button>
              <button
                onClick={handlePublish}
                disabled={!ocrResult || uploading}
                className="flex-1 sm:flex-none bg-gray-800 border border-white/15 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tr("common.saving", "Publishing...")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {tr("upload.publish", "Publish")}
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar */}
            {processing && ocrProgress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Processing...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OCR Result sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4">
              {tr("upload.ocrText", "OCR Extracted Text")}
            </h2>
            {backgroundFileId && (
              <p className="text-xs text-gray-400 mb-2">
                Job ID: {backgroundFileId} | Status: {backgroundStatus}
              </p>
            )}
            {ocrEngineInfo && (
              <p className="text-xs text-sky-300 mb-3">
                Model: {ocrEngineInfo}
              </p>
            )}
            {ocrResult ? (
              <div className="space-y-4">
                <OcrSearchableText
                  text={ocrResult}
                  inputPlaceholder={tr(
                    "upload.searchOcr",
                    "Search word or sentence in OCR result...",
                  )}
                  textContainerClassName="bg-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-80 overflow-y-auto text-start font-sans whitespace-pre-wrap break-words"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={downloadAsPdf}
                    className="w-full bg-sky-500/20 border border-sky-400/30 text-sky-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-sky-500/30 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {tr("fileDetails.downloadPdf", "Download PDF")}
                  </button>
                  <button
                    onClick={downloadAsTxt}
                    className="w-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {tr("fileDetails.downloadTxt", "Download TXT")}
                  </button>
                  <button
                    onClick={downloadAsPng}
                    className="w-full bg-orange-500/20 border border-orange-400/30 text-orange-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition flex items-center justify-center gap-2"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    {tr("fileDetails.downloadPng", "Download PNG")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-8 text-center">
                <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {tr("upload.ocrText", "OCR Extracted Text")}
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-sky-500/10 rounded-2xl p-6 border border-sky-500/20">
            <h3 className="font-semibold text-sky-300 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tips for best OCR results
            </h3>
            <ul className="space-y-2 text-sm text-sky-400/80">
              <li>• Use high-resolution scans (300 DPI+)</li>
              <li>• Ensure text is clearly visible</li>
              <li>• Avoid blurry or tilted images</li>
              <li>• OCR model supports: PDF and image files</li>
            </ul>
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-[#060b16] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Camera Capture</h3>
              <button
                onClick={closeCamera}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover rounded-xl bg-black"
            />

            {!cameraReady && (
              <p className="text-xs text-gray-400">
                Initializing camera preview...
              </p>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={captureFromCamera}
                className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
              >
                Capture & Use
              </button>
              <button
                onClick={closeCamera}
                className="border border-white/20 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10"
              >
                {tr("common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
