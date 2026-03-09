"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";

export default function FirestoreCheckPage() {
  const [status, setStatus] = useState<{
    firestoreExists: boolean;
    canRead: boolean;
    canWrite: boolean;
    error?: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkFirestore = async () => {
    setLoading(true);
    try {
      // Try to read from Firestore
      const response = await fetch("/api/firestore-check", {
        method: "GET",
      });
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setStatus({
        firestoreExists: false,
        canRead: false,
        canWrite: false,
        error: err instanceof Error ? err.message : String(err),
        message: "❌ Failed to check Firestore",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFirestore();
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🔍 Firestore Status Check
          </h1>
          <p className="text-gray-400">
            Check if Firestore database is properly configured
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="ml-2 text-gray-300">Checking Firestore...</span>
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="space-y-4">
                {/* Firestore Exists */}
                <div className="flex items-start gap-3">
                  {status.firestoreExists ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      Firestore Database
                    </h3>
                    <p
                      className={`text-sm mt-1 ${status.firestoreExists ? "text-green-400" : "text-red-400"}`}
                    >
                      {status.firestoreExists
                        ? "✅ Database exists and is accessible"
                        : "❌ Database not found or not created"}
                    </p>
                  </div>
                </div>

                {/* Can Read */}
                <div className="flex items-start gap-3">
                  {status.canRead ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      Read Permission
                    </h3>
                    <p
                      className={`text-sm mt-1 ${status.canRead ? "text-green-400" : "text-red-400"}`}
                    >
                      {status.canRead
                        ? "✅ Can read from Firestore"
                        : "❌ Cannot read from Firestore (check Security Rules)"}
                    </p>
                  </div>
                </div>

                {/* Can Write */}
                <div className="flex items-start gap-3">
                  {status.canWrite ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      Write Permission
                    </h3>
                    <p
                      className={`text-sm mt-1 ${status.canWrite ? "text-green-400" : "text-red-400"}`}
                    >
                      {status.canWrite
                        ? "✅ Can write to Firestore"
                        : "❌ Cannot write to Firestore (check Security Rules)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            <div
              className={`rounded-xl p-4 border ${
                status.firestoreExists && status.canRead && status.canWrite
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <p
                className={`${
                  status.firestoreExists && status.canRead && status.canWrite
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {status.message}
              </p>
              {status.error && (
                <p className="text-red-300 text-sm mt-2">
                  Error details: {status.error}
                </p>
              )}
            </div>

            {/* Fix Instructions */}
            {!status.firestoreExists || !status.canRead || !status.canWrite ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-300 mb-3">
                  📋 How to Fix This:
                </h3>
                <ol className="text-yellow-200 text-sm space-y-2">
                  <li>
                    1. Go to:{" "}
                    <a
                      href="http://localhost:3000/firebase-setup"
                      className="underline hover:text-yellow-300"
                    >
                      Firebase Setup Guide
                    </a>
                  </li>
                  <li>
                    2. Complete ALL steps (create database + update security
                    rules)
                  </li>
                  <li>3. Wait 1-2 minutes for changes to take effect</li>
                  <li>
                    4. Refresh this page to verify the fix{" "}
                    <button
                      onClick={checkFirestore}
                      className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded transition"
                    >
                      Check Now
                    </button>
                  </li>
                </ol>
              </div>
            ) : null}

            {/* Quick Check Button */}
            <button
              onClick={checkFirestore}
              className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-3 rounded-lg transition font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Check Again
            </button>
          </div>
        ) : (
          <div className="text-red-400">Failed to check Firestore status</div>
        )}
      </div>
    </div>
  );
}
