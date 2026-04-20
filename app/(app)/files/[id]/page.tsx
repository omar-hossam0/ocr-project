"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  MapPin,
  Calendar,
  User,
  Tag,
  Download,
  Edit3,
  ArrowLeft,
  Clock,
  Building2,
  Loader2,
} from "lucide-react";
import OcrSearchableText from "@/components/OcrSearchableText";
import { useToast } from "@/components/ToastProvider";

type FileRecord = {
  id: string;
  name?: string;
  physicalLocation?: string;
  location?: string;
  department?: string;
  uploadedAt?: string | { seconds?: number };
  modifiedAt?: string | { seconds?: number };
  uploadedBy?: string;
  modifiedBy?: string;
  documentType?: string;
  fileType?: string;
  tags?: string[];
  notes?: string;
  ocrText?: string;
};

function formatDate(value: FileRecord["uploadedAt"]): string {
  try {
    if (!value) return "-";
    if (typeof value === "string") return new Date(value).toLocaleString();
    if (typeof value === "object" && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString();
    }
    return "-";
  } catch {
    return "-";
  }
}

export default function FileDetailsPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftTags, setDraftTags] = useState("");

  useEffect(() => {
    const id = params?.id;
    if (!id) {
      setError("Invalid file id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/files/${id}`, { cache: "no-store" });
        const json = (await response.json()) as {
          success?: boolean;
          data?: FileRecord;
          error?: string;
        };

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || "File not found");
        }

        if (!cancelled) {
          setFile(json.data);
          setDraftName(json.data.name || "");
          setDraftNotes(json.data.notes || "");
          setDraftTags(
            Array.isArray(json.data.tags) ? json.data.tags.join(", ") : "",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const tags = useMemo(
    () => (Array.isArray(file?.tags) ? file?.tags : []),
    [file?.tags],
  );

  const getSafeExportBaseName = () => {
    const rawBase = (file?.name || "ocr_result").replace(/\.[^.]+$/, "").trim();
    const sanitized = rawBase.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    return sanitized || "ocr_result";
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  };

  const downloadAsTxt = () => {
    const content = (file?.ocrText || "").trim();
    if (!content) {
      showToast("No OCR text to download", "error");
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${getSafeExportBaseName()}.txt`);
    showToast("TXT downloaded", "success");
    setDownloadMenuOpen(false);
  };

  const downloadAsPdf = async () => {
    const content = (file?.ocrText || "").trim();
    if (!content) {
      showToast("No OCR text to download", "error");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const lineHeight = 16;
      const maxTextWidth = pageWidth - margin * 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const lines = doc.splitTextToSize(content, maxTextWidth) as string[];
      let y = margin;
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      const blob = doc.output("blob") as Blob;
      downloadBlob(blob, `${getSafeExportBaseName()}.pdf`);
      showToast("PDF downloaded", "success");
      setDownloadMenuOpen(false);
    } catch {
      showToast("Failed to generate PDF", "error");
    }
  };

  const downloadAsPng = async () => {
    const content = (file?.ocrText || "").trim();
    if (!content) {
      showToast("No OCR text to download", "error");
      return;
    }

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

    for (const paragraph of content.split(/\r?\n/)) {
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
      if (line) ctx.fillText(line, padding, y);
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
    showToast("PNG downloaded", "success");
    setDownloadMenuOpen(false);
  };

  const handleEditSave = async () => {
    if (!file?.id) return;

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: draftName.trim() || file.name || "Untitled",
        notes: draftNotes,
        tags: draftTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const response = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as {
        success?: boolean;
        data?: FileRecord;
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to save changes");
      }

      setFile(json.data);
      setDraftName(json.data.name || "");
      setDraftNotes(json.data.notes || "");
      setDraftTags(
        Array.isArray(json.data.tags) ? json.data.tags.join(", ") : "",
      );
      setIsEditing(false);
      showToast("File updated successfully", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyText = async () => {
    const content = file?.ocrText || "";
    if (!content.trim()) {
      showToast("No OCR text to copy", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      showToast("OCR text copied", "success");
    } catch {
      showToast("Failed to copy text", "error");
    }
  };

  if (loading) {
    return <div className="text-gray-300">Loading file details...</div>;
  }

  if (error || !file) {
    return (
      <div className="space-y-4">
        <Link
          href="/search"
          className="text-sky-400 hover:text-sky-300 text-sm"
        >
          Back to search
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
          {error || "File not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/search"
          className="p-2 rounded-xl hover:bg-white/10 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="w-full max-w-xl rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xl font-bold text-white outline-none focus:border-sky-500/50"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">
              {file.name || "Untitled"}
            </h1>
          )}
          <p className="text-gray-400 text-sm mt-0.5">
            File Details & OCR Text
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setDownloadMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {downloadMenuOpen && (
              <div className="absolute right-0 top-12 z-20 min-w-40 rounded-xl border border-white/15 bg-[#0d1426] p-1.5 shadow-xl">
                <button
                  onClick={downloadAsPdf}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
                >
                  Download PDF
                </button>
                <button
                  onClick={downloadAsTxt}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
                >
                  Download TXT
                </button>
                <button
                  onClick={downloadAsPng}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
                >
                  Download PNG
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleEditSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isEditing ? "Save" : "Edit"}
            </span>
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setDraftName(file.name || "");
                setDraftNotes(file.notes || "");
                setDraftTags(
                  Array.isArray(file.tags) ? file.tags.join(", ") : "",
                );
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">
              Tags (comma separated)
            </label>
            <input
              value={draftTags}
              onChange={(event) => setDraftTags(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Notes</label>
            <input
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* File Info */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-white">File Information</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Physical Location</p>
                  <p className="text-sm font-medium text-white">
                    {file.physicalLocation || file.location || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium text-white">
                    {file.department || "General"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date Added</p>
                  <p className="text-sm font-medium text-white">
                    {formatDate(file.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Last Modified</p>
                  <p className="text-sm font-medium text-white">
                    {formatDate(file.modifiedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Added By</p>
                  <p className="text-sm font-medium text-white">
                    {file.uploadedBy || "system"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Modified By</p>
                  <p className="text-sm font-medium text-white">
                    {file.modifiedBy || file.uploadedBy || "system"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">File Type</p>
                  <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                    {file.documentType || file.fileType || "Document"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-sky-500/20 text-sky-400 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-6">
            <h2 className="font-semibold text-amber-300 text-sm mb-2">Notes</h2>
            <p className="text-sm text-amber-200/80">
              {isEditing ? draftNotes || "-" : file.notes || "-"}
            </p>
          </div>
        </div>

        {/* OCR Full Text */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">OCR Extracted Text</h2>
              <button
                onClick={handleCopyText}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Copy Text
              </button>
            </div>
            <OcrSearchableText
              text={file.ocrText || ""}
              inputPlaceholder="Search word or sentence inside this file..."
              textContainerClassName="bg-black/30 rounded-xl p-6 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono border border-white/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
