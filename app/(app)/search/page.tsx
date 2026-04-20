"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search as SearchIcon,
  Filter,
  FileText,
  Download,
  ExternalLink,
  MapPin,
  Calendar,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  clearFilesClientCache,
  fetchFilesClient,
  getFilesCacheSnapshot,
} from "@/app/lib/client-files-cache";
import { useToast } from "@/components/ToastProvider";

type SearchFile = {
  id: string;
  name?: string;
  physicalLocation?: string;
  location?: string;
  department?: string;
  uploadedAt?: string | { seconds?: number };
  documentType?: string;
  fileType?: string;
  ocrText?: string;
};

function formatDate(value: SearchFile["uploadedAt"]) {
  try {
    if (!value) return "-";
    if (typeof value === "string") return new Date(value).toLocaleDateString();
    if (typeof value === "object" && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleDateString();
    }
    return "-";
  } catch {
    return "-";
  }
}

export default function SearchPage() {
  const { showToast, showConfirmToast } = useToast();
  const cached = getFilesCacheSnapshot<SearchFile>();
  const [allFiles, setAllFiles] = useState<SearchFile[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchFilesClient<SearchFile>();

        if (!cancelled) {
          setAllFiles((previous) => {
            if (previous.length === data.length) {
              const sameIds = previous.every(
                (item, index) => item.id === data[index]?.id,
              );
              if (sameIds) {
                return previous;
              }
            }
            return data;
          });
        }
      } catch {
        if (!cancelled) {
          setAllFiles([]);
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
  }, []);

  const handleTypeFilterChange = useCallback((type: string) => {
    setTypeFilter(type);
  }, []);

  const handleDeptFilterChange = useCallback((dept: string) => {
    setDeptFilter(dept);
  }, []);

  const filtered = useMemo(() => {
    return allFiles.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const excerpt = (f.ocrText || "").toLowerCase();
      const searchTerm = query.toLowerCase();
      const type = (f.documentType || f.fileType || "").toUpperCase();
      const dept = f.department || "General";

      const matchQuery =
        !query || name.includes(searchTerm) || excerpt.includes(searchTerm);
      const matchType =
        typeFilter === "All" || type.includes(typeFilter.toUpperCase());
      const matchDept = deptFilter === "All" || dept === deptFilter;
      return matchQuery && matchType && matchDept;
    });
  }, [allFiles, query, typeFilter, deptFilter]);

  const handleDelete = async (file: SearchFile) => {
    if (deletingId) return;

    const confirmed = await showConfirmToast(
      `Delete "${file.name || "Untitled"}" permanently from database?`,
      {
        confirmText: "Delete",
        cancelText: "Cancel",
      },
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(file.id);
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to delete file");
      }

      setAllFiles((prev) => prev.filter((item) => item.id !== file.id));
      clearFilesClientCache();
      showToast("File deleted permanently", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file";
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Search Documents</h1>
        <p className="text-gray-400 text-sm mt-1">
          Find any document or keyword across your archive
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by filename, keyword, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-2xl border text-sm font-medium transition shrink-0 flex items-center gap-2 ${
            showFilters
              ? "bg-sky-500 text-white border-sky-500"
              : "bg-white/10 border-white/15 text-gray-300 hover:bg-white/15 backdrop-blur-sm"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card p-5 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              File Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50"
            >
              <option>All</option>
              <option>PDF</option>
              <option>DOCX</option>
              <option>Image</option>
              <option>TXT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => handleDeptFilterChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50"
            >
              <option>All</option>
              <option>Legal</option>
              <option>HR</option>
              <option>Finance</option>
              <option>Operations</option>
              <option>Administration</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Date From
            </label>
            <input
              type="date"
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50"
            />
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-400">
        {loading ? "Loading..." : `${filtered.length} results found`}
      </p>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((file) => (
          <div
            key={file.id}
            className="glass-card p-5 hover:bg-white/10 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/files/${file.id}`}
                      className="font-medium text-white hover:text-sky-400 transition"
                    >
                      {file.name || "Untitled"}
                    </Link>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {file.physicalLocation || file.location || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.uploadedAt)}
                      </span>
                      <span className="bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                        {file.documentType || file.fileType || "Document"}
                      </span>
                      <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">
                        {file.department || "General"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                  {(file.ocrText || "").slice(0, 220) || "No OCR preview yet."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/files/${file.id}`}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Details
                  </Link>
                  <button className="text-xs text-gray-500 hover:text-gray-300 font-medium flex items-center gap-1 ml-2">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <button
                onClick={() => void handleDelete(file)}
                disabled={deletingId === file.id}
                className="self-end sm:self-start sm:ml-2 p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title="Delete file"
                aria-label={`Delete ${file.name || "file"}`}
              >
                {deletingId === file.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <SearchIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No results found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try different keywords or adjust filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
