"use client";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ScanLine,
  Search,
  Shield,
  Zap,
  Upload,
  CheckCircle2,
  Star,
  BarChart3,
  Clock,
  Eye,
  ArrowRight,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/app/lib/auth-context";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen" suppressHydrationWarning>
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              <span className="animated-gradient-text">
                Upload documents get
              </span>
              <br />
              <span className="animated-gradient-text">instant insights</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Find key clauses, extract data, and collaborate effortlessly.
              workflow with enterprise-grade AI that understands context and
              delivers
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-7 py-3.5 rounded-full text-sm font-medium hover:bg-sky-400 transition"
              >
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 border border-white/20 text-gray-300 px-7 py-3.5 rounded-full text-sm font-medium hover:bg-white/10 transition"
              >
                Book A Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* Upload Card Illustration */}
        <ScrollReveal delay={0.3} className="mt-20 max-w-2xl mx-auto">
          <div className="relative">
            <div className="bg-gradient-to-b from-sky-500/80 to-sky-600/60 backdrop-blur-sm rounded-t-3xl rounded-b-[40px] pt-8 pb-16 px-6 sm:px-12 relative overflow-hidden border border-sky-400/30">
              <div className="text-center mb-6">
                <span className="text-white/90 text-sm font-medium tracking-widest uppercase">
                  Upload & Organize Document
                </span>
              </div>
              <div
                className="bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-10 text-center relative z-10 cursor-pointer hover:bg-white/15 transition"
                onClick={() => router.push("/upload")}
              >
                <div className="flex justify-center mb-4">
                  <Upload className="w-10 h-10 text-white/60" />
                </div>
                <p className="text-white font-medium text-lg">
                  Drop your documents here
                </p>
                <p className="text-white/60 text-sm mt-1">
                  PDF, DOCX, TXT up to 50MB
                </p>
                <button
                  className="mt-6 bg-sky-400 hover:bg-sky-300 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/upload");
                  }}
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Powerful AI features for every team
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              From OCR to advanced clause detection, our platform handles the
              complexity so you can focus on what matters.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* OCR + Parsing */}
            <ScrollReveal delay={0}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">99.8%</p>
                    <p>Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">180+</p>
                    <p>Documents processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">&lt;2s</p>
                    <p>Average Time</p>
                  </div>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <ScanLine className="w-4 h-4 text-sky-400" />
                    <span>Advanced text recognition</span>
                    <div className="flex-1 border-t border-dashed border-white/20" />
                    <Star className="w-4 h-4 text-sky-400" />
                    <span>Structure preservation</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300 justify-center">
                    <Zap className="w-4 h-4 text-sky-400" />
                    <span>Lightning-fast processing</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">OCR+Parsing</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Extract text and structure from any document format with 99.9%
                  accuracy
                </p>
              </div>
            </ScrollReveal>

            {/* Clause Detection */}
            <ScrollReveal delay={0.1}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <Zap className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Smart analysis
                      </p>
                      <p className="text-xs text-gray-400">
                        Intelligent parsing of complex legal documents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Instant results
                      </p>
                      <p className="text-xs text-gray-400">
                        Get clause identification in seconds
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Legal precision
                      </p>
                      <p className="text-xs text-gray-400">
                        Trained on extensive legal databases
                      </p>
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm mb-6 text-gray-300">
                  <Zap className="w-4 h-4 text-sky-400" />
                  AI-Powered
                </div>
                <h3 className="text-xl font-bold text-white">
                  Clause Detection
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  AI-powered identification of key contract clauses and legal
                  terms
                </p>
              </div>
            </ScrollReveal>

            {/* Collaboration */}
            <ScrollReveal delay={0.15}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/40 border-2 border-white/20" />
                    <div className="w-10 h-10 rounded-full bg-orange-500/40 border-2 border-white/20" />
                    <div className="w-10 h-10 rounded-full bg-green-500/40 border-2 border-white/20 flex items-center justify-center text-xs text-white">
                      ...
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-gray-300">Team Sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-gray-300">Live Comments</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-gray-300">Visual Annotations</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">Collaboration</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Real-time team collaboration with comments and annotations
                </p>
              </div>
            </ScrollReveal>

            {/* Summary & Risk Score */}
            <ScrollReveal delay={0.2}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="bg-white/10 rounded-xl border border-white/15 p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Upload Document for Analysis
                      </p>
                      <p className="text-xs text-gray-500">
                        Drag & drop your document or click to select. Supports
                        PDF, DOCX, TXT formats
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-gray-500">Choose File</span>
                    <span className="text-sky-400 font-medium">
                      Analyze Document
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Summary & Risk Score
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Intelligent document summaries with automated risk assessment
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Tailored for your industry
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              From OCR to advanced clause detection, our platform handles the
              complexity so you can focus on what matters.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Legal Teams */}
            <ScrollReveal delay={0}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="bg-white/10 rounded-xl p-5 mb-6">
                  <p className="font-semibold text-white text-sm mb-4">
                    Contract Review & Due Diligence
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-gray-500" />
                      Risk assessment scoring
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-gray-500" />
                      Automated contract analysis
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-gray-500" />
                      Clause comparison tools
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white">Legal Teams</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Contract review, diligence, and compliance checking
                </p>
              </div>
            </ScrollReveal>

            {/* Compliance Teams */}
            <ScrollReveal delay={0.1}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="bg-white/10 rounded-xl p-5 mb-6">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 rounded-full bg-red-500/60" />
                      Resume screening & analysis
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 rounded-full bg-red-500/60" />
                      Employee data extraction
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 rounded-full bg-red-500/60" />
                      Policy compliance checks
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-4">
                    <div className="text-center">
                      <p className="font-bold text-white">90%</p>
                      <p className="text-xs">Time Reduction</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white">2x</p>
                      <p className="text-xs">Faster</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white">300k+</p>
                      <p className="text-xs">Trusted User</p>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Compliance Teams
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Contract review, diligence, and compliance checking
                </p>
              </div>
            </ScrollReveal>

            {/* HR Departments */}
            <ScrollReveal delay={0.2}>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full">
                <div className="bg-white/10 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 text-sm text-green-400 mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Automated contract analysis
                  </div>
                  <p className="font-semibold text-white text-sm mb-2">
                    Document Verification Types
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Eye className="w-4 h-4 text-gray-500" />
                    Identity Documents
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Driver&apos;s licenses, passports, state IDs with photo
                    verification and expiration tracking
                  </p>
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium">
                    <Shield className="w-3 h-3" />
                    Auto-Verified
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white">HR Departments</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Employee document processing compliance verification
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-gray-400 mb-16 max-w-xl mx-auto">
              Get started in three simple steps
            </p>
          </ScrollReveal>
          <div className="grid sm:grid-cols-3 gap-8">
            <ScrollReveal delay={0}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Upload</h3>
                <p className="text-sm text-gray-400">
                  Scan or upload your paper documents
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Process</h3>
                <p className="text-sm text-gray-400">
                  AI extracts text and organizes content
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">
                  Search & Retrieve
                </h3>
                <p className="text-sm text-gray-400">
                  Find any document or info instantly
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <ScrollReveal>
        <footer className="border-t border-white/10 bg-[#0a0d1a]/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">
                    DocuMind AI
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed max-w-[200px]">
                  AI-powered document archiving — scan, search, and retrieve any
                  file in seconds.
                </p>
              </div>

              {/* Discover */}
              <div>
                <h4 className="text-white font-semibold mb-5">Discover</h4>
                <ul className="space-y-3">
                  {[
                    { label: "Features", href: "/#features" },
                    { label: "How it Works", href: "/#how-it-works" },
                    { label: "Tutorials", href: "#" },
                    { label: "FAQ", href: "#" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-gray-400 hover:text-white transition"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-white font-semibold mb-5">Company</h4>
                <ul className="space-y-3">
                  {[
                    { label: "About us", href: "#" },
                    { label: "Affiliate Program", href: "#" },
                    { label: "Investor", href: "#" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-gray-400 hover:text-white transition"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Industries</span>
                    <span className="text-[10px] font-semibold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30">
                      Soon!
                    </span>
                  </li>
                </ul>
              </div>

              {/* Get in touch */}
              <div>
                <h4 className="text-white font-semibold mb-5">Get in touch</h4>
                <div className="flex gap-2 mb-6">
                  <input
                    type="email"
                    placeholder="email address"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition"
                  />
                  <button className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap">
                    Subscribe
                  </button>
                </div>
                <h4 className="text-white font-semibold mb-3">Follow us</h4>
                <div className="flex items-center gap-4">
                  <a
                    href="#"
                    aria-label="LinkedIn"
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="Twitter"
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                &copy; 2026 DocuMind AI. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                {[
                  "Cookies",
                  "Privacy policy",
                  "Security",
                  "Legal documents",
                ].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </ScrollReveal>
    </div>
  );
}
