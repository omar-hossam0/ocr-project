"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  User,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useToast } from "@/components/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { showToast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const switchTab = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, #1b2a4a 0%, #050816 70%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl flex rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ minHeight: "480px" }}
      >
        {/* Left  photo panel */}
        <div className="hidden md:block relative w-[42%] flex-shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/login-bg.png')" }}
          />
          {/* subtle dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="absolute bottom-6 left-6 z-10">
            <Link href="/" className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/30">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white drop-shadow">
                DocuMind AI
              </span>
            </Link>
            <p className="text-white/65 text-[11px] max-w-[180px] leading-relaxed drop-shadow">
              AI-powered document archiving scan, search & retrieve in seconds.
            </p>
          </div>
        </div>

        {/* Right  form panel */}
        <div className="flex-1 flex items-center justify-center px-7 sm:px-9 py-8 bg-[#0d0f1a]">
          <div className="w-full max-w-xs">
            <div className="md:hidden flex items-center gap-2 mb-6 justify-center">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">DocuMind AI</span>
            </div>

            <h1 className="text-xl font-bold text-white mb-5">
              Welcome to DocuMind!
            </h1>

            <div className="flex mb-5 rounded-xl overflow-hidden border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => switchTab(false)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  !isSignUp
                    ? "bg-sky-500 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                LOG IN
              </button>
              <button
                onClick={() => switchTab(true)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  isSignUp
                    ? "bg-sky-500 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                SIGN UP
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                try {
                  if (isSignUp) {
                    await signUp(email, password);
                    showToast(
                      "Account created! Welcome to DocuMind AI. Redirecting...",
                      "success",
                    );
                  } else {
                    await signIn(email, password);
                    showToast(
                      "Welcome back! Redirecting to dashboard...",
                      "success",
                    );
                  }
                  // Redirect after 2 seconds so user sees the toast
                  setTimeout(() => {
                    router.push("/dashboard");
                  }, 2000);
                } catch (err) {
                  const errMessage =
                    err instanceof Error
                      ? err.message
                      : "Authentication failed.";
                  setError(errMessage);
                  showToast(errMessage, "error");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignUp ? "signup" : "login"}
                  initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="space-y-3"
                >
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs">
                      {error}
                    </div>
                  )}

                  {isSignUp && (
                    <div className="relative">
                      <label className="absolute -top-2 left-3 text-[10px] font-medium text-sky-400 bg-[#0d0f1a] px-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-gray-600 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 transition"
                        />
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <label className="absolute -top-2 left-3 text-[10px] font-medium text-sky-400 bg-[#0d0f1a] px-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="email"
                        placeholder="hello@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-gray-600 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 transition"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2 left-3 text-[10px] font-medium text-gray-500 bg-[#0d0f1a] px-1">
                      Password (8+ characters)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder=""
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-10 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-gray-600 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!isSignUp && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-[11px] text-sky-400 hover:text-sky-300"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {isSignUp && (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-[11px] text-gray-400">
                        I agree to the{" "}
                        <button
                          type="button"
                          className="text-sky-400 underline underline-offset-2"
                        >
                          Terms & Privacy Policy
                        </button>
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-sky-500 text-white py-3 rounded-xl text-xs font-semibold hover:bg-sky-400 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </>
                    ) : isSignUp ? (
                      "Sign up"
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </motion.div>
              </AnimatePresence>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
