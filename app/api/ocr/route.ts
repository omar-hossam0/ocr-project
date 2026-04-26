import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PythonRunResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  command: string;
  timedOut: boolean;
  spawnError?: string;
};

type RemoteOcrResult =
  | { ok: true; payload: Record<string, unknown>; endpoint: string }
  | {
      ok: false;
      error: string;
      endpoint: string;
      status?: number;
      details?: unknown;
    };

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".bmp",
  ".tif",
  ".tiff",
  ".webp",
]);

const JS_FALLBACK_DEFAULT_LANG = "eng+ara";

function normalizeRemoteEndpoint() {
  const base = (process.env.OCR_SERVICE_URL || "").trim();
  if (!base) return "";

  const endpoint = (process.env.OCR_SERVICE_ENDPOINT || "/ocr").trim();
  const safeBase = base.replace(/\/+$/, "");
  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${safeBase}${safeEndpoint}`;
}

async function runRemoteOcr(
  uploaded: File,
  timeoutMs: number,
): Promise<RemoteOcrResult | null> {
  const endpoint = normalizeRemoteEndpoint();
  if (!endpoint) return null;

  const formData = new FormData();
  formData.append("file", uploaded, uploaded.name || "upload.bin");

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      cache: "no-store",
    });

    const rawText = await response.text();
    let parsed: Record<string, unknown> | null = null;

    try {
      parsed = rawText
        ? (JSON.parse(rawText) as Record<string, unknown>)
        : null;
    } catch {
      parsed = null;
    }

    const remoteSuccess = Boolean(parsed?.success);
    const parsedDetail =
      parsed && parsed.detail && typeof parsed.detail === "object"
        ? (parsed.detail as Record<string, unknown>)
        : null;
    const remoteError =
      (parsed?.error as string) || (parsedDetail?.error as string) || "";
    const remotePayload =
      parsed && parsed.data && typeof parsed.data === "object"
        ? (parsed.data as Record<string, unknown>)
        : parsed;

    if (!response.ok || !remoteSuccess || !remotePayload) {
      return {
        ok: false,
        error:
          remoteError ||
          `Remote OCR request failed with status ${response.status}`,
        endpoint,
        status: response.status,
        details: parsed || rawText,
      };
    }

    return {
      ok: true,
      payload: remotePayload,
      endpoint,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Remote OCR call failed";
    return {
      ok: false,
      error: errorMessage,
      endpoint,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function resolvePythonCandidates() {
  const candidates = [
    process.env.OCR_PYTHON_PATH,
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python",
  ].filter((item): item is string => Boolean(item && item.trim()));

  return [...new Set(candidates)];
}

function runPythonOcr(
  pythonPath: string,
  scriptPath: string,
  filePath: string,
  timeoutMs: number,
) {
  return new Promise<PythonRunResult>((resolve) => {
    let timedOut = false;
    let spawnError = "";
    const child = spawn(pythonPath, [scriptPath, filePath], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        code,
        stdout,
        stderr,
        command: pythonPath,
        timedOut,
        spawnError: spawnError || undefined,
      });
    });

    child.on("error", (error) => {
      spawnError = error.message;
      stderr += error.message;
    });
  });
}

function parseLastJsonLine(stdout: string): Record<string, unknown> | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]) as Record<string, unknown>;
    } catch {
      // Keep scanning backward until we find a valid JSON payload.
    }
  }

  return null;
}

function shorten(text: string, max = 700) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function runJsOcrFallback(uploaded: File, fileExt: string) {
  if (!IMAGE_EXTENSIONS.has(fileExt)) {
    return null;
  }

  const tesseractLang =
    (process.env.OCR_JS_LANGS || JS_FALLBACK_DEFAULT_LANG).trim() ||
    JS_FALLBACK_DEFAULT_LANG;

  let worker: {
    recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
    terminate: () => Promise<unknown>;
  } | null = null;

  try {
    const tesseract = (await import("tesseract.js")) as {
      createWorker: (langs?: string) => Promise<{
        recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
        terminate: () => Promise<unknown>;
      }>;
    };

    worker = await tesseract.createWorker(tesseractLang);
    const imageBytes = Buffer.from(await uploaded.arrayBuffer());
    const result = await worker.recognize(imageBytes);
    const text = String(result?.data?.text || "").trim();

    return {
      success: true,
      engine: "tesseract.js",
      device: "cpu",
      text,
      pages: [text],
      transport: "js_fallback",
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.includes("multipart/form-data") &&
    !contentType.includes("application/x-www-form-urlencoded")
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid Content-Type. Use multipart/form-data and include a 'file' field.",
      },
      { status: 415 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to parse form data. Make sure request body is valid multipart form data.",
      },
      { status: 400 },
    );
  }

  const uploaded = form.get("file");

  if (!uploaded || !(uploaded instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "'file' is required",
      },
      { status: 400 },
    );
  }

  const fileExt = path.extname(uploaded.name || "").toLowerCase() || ".bin";
  const timeoutMs = Number(process.env.OCR_PROCESS_TIMEOUT_MS || 300000);
  const remoteEndpoint = normalizeRemoteEndpoint();
  const localFallbackDefault = process.env.VERCEL ? "0" : "1";
  const localFallbackEnabled =
    (process.env.OCR_LOCAL_FALLBACK || localFallbackDefault).trim() !== "0";
  const jsFallbackEnabled = (process.env.OCR_JS_FALLBACK || "1").trim() !== "0";

  try {
    if (!remoteEndpoint && !localFallbackEnabled) {
      if (jsFallbackEnabled) {
        try {
          const jsPayload = await runJsOcrFallback(uploaded, fileExt);
          if (jsPayload) {
            return NextResponse.json({
              success: true,
              data: jsPayload,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (jsError: unknown) {
          const errorMessage =
            jsError instanceof Error
              ? jsError.message
              : "JS OCR fallback failed";
          return NextResponse.json(
            {
              success: false,
              error: `OCR JS fallback failed: ${errorMessage}`,
              hint: "Set OCR_SERVICE_URL for AWS OCR service, or upload an image file supported by JS fallback.",
              timestamp: new Date().toISOString(),
            },
            { status: 503 },
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "OCR service is not configured in this deployment. Set OCR_SERVICE_URL (and optional OCR_SERVICE_ENDPOINT) in environment variables.",
          hint: "For Vercel production, keep OCR_LOCAL_FALLBACK=0 and route OCR to your AWS OCR service.",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    const remoteResult = await runRemoteOcr(uploaded, timeoutMs);
    if (remoteResult?.ok) {
      return NextResponse.json({
        success: true,
        data: {
          ...remoteResult.payload,
          transport: "remote_ocr_service",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (remoteResult && !localFallbackEnabled) {
      if (jsFallbackEnabled) {
        try {
          const jsPayload = await runJsOcrFallback(uploaded, fileExt);
          if (jsPayload) {
            return NextResponse.json({
              success: true,
              data: jsPayload,
              timestamp: new Date().toISOString(),
            });
          }
        } catch {
          // Keep remote failure response below when JS fallback also fails.
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: `Remote OCR failed: ${remoteResult.error}`,
          endpoint: remoteResult.endpoint,
          details: remoteResult.details,
          hint: "Set OCR_SERVICE_URL to a reachable OCR service or enable OCR_LOCAL_FALLBACK=1.",
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      );
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-"));
    const tempFilePath = path.join(tempDir, `input${fileExt}`);

    try {
      const bytes = Buffer.from(await uploaded.arrayBuffer());
      await fs.writeFile(tempFilePath, bytes);

      const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
      if (!existsSync(scriptPath)) {
        return NextResponse.json(
          {
            success: false,
            error: `OCR script not found at ${scriptPath}`,
          },
          { status: 500 },
        );
      }

      const candidates = resolvePythonCandidates();
      const attempts: Array<{
        command: string;
        code: number | null;
        timedOut: boolean;
        spawnError?: string;
        stderr: string;
        payloadError?: string;
      }> = [];

      for (const candidate of candidates) {
        const result = await runPythonOcr(
          candidate,
          scriptPath,
          tempFilePath,
          timeoutMs,
        );

        const payload = parseLastJsonLine(result.stdout);
        const payloadError =
          payload && typeof payload.error === "string" ? payload.error : "";

        attempts.push({
          command: result.command,
          code: result.code,
          timedOut: result.timedOut,
          spawnError: result.spawnError,
          stderr: shorten(result.stderr),
          payloadError: payloadError || undefined,
        });

        if (result.code === 0 && payload && !payload.error) {
          return NextResponse.json({
            success: true,
            data: payload,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const firstUsefulAttempt = attempts.find((item) =>
        Boolean(item.payloadError || item.stderr || item.spawnError),
      );
      const rawError =
        firstUsefulAttempt?.payloadError ||
        firstUsefulAttempt?.stderr ||
        firstUsefulAttempt?.spawnError ||
        "OCR failed";

      const missingModuleMatch = rawError.match(
        /No module named ['\"]([^'\"]+)['\"]/,
      );
      const isPythonMissing = attempts.every(
        (item) =>
          (item.spawnError || "").includes("ENOENT") ||
          (item.stderr || "").includes("not recognized") ||
          (item.stderr || "").includes("No such file or directory"),
      );

      let errorMessage = `OCR failed: ${rawError}`;
      if (isPythonMissing) {
        if (jsFallbackEnabled) {
          try {
            const jsPayload = await runJsOcrFallback(uploaded, fileExt);
            if (jsPayload) {
              return NextResponse.json({
                success: true,
                data: jsPayload,
                timestamp: new Date().toISOString(),
              });
            }
          } catch {
            // Keep original python-missing response below.
          }
        }

        errorMessage =
          "Python executable not found. Set OCR_PYTHON_PATH or install Python in the server runtime.";
      } else if (missingModuleMatch?.[1]) {
        errorMessage = `Missing Python package '${missingModuleMatch[1]}'. Install OCR dependencies in the deployment environment.`;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          remoteOcr:
            remoteResult && !remoteResult.ok
              ? {
                  endpoint: remoteResult.endpoint,
                  error: remoteResult.error,
                }
              : undefined,
          attempts,
          hint: "If you deploy on Linux, use .venv/bin/python or set OCR_PYTHON_PATH. Install easyocr, opencv-python-headless, pypdfium2, torch.",
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
        },
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unexpected OCR API error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
