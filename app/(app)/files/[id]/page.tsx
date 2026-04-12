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
  Bell,
} from "lucide-react";

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
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <h1 className="text-2xl font-bold text-white">
            {file.name || "Untitled"}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            File Details & OCR Text
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Follow</span>
          </button>
        </div>
      </div>

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
            <p className="text-sm text-amber-200/80">{file.notes || "-"}</p>
          </div>
        </div>

        {/* OCR Full Text */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">OCR Extracted Text</h2>
              <button className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                Copy Text
              </button>
            </div>
            <div className="bg-black/30 rounded-xl p-6 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono border border-white/10">
              {file.ocrText || "(No text detected by OCR)"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
