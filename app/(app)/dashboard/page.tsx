import Link from "next/link";
import {
  FileText,
  Upload,
  Search,
  Activity,
  Settings,
  ArrowRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  FolderOpen,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const stats = [
  {
    label: "Total Files",
    value: "1,284",
    icon: FolderOpen,
    color: "bg-sky-500/20 text-sky-400",
  },
  {
    label: "New This Week",
    value: "36",
    icon: TrendingUp,
    color: "bg-green-500/20 text-green-400",
  },
  {
    label: "Expiring Soon",
    value: "8",
    icon: AlertTriangle,
    color: "bg-amber-500/20 text-amber-400",
  },
  {
    label: "Pending OCR",
    value: "3",
    icon: Clock,
    color: "bg-purple-500/20 text-purple-400",
  },
];

const recentFiles = [
  {
    name: "Contract_2026_Q1.pdf",
    location: "Cabinet A - Drawer 3",
    date: "Mar 8, 2026",
    type: "PDF",
  },
  {
    name: "Employee_ID_034.jpg",
    location: "Office 2 - Shelf B",
    date: "Mar 7, 2026",
    type: "Image",
  },
  {
    name: "Policy_Update.docx",
    location: "Storage Room 1",
    date: "Mar 6, 2026",
    type: "DOCX",
  },
  {
    name: "Invoice_March.pdf",
    location: "Cabinet B - Drawer 1",
    date: "Mar 5, 2026",
    type: "PDF",
  },
  {
    name: "Meeting_Notes.txt",
    location: "Office 1 - Desk",
    date: "Mar 4, 2026",
    type: "TXT",
  },
];

const shortcuts = [
  { label: "Upload File", href: "/upload", icon: Upload, color: "bg-sky-500" },
  {
    label: "Search Files",
    href: "/search",
    icon: Search,
    color: "bg-green-500",
  },
  {
    label: "Tracking",
    href: "/tracking",
    icon: Activity,
    color: "bg-purple-500",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    color: "bg-gray-700",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Overview of your document archive
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sky-400 transition w-fit"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Link>
        </div>
      </ScrollReveal>

      {/* Quick Search */}
      <ScrollReveal delay={0.05}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search for any document, keyword, or location..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
          />
        </div>
      </ScrollReveal>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i * 0.08}>
            <div className="glass-card glass-card-hover p-5">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {shortcuts.map((item, i) => (
          <ScrollReveal key={item.label} delay={i * 0.07}>
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 glass-card glass-card-hover p-4 hover:bg-white/10 transition group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} text-white shrink-0`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                {item.label}
              </span>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {/* Recent Files */}
      <ScrollReveal delay={0.1}>
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Recent Files</h2>
            <Link
              href="/search"
              className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentFiles.map((file, i) => (
              <Link
                key={i}
                href={`/files/${i + 1}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {file.location}
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-xs text-gray-500">{file.date}</p>
                  <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                    {file.type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
