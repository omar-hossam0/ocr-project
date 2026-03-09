"use client";
import { useState } from "react";
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
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const allFiles = [
  {
    id: 1,
    name: "Contract_2026_Q1.pdf",
    location: "Cabinet A - Drawer 3",
    department: "Legal",
    date: "Mar 8, 2026",
    type: "PDF",
    excerpt:
      "...this agreement between the two parties shall remain effective until the termination date specified in section 4.2...",
  },
  {
    id: 2,
    name: "Employee_ID_034.jpg",
    location: "Office 2 - Shelf B",
    department: "HR",
    date: "Mar 7, 2026",
    type: "Image",
    excerpt:
      "...employee identification card for Ahmad Mohamed, Department of Engineering, ID Number: EMP-034...",
  },
  {
    id: 3,
    name: "Policy_Update.docx",
    location: "Storage Room 1",
    department: "Administration",
    date: "Mar 6, 2026",
    type: "DOCX",
    excerpt:
      "...updated company policy regarding remote work arrangements effective from March 2026...",
  },
  {
    id: 4,
    name: "Invoice_March.pdf",
    location: "Cabinet B - Drawer 1",
    department: "Finance",
    date: "Mar 5, 2026",
    type: "PDF",
    excerpt:
      "...invoice total amount: 15,000 SAR for office supplies and equipment maintenance services...",
  },
  {
    id: 5,
    name: "Meeting_Notes_Q1.txt",
    location: "Office 1 - Desk",
    department: "Operations",
    date: "Mar 4, 2026",
    type: "TXT",
    excerpt:
      "...quarterly meeting discussed budget allocation, new hiring plan, and upcoming project deadlines...",
  },
  {
    id: 6,
    name: "Lease_Agreement.pdf",
    location: "Cabinet A - Drawer 1",
    department: "Legal",
    date: "Mar 3, 2026",
    type: "PDF",
    excerpt:
      "...lease agreement for office space located at Building 5, Floor 3, total area 200 sqm, monthly rent...",
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  const filtered = allFiles.filter((f) => {
    const matchQuery =
      !query ||
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.excerpt.toLowerCase().includes(query.toLowerCase());
    const matchType = typeFilter === "All" || f.type === typeFilter;
    const matchDept = deptFilter === "All" || f.department === deptFilter;
    return matchQuery && matchType && matchDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal>
        <div>
          <h1 className="text-2xl font-bold text-white">Search Documents</h1>
          <p className="text-gray-400 text-sm mt-1">
            Find any document or keyword across your archive
          </p>
        </div>
      </ScrollReveal>

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
              onChange={(e) => setTypeFilter(e.target.value)}
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
              onChange={(e) => setDeptFilter(e.target.value)}
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
      <p className="text-sm text-gray-400">{filtered.length} results found</p>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((file, i) => (
          <ScrollReveal key={file.id} delay={i * 0.06}>
            <div className="glass-card p-5 hover:bg-white/10 transition">
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
                        {file.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {file.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {file.date}
                        </span>
                        <span className="bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                          {file.type}
                        </span>
                        <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">
                          {file.department}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                    {file.excerpt}
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
              </div>
            </div>
          </ScrollReveal>
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
