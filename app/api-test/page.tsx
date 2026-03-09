"use client";
import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Code,
} from "lucide-react";

export default function APITestPage() {
  const [tests, setTests] = useState<
    {
      name: string;
      endpoint: string;
      status: "idle" | "loading" | "success" | "error";
      data: Record<string, unknown> | null;
      error: string;
    }[]
  >([
    {
      name: "Health Check",
      endpoint: "/api/health",
      status: "idle",
      data: null,
      error: "",
    },
    {
      name: "Fetch All Files",
      endpoint: "/api/files",
      status: "idle",
      data: null,
      error: "",
    },
    {
      name: "Daily Statistics",
      endpoint: "/api/stats?type=daily",
      status: "idle",
      data: null,
      error: "",
    },
    {
      name: "All-Time Statistics",
      endpoint: "/api/stats?type=all-time",
      status: "idle",
      data: null,
      error: "",
    },
  ]);

  const runTest = async (index: number) => {
    setTests((prev) => {
      const updated = [...prev];
      updated[index].status = "loading";
      return updated;
    });

    try {
      const response = await fetch(tests[index].endpoint);
      const data = await response.json();

      setTests((prev) => {
        const updated = [...prev];
        updated[index].status = response.ok ? "success" : "error";
        updated[index].data = data;
        updated[index].error = response.ok ? "" : data.error || "Unknown error";
        return updated;
      });
    } catch (error: unknown) {
      setTests((prev) => {
        const updated = [...prev];
        updated[index].status = "error";
        updated[index].error =
          error instanceof Error ? error.message : "Request failed";
        return updated;
      });
    }
  };

  const runAllTests = async () => {
    for (let i = 0; i < tests.length; i++) {
      await runTest(i);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  useEffect(() => {
    runAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🧪 Firebase API Test Suite
          </h1>
          <p className="text-gray-400">Test all backend connections and APIs</p>
          <button
            onClick={runAllTests}
            className="mt-4 flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Run All Tests
          </button>
        </div>

        {/* Test Results Grid */}
        <div className="space-y-4">
          {tests.map((test, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              {/* Test Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {test.status === "loading" && (
                    <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                  )}
                  {test.status === "success" && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  {test.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  {test.status === "idle" && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">{test.name}</h3>
                    <code className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                      <Code className="w-3 h-3" />
                      GET {test.endpoint}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => runTest(idx)}
                  disabled={test.status === "loading"}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-300 disabled:opacity-50 transition"
                >
                  {test.status === "loading" ? "Testing..." : "Test"}
                </button>
              </div>

              {/* Status Message */}
              {test.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-sm text-green-400 mb-3">
                  ✅ Request successful
                </div>
              )}

              {test.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm text-red-400 mb-3">
                  ❌ {test.error}
                </div>
              )}

              {/* Response Data */}
              {test.data && test.status === "success" && (
                <div className="bg-black/30 rounded p-4 overflow-auto max-h-60">
                  <pre className="text-xs text-gray-300 font-mono">
                    {JSON.stringify(test.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Documentation */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            📚 API Endpoints
          </h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <code className="text-sky-400">GET /api/health</code>
              <p className="text-gray-400 ml-4">
                Check Firebase connection status
              </p>
            </div>
            <div>
              <code className="text-sky-400">GET /api/files</code>
              <p className="text-gray-400 ml-4">
                Fetch all files from database
              </p>
            </div>
            <div>
              <code className="text-sky-400">GET /api/stats?type=daily</code>
              <p className="text-gray-400 ml-4">Get daily statistics</p>
            </div>
            <div>
              <code className="text-sky-400">GET /api/stats?type=all-time</code>
              <p className="text-gray-400 ml-4">Get all-time statistics</p>
            </div>
            <div>
              <code className="text-sky-400">GET /api/search?q=keyword</code>
              <p className="text-gray-400 ml-4">Search files by keyword</p>
            </div>
            <div>
              <code className="text-sky-400">
                GET /api/search?department=Legal
              </code>
              <p className="text-gray-400 ml-4">Get files by department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
