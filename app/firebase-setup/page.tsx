"use client";
import React, { useState } from "react";
import { ExternalLink, CheckCircle2, AlertCircle, Copy } from "lucide-react";

export default function FirebaseSetupPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      id: "firestore",
      title: "Step 1: Create Firestore Database",
      link: "https://console.firebase.google.com/project/ocr-project-f91fc/firestore/data",
      instructions: [
        "1. Open the link →",
        '2. Click "Create database"',
        '3. Select "Start in test mode"',
        '4. Click "Create"',
        '5. Wait for: "Firestore is ready"',
      ],
    },
    {
      id: "rules",
      title: "Step 2: Update Firestore Security Rules",
      link: "https://console.firebase.google.com/project/ocr-project-f91fc/firestore/rules",
      instructions: [
        "1. Open Rules tab",
        "2. Replace all code with:",
        "3. Click Publish",
      ],
      code: "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050816] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            🔧 Firebase Setup - Firestore Only
          </h1>
          <p className="text-gray-400 text-lg">
            Follow these 2 steps to complete Firestore configuration
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 font-semibold">
              ℹ️ Using Firestore Only
            </p>
            <p className="text-blue-200 text-sm mt-1">
              This project uses Firestore for all data including files and
              statistics. No Realtime Database needed.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold">
              ⚠️ Complete Both Steps
            </p>
            <p className="text-yellow-200 text-sm mt-1">
              Both steps are required to use the application
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition"
            >
              {/* Step Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
                  {idx + 1}
                </div>
                <h2 className="text-xl font-bold text-white">{step.title}</h2>
              </div>

              {/* Link */}
              <a
                href={step.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 mb-4 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Open Firebase Console
              </a>

              {/* Instructions */}
              <div className="bg-black/30 rounded-lg p-4 mb-4 space-y-2">
                {step.instructions.map((instruction, i) => (
                  <p key={i} className="text-gray-300 text-sm">
                    {instruction}
                  </p>
                ))}
              </div>

              {/* Code Block (if any) */}
              {step.code && (
                <div className="bg-black/50 rounded-lg p-4 mb-4 relative">
                  <pre className="text-xs text-gray-300 font-mono overflow-auto">
                    {step.code}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(step.code, step.id)}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-400 transition"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === step.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Check */}
        <div className="mt-12 bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-400 mb-2">
                ✅ After Completing Both Steps
              </h3>
              <ul className="text-green-300 text-sm space-y-1">
                <li>• Go to: http://localhost:3000/api-test</li>
                <li>• All health checks should show ✅</li>
                <li>• You can login and upload files successfully</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <a
            href="http://localhost:3000/api-test"
            className="bg-sky-500/20 border border-sky-500/40 rounded-lg p-4 hover:bg-sky-500/30 transition text-center"
          >
            <p className="text-sky-300 font-semibold">🧪 Test APIs</p>
            <p className="text-sm text-gray-400">Check all connections</p>
          </a>
          <a
            href="http://localhost:3000/login"
            className="bg-purple-500/20 border border-purple-500/40 rounded-lg p-4 hover:bg-purple-500/30 transition text-center"
          >
            <p className="text-purple-300 font-semibold">📝 Login</p>
            <p className="text-sm text-gray-400">Test authentication</p>
          </a>
        </div>
      </div>
    </div>
  );
}
