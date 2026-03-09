"use client";
import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export default function FirebaseDebugPage() {
  const [status, setStatus] = useState({
    config: "checking",
    auth: "checking",
    message: "Initializing Firebase...",
  });

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Try to import and test Firebase
        const { auth } = await import("@/app/lib/firebase");

        // Check if auth object exists
        if (!auth) {
          setStatus({
            config: "error",
            auth: "error",
            message: "❌ Auth object not initialized. Check Firebase config.",
          });
          return;
        }

        // Try to get current user
        const currentUser = auth.currentUser;

        setStatus({
          config: "success",
          auth: currentUser ? "logged-in" : "not-logged-in",
          message: currentUser
            ? `✅ Auth ready - User: ${currentUser.email}`
            : "✅ Firebase Auth initialized",
        });
      } catch (error: unknown) {
        console.error("Firebase Debug Error:", error);
        setStatus({
          config: "error",
          auth: "error",
          message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    };

    checkFirebase();
  }, []);

  const instructions = [
    "1. Go to https://console.firebase.google.com/project/ocr-project-f91fc/authentication",
    '2. In the "Sign-in method" tab, find "Email/Password"',
    '3. Click on "Email/Password" and click "Enable"',
    '4. Make sure it shows "Email/Password - Enabled" with a checkmark',
    "5. Go to https://console.firebase.google.com/project/ocr-project-f91fc/settings/apikeys",
    '6. Check your API Keys - make sure "Unrestricted" key is available',
    "7. If key is restricted, click edit and remove all restrictions for development",
  ];

  return (
    <div className="min-h-screen bg-[#050816] p-8" suppressHydrationWarning>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {status.auth === "error" ? (
              <AlertCircle className="w-6 h-6 text-red-500" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            )}
            <h1 className="text-2xl font-bold text-white">Firebase Debug</h1>
          </div>
          <p className="text-lg text-gray-300">{status.message}</p>
        </div>

        {/* Instructions if error */}
        {status.auth === "error" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h2 className="font-bold text-red-400 mb-3">
                  Action Required: Enable Authentication
                </h2>
                <ol className="space-y-2 text-sm text-red-300">
                  {instructions.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0">
                        {step.split(".")[0]}.
                      </span>
                      <span>{step.split(". ")[1]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Test Signup */}
        {status.auth !== "error" && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <h2 className="font-bold text-green-400 mb-3">
              ✅ Firebase is ready!
            </h2>
            <p className="text-sm text-green-300">
              Go to{" "}
              <a href="/login" className="underline">
                login page
              </a>{" "}
              to test signup.
            </p>
          </div>
        )}

        {/* Firebase Config Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="font-bold text-white mb-3">Firebase Config</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Project ID:</dt>
              <dd className="text-white font-mono">ocr-project-f91fc</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Auth Domain:</dt>
              <dd className="text-white font-mono text-xs break-all">
                ocr-project-f91fc.firebaseapp.com
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Status:</dt>
              <dd
                className={
                  status.auth === "error" ? "text-red-400" : "text-green-400"
                }
              >
                {status.auth === "error" ? "❌ Not Ready" : "✅ Ready"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Links */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="font-bold text-white mb-3">Quick Links</h3>
          <div className="space-y-2">
            <a
              href="https://console.firebase.google.com/project/ocr-project-f91fc/authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sky-400 hover:text-sky-300 text-sm"
            >
              → Firebase Authentication Console
            </a>
            <a
              href="https://console.firebase.google.com/project/ocr-project-f91fc/settings/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sky-400 hover:text-sky-300 text-sm"
            >
              → Firebase API Keys
            </a>
            <a
              href="/login"
              className="block text-sky-400 hover:text-sky-300 text-sm"
            >
              → Go to Login Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
