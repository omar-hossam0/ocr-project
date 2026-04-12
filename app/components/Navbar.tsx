"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { GoArrowUpRight } from "react-icons/go";
import { FileText } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";

const NAV_ITEMS = [
  {
    label: "Product",
    bgColor: "#0a1628",
    textColor: "#fff",
    links: [
      { label: "Features", href: "/#features", ariaLabel: "Product Features" },
      {
        label: "How it Works",
        href: "/#how-it-works",
        ariaLabel: "How DocuMind Works",
      },
      {
        label: "Industries",
        href: "/#industries",
        ariaLabel: "Industries we serve",
      },
    ],
  },
  {
    label: "App",
    bgColor: "#0d1f3c",
    textColor: "#fff",
    links: [
      { label: "Dashboard", href: "/dashboard", ariaLabel: "Go to Dashboard" },
      { label: "Upload", href: "/upload", ariaLabel: "Upload a document" },
      { label: "Search", href: "/search", ariaLabel: "Search documents" },
    ],
  },
  {
    label: "Account",
    bgColor: "#0f1e38",
    textColor: "#fff",
    links: [
      { label: "Settings", href: "/settings", ariaLabel: "Account Settings" },
      { label: "Tracking", href: "/tracking", ariaLabel: "Document Tracking" },
    ],
  },
];

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = () => {
    if (typeof window === "undefined") return 260;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      const navEl = navRef.current;
      const contentEl = navEl?.querySelector(
        ".card-nav-content",
      ) as HTMLElement;
      if (contentEl) {
        const prev = {
          vis: contentEl.style.visibility,
          pe: contentEl.style.pointerEvents,
          pos: contentEl.style.position,
          h: contentEl.style.height,
        };
        contentEl.style.visibility = "visible";
        contentEl.style.pointerEvents = "auto";
        contentEl.style.position = "static";
        contentEl.style.height = "auto";
        void contentEl.offsetHeight;
        const height = 60 + contentEl.scrollHeight + 16;
        contentEl.style.visibility = prev.vis;
        contentEl.style.pointerEvents = prev.pe;
        contentEl.style.position = prev.pos;
        contentEl.style.height = prev.h;
        return height;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;
    gsap.set(navEl, { height: 60, overflow: "hidden" });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });
    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease: "power3.out",
    });
    tl.to(
      cardsRef.current,
      { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", stagger: 0.08 },
      "-=0.1",
    );
    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;
      tlRef.current.kill();
      const newTl = createTimeline();
      if (newTl) {
        if (isExpanded) newTl.progress(1);
        tlRef.current = newTl;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsOpen(false);
      tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setIsExpanded(false);
    tlRef.current?.reverse();
  };

  const handleAuthAction = async () => {
    // Keep the CTA consistent: send signed-in users to the app, guests to login
    if (user) {
      router.push("/dashboard");
      return;
    }
    router.push("/login");
  };

  const requiresAuth = (href: string) => {
    return ["/dashboard", "/upload", "/search", "/settings", "/tracking"].some(
      (protectedHref) => href === protectedHref || href.startsWith(`${protectedHref}/`),
    );
  };

  const handleNavLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!user && requiresAuth(href)) {
      event.preventDefault();
      closeMenu();
      router.push("/login");
      return;
    }

    closeMenu();
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 w-[90%] max-w-[820px] z-50 top-[1.2em] md:top-[1.5em]">
      <nav
        ref={navRef}
        className="block h-[60px] p-0 rounded-xl shadow-lg relative overflow-hidden will-change-[height] border border-white/10"
        style={{ backgroundColor: "#0a0f1e", backdropFilter: "blur(20px)" }}
      >
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 h-[60px] flex items-center justify-between px-4 z-[2]">
          {/* Hamburger */}
          <button
            onClick={toggleMenu}
            aria-label={isExpanded ? "Close menu" : "Open menu"}
            className="flex flex-col justify-center gap-[6px] h-full cursor-pointer order-2 md:order-none"
          >
            <div
              className={`w-[26px] h-[2px] bg-white transition-all duration-300 origin-center ${isOpen ? "translate-y-[4px] rotate-45" : ""}`}
            />
            <div
              className={`w-[26px] h-[2px] bg-white transition-all duration-300 origin-center ${isOpen ? "-translate-y-[4px] -rotate-45" : ""}`}
            />
          </button>

          {/* Logo — centered on desktop */}
          <Link
            href="/"
            className="flex items-center gap-2 order-1 md:order-none md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
          >
            <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">DocuMind AI</span>
          </Link>

          {/* CTA button */}
          <button
            onClick={handleAuthAction}
            className="hidden md:inline-flex items-center h-[38px] px-5 rounded-lg text-xs font-semibold bg-sky-500 text-white hover:bg-sky-400 transition-colors"
          >
            Get Started →
          </button>
        </div>

        {/* Cards content */}
        <div
          className={`card-nav-content absolute left-0 right-0 top-[60px] bottom-0 p-2 flex flex-col gap-2 z-[1] md:flex-row md:items-end md:gap-3 ${
            isExpanded
              ? "visible pointer-events-auto"
              : "invisible pointer-events-none"
          }`}
          aria-hidden={!isExpanded}
        >
          {NAV_ITEMS.map((item, idx) => (
            <div
              key={item.label}
              ref={(el) => {
                if (el) cardsRef.current[idx] = el;
              }}
              className="relative flex flex-col gap-2 p-3 rounded-[10px] flex-1 h-auto min-h-[60px] md:h-full"
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="text-[17px] md:text-[20px] font-normal tracking-tight">
                {item.label}
              </div>
              <div className="mt-auto flex flex-col gap-1">
                {item.links.map((lnk) => (
                  <Link
                    key={lnk.label}
                    href={lnk.href}
                    aria-label={lnk.ariaLabel}
                    onClick={(event) => handleNavLinkClick(event, lnk.href)}
                    className="inline-flex items-center gap-1.5 text-[14px] md:text-[15px] text-white/80 hover:text-white transition-opacity hover:opacity-100 opacity-75"
                  >
                    <GoArrowUpRight className="shrink-0" aria-hidden="true" />
                    {lnk.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
