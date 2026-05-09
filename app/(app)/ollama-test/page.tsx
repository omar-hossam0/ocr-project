"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Gauge,
  Server,
} from "lucide-react";

type OllamaHealth = {
  success?: boolean;
  ollama_status?: string;
  models_available?: number;
  qwen25_available?: boolean;
  base_url?: string;
  model?: string;
  error?: string;
};

type OllamaGenerate = {
  success?: boolean;
  model?: string;
  response?: string;
  eval_count?: number;
  eval_duration?: number;
  load_duration?: number;
  total_duration?: number;
  error?: string;
  details?: string;
};

const defaultPrompt = "Reply with one short sentence about why GPU acceleration helps LLMs.";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_OLLAMA_API_BASE_URL || "http://localhost:4000";

const formatSeconds = (value?: number) => {
  if (!value) return "0.00s";
  return `${(value / 1e9).toFixed(2)}s`;
};

export default function OllamaTestPage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [health, setHealth] = useState<OllamaHealth | null>(null);
  const [output, setOutput] = useState<OllamaGenerate | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const quickStats = useMemo(() => {
    if (!output) return [];
    return [
      { label: "Model", value: output.model || "qwen2.5:3b" },
      { label: "Load", value: formatSeconds(output.load_duration) },
      { label: "Eval", value: formatSeconds(output.eval_duration) },
      { label: "Tokens", value: String(output.eval_count || 0) },
    ];
  }, [output]);

  const checkHealth = async () => {
    setIsChecking(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/ollama/health`);
      const data = (await response.json()) as OllamaHealth;
      if (!response.ok) {
        throw new Error(data.error || "Failed to check Ollama health");
      }
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
    } finally {
      setIsChecking(false);
    }
  };

  const runGeneration = async () => {
    setIsGenerating(true);
    setError("");
    setOutput(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ollama/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          temperature: 0.4,
          top_p: 0.9,
          top_k: 40,
          num_predict: 80,
        }),
      });

      const data = (await response.json()) as OllamaGenerate;
      if (!response.ok) {
        throw new Error(data.details || data.error || "Generation failed");
      }
      setOutput(data);
      if (!health) {
        await checkHealth();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_35%),linear-gradient(180deg,rgba(9,13,26,0.98),rgba(9,13,26,0.92))] p-6 sm:p-8 shadow-2xl shadow-sky-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              <Bot className="h-3.5 w-3.5" />
              Ollama GPU Test
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Test qwen2.5:3b from the browser
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Send a prompt to the live Ollama backend, inspect response timing,
              and confirm the model is reachable without opening a terminal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Health
            </button>
            <button
              onClick={runGeneration}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </button>
            <button
              onClick={() => setPrompt(defaultPrompt)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              Ready for GPU-backed inference
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Server className="h-4 w-4 text-sky-400" />
              Prompt
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#040814] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
              placeholder="Type your prompt here..."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={runGeneration}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gauge className="h-4 w-4" />
                )}
                Run generation test
              </button>
              <button
                onClick={checkHealth}
                disabled={isChecking}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Check Ollama health
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-300">
                  Health Status
                </div>
                <div className="text-xs text-gray-500">
                  {API_BASE_URL}/api/ollama/health
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-white">
                    {health?.ollama_status || "Not checked"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Model</span>
                  <span className="font-medium text-white">
                    {health?.model || "qwen2.5:3b"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Models found</span>
                  <span className="font-medium text-white">
                    {health?.models_available ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Qwen ready</span>
                  <span className="font-medium text-white">
                    {health?.qwen25_available ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-300">
                  Inference Output
                </div>
                <div className="text-xs text-gray-500">
                  {API_BASE_URL}/api/ollama/generate
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#040814] p-4 text-sm text-gray-300 min-h-[120px] whitespace-pre-wrap leading-6">
                {output?.response || "Run generation to see the model response here."}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                      {stat.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}