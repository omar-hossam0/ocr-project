"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  FileText,
  User,
  Calendar,
  ArrowRightLeft,
  Download,
  Filter,
  Search,
  Loader2,
  Plus,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useToast } from "@/components/ToastProvider";

type FileRecord = {
  id: string;
  name?: string;
  department?: string;
  physicalLocation?: string;
  location?: string;
};

type TrackingAction = "taken" | "returned" | "moved";

type TrackingRecord = {
  id: string;
  fileId: string;
  userId: string;
  userName?: string;
  action: TrackingAction;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  dateTime?: string | { seconds?: number; nanoseconds?: number };
};

type TrackingViewRow = {
  id: string;
  fileId: string;
  fileName: string;
  action: TrackingAction;
  actionLabel: string;
  userName: string;
  department: string;
  dateTime: Date;
  fromLocation: string;
  toLocation: string;
  note: string;
};

function toDate(value: TrackingRecord["dateTime"]): Date {
  if (!value) return new Date(0);
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return new Date(0);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: TrackingAction): string {
  if (action === "taken") return "Checked Out";
  if (action === "returned") return "Returned";
  return "Moved";
}

function actionBadge(action: TrackingAction): string {
  if (action === "taken") {
    return "bg-amber-500/20 text-amber-400";
  }
  if (action === "returned") {
    return "bg-green-500/20 text-green-400";
  }
  return "bg-violet-500/20 text-violet-400";
}

export default function TrackingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [filesById, setFilesById] = useState<Record<string, FileRecord>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deptFilter, setDeptFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");

  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedAction, setSelectedAction] = useState<TrackingAction>("taken");
  const [toLocation, setToLocation] = useState("");
  const [note, setNote] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trackingResponse, filesResponse] = await Promise.all([
        fetch("/api/tracking?limit=300", { cache: "no-store" }),
        fetch("/api/files", { cache: "no-store" }),
      ]);

      const trackingJson = (await trackingResponse.json()) as {
        success?: boolean;
        data?: TrackingRecord[];
        error?: string;
      };

      const filesJson = (await filesResponse.json()) as {
        success?: boolean;
        data?: FileRecord[];
        error?: string;
      };

      if (!trackingResponse.ok || !trackingJson.success) {
        throw new Error(
          trackingJson.error || "Failed to load tracking records",
        );
      }

      if (
        !filesResponse.ok ||
        !filesJson.success ||
        !Array.isArray(filesJson.data)
      ) {
        throw new Error(filesJson.error || "Failed to load files");
      }

      const nextFilesById = filesJson.data.reduce<Record<string, FileRecord>>(
        (acc, file) => {
          acc[file.id] = file;
          return acc;
        },
        {},
      );

      setFilesById(nextFilesById);
      setRecords(Array.isArray(trackingJson.data) ? trackingJson.data : []);

      if (!selectedFileId && filesJson.data.length > 0) {
        setSelectedFileId(filesJson.data[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load tracking data";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [selectedFileId, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo<TrackingViewRow[]>(() => {
    return records
      .map((record) => {
        const file = filesById[record.fileId];
        const date = toDate(record.dateTime);

        return {
          id: record.id,
          fileId: record.fileId,
          fileName: file?.name || record.fileId || "Unknown file",
          action: record.action,
          actionLabel: actionLabel(record.action),
          userName: record.userName || record.userId || "Unknown",
          department: file?.department || "General",
          dateTime: date,
          fromLocation:
            record.fromLocation ||
            file?.physicalLocation ||
            file?.location ||
            "Unknown",
          toLocation:
            record.toLocation ||
            file?.physicalLocation ||
            file?.location ||
            "Unknown",
          note: record.note || "",
        };
      })
      .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
  }, [records, filesById]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.fileName.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.fromLocation.toLowerCase().includes(q) ||
        row.toLocation.toLowerCase().includes(q);

      const matchesDept = deptFilter === "All" || row.department === deptFilter;
      const matchesAction =
        actionFilter === "All" || row.action === actionFilter;

      const matchesDateFrom =
        !dateFrom || row.dateTime >= new Date(`${dateFrom}T00:00:00`);

      return matchesQuery && matchesDept && matchesAction && matchesDateFrom;
    });
  }, [rows, query, deptFilter, actionFilter, dateFrom]);

  const departments = useMemo(() => {
    const unique = new Set<string>();
    Object.values(filesById).forEach((file) => {
      unique.add(file.department || "General");
    });
    return ["All", ...Array.from(unique).sort()];
  }, [filesById]);

  const exportCsv = () => {
    if (!filteredRows.length) {
      showToast("No tracking rows to export", "error");
      return;
    }

    const header = [
      "File",
      "Action",
      "User",
      "Department",
      "From Location",
      "To Location",
      "Date",
      "Time",
      "Note",
    ];

    const escapeCsv = (value: string) => {
      const safe = value.replace(/"/g, '""');
      return `"${safe}"`;
    };

    const lines = filteredRows.map((row) =>
      [
        row.fileName,
        row.actionLabel,
        row.userName,
        row.department,
        row.fromLocation,
        row.toLocation,
        formatDate(row.dateTime),
        formatTime(row.dateTime),
        row.note,
      ]
        .map((value) => escapeCsv(value))
        .join(","),
    );

    const csv = `${header.join(",")}\n${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tracking_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);

    showToast("Tracking CSV exported", "success");
  };

  const submitTransaction = async () => {
    if (!user) {
      showToast("You must be signed in to record tracking actions", "error");
      return;
    }

    if (!selectedFileId) {
      showToast("Please select a file", "error");
      return;
    }

    if (
      (selectedAction === "returned" || selectedAction === "moved") &&
      !toLocation.trim()
    ) {
      showToast("Destination location is required", "error");
      return;
    }

    const selectedFile = filesById[selectedFileId];
    const currentLocation =
      selectedFile?.physicalLocation || selectedFile?.location || "Unknown";

    setSubmitting(true);
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFileId,
          userId: user.uid,
          userName: user.displayName || user.email || user.uid,
          action: selectedAction,
          fromLocation: currentLocation,
          toLocation:
            selectedAction === "returned" || selectedAction === "moved"
              ? toLocation.trim()
              : undefined,
          note: note.trim() || undefined,
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to record transaction");
      }

      setNote("");
      if (selectedAction !== "taken") {
        setToLocation("");
      }

      await loadData();
      showToast("Tracking action recorded successfully", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record transaction";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">File Tracking</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time file movements and access history from database
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/15 transition w-fit"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-400" />
          Record New Tracking Action
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              File
            </label>
            <select
              value={selectedFileId}
              onChange={(event) => setSelectedFileId(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Select file</option>
              {Object.values(filesById).map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name || file.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Action
            </label>
            <select
              value={selectedAction}
              onChange={(event) =>
                setSelectedAction(event.target.value as TrackingAction)
              }
              className="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="taken">Checked Out (taken)</option>
              <option value="returned">Returned</option>
              <option value="moved">Moved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              To Location
            </label>
            <input
              value={toLocation}
              onChange={(event) => setToLocation(event.target.value)}
              placeholder={
                selectedAction === "taken"
                  ? "Optional for taken"
                  : "Required for returned/moved"
              }
              className="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Note
            </label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => void submitTransaction()}
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-400 transition disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            Save Action
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by filename, user, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
          />
        </div>
        <button
          onClick={() => setShowFilters((prev) => !prev)}
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

      {showFilters && (
        <div className="glass-card p-5 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(event) => setDeptFilter(event.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="All">All</option>
              <option value="taken">Checked Out</option>
              <option value="returned">Returned</option>
              <option value="moved">Moved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>
      )}

      <p className="text-sm text-gray-400">
        {loading
          ? "Loading..."
          : `${filteredRows.length} tracking records found`}
      </p>

      <div className="glass-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  From → To
                </th>
                <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-sky-400" />
                      </div>
                      <span className="font-medium text-white">
                        {row.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionBadge(row.action)}`}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      {row.actionLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                      <span className="text-gray-300">{row.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-400">{row.department}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    <span>{row.fromLocation}</span>
                    <span className="mx-1 text-gray-600">→</span>
                    <span>{row.toLocation}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(row.dateTime)} · {formatTime(row.dateTime)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-white/5">
          {filteredRows.map((row) => (
            <div key={row.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-white text-sm">
                  {row.fileName}
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge(row.action)}`}
                >
                  {row.actionLabel}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {row.userName} · {row.department}
              </div>
              <div className="text-xs text-gray-500">
                {row.fromLocation} → {row.toLocation}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(row.dateTime)} · {formatTime(row.dateTime)}
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">
              No tracking records found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
