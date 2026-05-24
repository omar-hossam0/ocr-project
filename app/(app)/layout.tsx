"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/app/lib/auth-context";
import { useLanguage } from "@/app/lib/language-context";
import AppSidebar, {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "../components/Sidebar";
import LanguageToggle from "@/components/LanguageToggle";
import { ChevronLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar with trigger + back button + language toggle */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <SidebarTrigger className="-ml-1 text-gray-400 hover:text-white" />
          <Separator orientation="vertical" className="h-4 bg-white/10" />
          {pathname !== "/dashboard" && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors group"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${locale === "ar" ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"}`} />
              {t("header.back")}
            </button>
          )}
          <div className="ml-auto flex items-center">
            <LanguageToggle />
          </div>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={`${pathname}-${locale}`}
            initial={{ opacity: 0, x: locale === "ar" ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: locale === "ar" ? -8 : 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>
  );
}
