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
import { useToast } from "@/components/ToastProvider";
import OcrSearchableText from "@/components/OcrSearchableText";
import { uploadFileToStorage } from "@/app/lib/firestore";

type FileStatus =
  | "available"
  | "processing"
  | "failed"
  | "checked_out"
  | "in_archive";
const OCR_JOB_STORAGE_KEY = "ocrBackgroundFileId";
const OCR_CLIENT_TIMEOUT_MS = 45000;
const STORAGE_UPLOAD_TIMEOUT_MS = 30000;

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
  const { showToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState("Cabinet A - Drawer 1");
  const [department, setDepartment] = useState("Legal");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [ocrResult, setOcrResult] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [ocrEngineInfo, setOcrEngineInfo] = useState("");
  const [backgroundFileId, setBackgroundFileId] = useState<string | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<FileStatus | "idle">(
    "idle",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        const metadataPayload = {
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

        const saveResponse = await fetch("/api/files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadataPayload),
        });

        const saveJson = (await saveResponse.json()) as {
          success?: boolean;
          error?: string;
          data?: { id?: string };
        };

        if (!saveResponse.ok || !saveJson.success) {
          throw new Error(
            saveJson.error || "Failed to save file metadata via backend API",
          );
        }

        return saveJson.data?.id || null;
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
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update saved file");
      }
    },
    [],
  );

  const runBackgroundOcr = useCallback(
    async (savedFileId: string, targetFile: File) => {
      try {
        const formData = new FormData();
        formData.append("file", targetFile);

        const ocrResponse = await withTimeout(
          fetch("/api/ocr", {
            method: "POST",
            headers: {
              "x-ocr-js-fallback": "1",
            },
            body: formData,
          }),
          OCR_CLIENT_TIMEOUT_MS,
          "OCR processing",
        );

        const ocrJson = (await ocrResponse.json()) as {
          success?: boolean;
          data?: { text?: string; engine?: string; device?: string };
          error?: string;
        };

        if (!ocrResponse.ok || !ocrJson.success) {
          throw new Error(ocrJson.error || "Failed to run OCR");
        }

        const text = (ocrJson.data?.text || "").trim();
        await patchSavedFile(savedFileId, {
          status: "available",
          ocrText: text,
          notes: `OCR complete (${ocrJson.data?.engine || "engine"} • ${ocrJson.data?.device || "cpu"})`,
        });

        setBackgroundStatus("available");
        setOcrResult(text || "(No text detected by OCR)");
        setOcrEngineInfo(
          `${ocrJson.data?.engine || "easyocr"} • ${ocrJson.data?.device || "cpu"}`,
        );
        if (typeof window !== "undefined") {
          localStorage.removeItem(OCR_JOB_STORAGE_KEY);
        }
        showToast("OCR completed in background", "success");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "OCR background processing failed";

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
      const response = await fetch(`/api/files/${fileId}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: { ocrText?: string; status?: FileStatus; notes?: string };
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to read OCR job status");
      }

      const status = json.data.status;
      const text = (json.data.ocrText || "").trim();
      setBackgroundStatus(status || "processing");

      if (status === "failed") {
        if (typeof window !== "undefined") {
          localStorage.removeItem(OCR_JOB_STORAGE_KEY);
        }
        throw new Error(json.data.notes || "OCR failed");
      }

      if (status === "available") {
        setOcrResult(text || "(No text detected by OCR)");
        setOcrEngineInfo("background queue");
        if (typeof window !== "undefined") {
          localStorage.removeItem(OCR_JOB_STORAGE_KEY);
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    throw new Error("OCR timed out. It may still finish in background.");
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

      try {
        setOcrEngineInfo("uploading file...");
        const uploadedStorage = await withTimeout(
          uploadFileToStorage(targetFile, user.uid, targetFile.name),
          STORAGE_UPLOAD_TIMEOUT_MS,
          "Storage upload",
        );

        setOcrEngineInfo("saving metadata...");
        const savedFileId = await persistFileRecord(targetFile, "", {
          status: "processing",
          storageUrl: uploadedStorage.url,
          notesOverride: "OCR pending",
        });

        if (savedFileId) {
          setBackgroundFileId(savedFileId);
          setBackgroundStatus("processing");
          if (typeof window !== "undefined") {
            localStorage.setItem(OCR_JOB_STORAGE_KEY, savedFileId);
          }

          setOcrEngineInfo("running OCR in background...");
          showToast("File uploaded. OCR started in background.", "success");

          void runBackgroundOcr(savedFileId, targetFile);
          void pollBackgroundResult(savedFileId)
            .then(() => {
              setBackgroundStatus("available");
            })
            .catch(() => {
              setBackgroundStatus("failed");
            });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error processing file";

        const isOcrInfraUnavailable =
          /Python executable not found|OCR service is not configured|Remote OCR failed|Set OCR_SERVICE_URL|OCR processing timed out|OCR JS fallback failed|OCR failed|aborted/i.test(
            errorMessage,
          );

        if (isOcrInfraUnavailable) {
          setOcrEngineInfo("OCR unavailable");
          const savedFileId = await persistFileRecord(targetFile, "");
          if (savedFileId) {
            setBackgroundFileId(savedFileId);
            setBackgroundStatus("failed");
            setError(
              "OCR is unavailable or slow right now. File metadata was saved without extracted text.",
            );
            showToast(
              "File saved successfully. OCR was skipped due to timeout/unavailable service.",
              "success",
            );
            return;
          }
        }

        setError(errorMessage);
        setOcrEngineInfo("queue failed");
        showToast(errorMessage, "error");
      } finally {
        setProcessing(false);
      }
    },
    [user, persistFileRecord, showToast, runBackgroundOcr, pollBackgroundResult],
  );

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setFileName(selected.name.replace(/\.[^.]+$/, ""));
    setOcrResult("");
    setOcrEngineInfo("");
    setError("");
  }, []);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Cannot access camera. Please allow permission.";
      setError(message);
      showToast(message, "error");
    } finally {
      setCameraLoading(false);
    }
  }, [showToast]);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

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
    await queueOcrWithPersistence(capturedFile);
  }, [closeCamera, handleFileSelect, queueOcrWithPersistence, showToast]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
    if (!file || !user) return;
    await queueOcrWithPersistence(file);
  }, [file, user, queueOcrWithPersistence]);

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
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload paper or digital files and convert them to searchable text
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
                  Drop your documents here
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  PDF, JPG, PNG, BMP, TIFF up to 50MB
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-400 hover:bg-sky-500 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
                  >
                    Browse Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp"
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
                    {cameraLoading ? "Starting Camera..." : "Scan"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* File details form */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="font-semibold text-white">File Details</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                File Name
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
                  Storage Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
                  >
                    <option>Cabinet A - Drawer 1</option>
                    <option>Cabinet A - Drawer 2</option>
                    <option>Cabinet A - Drawer 3</option>
                    <option>Cabinet B - Drawer 1</option>
                    <option>Office 1 - Shelf A</option>
                    <option>Office 2 - Shelf B</option>
                    <option>Storage Room 1</option>
                    <option>Storage Room 2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
                >
                  <option>Legal</option>
                  <option>HR</option>
                  <option>Finance</option>
                  <option>Operations</option>
                  <option>IT</option>
                  <option>Administration</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Tags
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
                  Notes
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
                    Processing OCR...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Start OCR & Save
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
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* OCR Result sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4">
              OCR Extracted Text
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
                  inputPlaceholder="Search word or sentence in OCR result..."
                  textContainerClassName="bg-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={downloadAsPdf}
                    className="w-full bg-sky-500/20 border border-sky-400/30 text-sky-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-sky-500/30 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={downloadAsTxt}
                    className="w-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download TXT
                  </button>
                  <button
                    onClick={downloadAsPng}
                    className="w-full bg-orange-500/20 border border-orange-400/30 text-orange-200 px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition flex items-center justify-center gap-2"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-8 text-center">
                <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Select a file or scan with camera to run the real OCR model
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
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
