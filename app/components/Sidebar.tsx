"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Search,
  FileText,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/search", label: "Search", icon: Search },
  { href: "/tracking", label: "Tracking", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-400 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">DocuMind AI</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-64 h-full bg-[#0a0f1e]/95 backdrop-blur-xl border-r border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              setCollapsed={setCollapsed}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-black/50 backdrop-blur-xl border-r border-white/10 transition-all duration-300 z-40 ${
          collapsed ? "w-[72px]" : "w-60"
        }`}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  setCollapsed,
  onClose,
}: {
  pathname: string;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white">DocuMind AI</span>
          )}
        </Link>
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            onClose?.();
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 hidden lg:block"
        >
          <ChevronLeft
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${isActive ? "text-sky-400" : "text-gray-500"}`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/login"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition"
        >
          <LogOut className="w-5 h-5 text-gray-500 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Link>
      </div>
    </div>
  );
}
