"use client";
import { useState, useCallback, useMemo } from "react";
import {
  Activity,
  FileText,
  User,
  Calendar,
  ArrowRightLeft,
  Download,
  Filter,
  Search,
} from "lucide-react";

const logs = [
  {
    id: 1,
    file: "Contract_2026_Q1.pdf",
    action: "Checked Out",
    user: "Omar Ahmed",
    date: "Mar 9, 2026",
    time: "09:32 AM",
    department: "Legal",
  },
  {
    id: 2,
    file: "Contract_2026_Q1.pdf",
    action: "Returned",
    user: "Omar Ahmed",
    date: "Mar 9, 2026",
    time: "11:15 AM",
    department: "Legal",
  },
  {
    id: 3,
    file: "Employee_ID_034.jpg",
    action: "Checked Out",
    user: "Sara Hassan",
    date: "Mar 8, 2026",
    time: "02:45 PM",
    department: "HR",
  },
  {
    id: 4,
    file: "Policy_Update.docx",
    action: "Checked Out",
    user: "Khalid Ali",
    date: "Mar 8, 2026",
    time: "10:00 AM",
    department: "Administration",
  },
  {
    id: 5,
    file: "Policy_Update.docx",
    action: "Returned",
    user: "Khalid Ali",
    date: "Mar 8, 2026",
    time: "04:30 PM",
    department: "Administration",
  },
  {
    id: 6,
    file: "Invoice_March.pdf",
    action: "Checked Out",
    user: "Fatima Omar",
    date: "Mar 7, 2026",
    time: "01:20 PM",
    department: "Finance",
  },
  {
    id: 7,
    file: "Invoice_March.pdf",
    action: "Returned",
    user: "Fatima Omar",
    date: "Mar 7, 2026",
    time: "03:00 PM",
    department: "Finance",
  },
  {
    id: 8,
    file: "Lease_Agreement.pdf",
    action: "Checked Out",
    user: "Ahmad Mohamed",
    date: "Mar 6, 2026",
    time: "11:00 AM",
    department: "Legal",
  },
  {
    id: 9,
    file: "Meeting_Notes_Q1.txt",
    action: "Checked Out",
    user: "Layla Ibrahim",
    date: "Mar 5, 2026",
    time: "09:00 AM",
    department: "Operations",
  },
  {
    id: 10,
    file: "Meeting_Notes_Q1.txt",
    action: "Returned",
    user: "Layla Ibrahim",
    date: "Mar 5, 2026",
    time: "05:00 PM",
    department: "Operations",
  },
];

export default function TrackingPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterToggle = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter(
        (log) =>
          !query ||
          log.file.toLowerCase().includes(query.toLowerCase()) ||
          log.user.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">File Tracking</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track file movements and access history
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/15 transition w-fit">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by filename or user..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
          />
        </div>
        <button
          onClick={handleFilterToggle}
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
            <select className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50">
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
              Action
            </label>
            <select className="px-3 py-2 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50">
              <option>All</option>
              <option>Checked Out</option>
              <option>Returned</option>
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

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Desktop table */}
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
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-sky-400" />
                      </div>
                      <span className="font-medium text-white">{log.file}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.action === "Checked Out"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                      <span className="text-gray-300">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-400">{log.department}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {log.date} · {log.time}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/5">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {log.file}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.action === "Checked Out"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {log.action}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {log.user}
                </span>
                <span>
                  {log.date} · {log.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
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
