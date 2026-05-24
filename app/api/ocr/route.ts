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

const DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".doc"]);

const SUPPORTED_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
]);

const JS_FALLBACK_DEFAULT_LANG = "ara+eng";

// ── Cached tesseract.js worker (created once, reused across requests) ──
type TessWorker = {
  recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
  terminate: () => Promise<unknown>;
};

let _cachedWorker: TessWorker | null = null;
let _workerLang = "";
let _workerCreating: Promise<TessWorker> | null = null;

async function getOrCreateTessWorker(lang: string): Promise<TessWorker> {
  // Return cached worker if same language
  if (_cachedWorker && _workerLang === lang) {
    return _cachedWorker;
  }

  // If another request is already creating the worker, wait for it
  if (_workerCreating) {
    return _workerCreating;
  }

  // Terminate old worker if language changed
  if (_cachedWorker) {
    try {
      await _cachedWorker.terminate();
    } catch {
      /* ignore */
    }
    _cachedWorker = null;
  }

  _workerCreating = (async () => {
    console.log(`🔄 [OCR] Creating tesseract.js worker (lang: ${lang})...`);
    const startMs = Date.now();

    const Tesseract = await import("tesseract.js");

    // Use faster configuration for browser OCR
    const worker = await Tesseract.createWorker(lang, 1, {
      logger: (m: { status: string; progress: number }) => {
        // Only log significant progress to reduce noise
        if (m.progress === 0 || m.progress === 1 || m.progress % 0.2 < 0.01) {
          console.log(
            `🔍 [Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`,
          );
        }
      },
      cachePath: path.join(os.tmpdir(), "tess-data"),
      gzip: false,
      errorHandler: (err: Error) => console.error("❌ [Tesseract Error]", err),
      // Optimize for speed
      corePath: undefined, // Let tesseract.js use default optimized path
    });

    // Optimize OCR parameters for speed
    if (
      typeof (worker as { setParameters?: unknown }).setParameters ===
      "function"
    ) {
      await (
        worker as unknown as {
          setParameters: (p: Record<string, unknown>) => Promise<unknown>;
        }
      ).setParameters({
        tessedit_pageseg_mode: 3, // Fully automatic page segmentation
        tessedit_ocr_engine_mode: 2, // LSTM only (faster)
      });
    }

    _cachedWorker = worker as unknown as TessWorker;
    _workerLang = lang;
    console.log(
      `✅ [OCR] tesseract.js worker ready in ${Date.now() - startMs}ms`,
    );
    return _cachedWorker;
  })();

  try {
    const worker = await _workerCreating;
    return worker;
  } finally {
    _workerCreating = null;
  }
}

function normalizeRemoteEndpoint() {
  const base = (process.env.OCR_SERVICE_URL || "").trim();
  if (!base) return "";

  const endpoint = (process.env.OCR_SERVICE_ENDPOINT || "/ocr").trim();
  const safeBase = base.replace(/\/+$/, "");
  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${safeBase}${safeEndpoint}`;
}

// Local OCR server for fast processing (pre-loaded EasyOCR)
const LOCAL_OCR_SERVER = "http://127.0.0.1:5000";

async function runLocalOcrServer(
  uploaded: File,
  timeoutMs: number,
): Promise<RemoteOcrResult | null> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("file", uploaded, uploaded.name || "upload.bin");

    const response = await fetch(`${LOCAL_OCR_SERVER}/ocr`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
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

    if (!response.ok || !parsed?.success) {
      return {
        ok: false,
        error:
          (parsed?.error as string) ||
          `Local OCR server failed with status ${response.status}`,
        endpoint: LOCAL_OCR_SERVER,
        status: response.status,
        details: parsed || rawText,
      };
    }

    const localText = String(parsed.text || "").trim();

    if (!localText) {
      return {
        ok: false,
        error: `Local OCR server returned no text for ${uploaded.name || "upload"}`,
        endpoint: LOCAL_OCR_SERVER,
        status: response.status,
        details: parsed || rawText,
      };
    }

    // Transform response to match expected format
    const payload = {
      text: localText,
      raw_text: (parsed.raw_text as string) || localText,
      engine: (parsed.engine as string) || "easyocr",
      device: (parsed.device as string) || "cpu",
      pages: [localText],
      format:
        parsed.format ||
        (uploaded.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image"),
      source: (parsed.source as string) || "local_ocr_server",
      transport: "local_ocr_server",
      processing_time_ms: parsed.processing_time_ms,
    };

    return { ok: true, payload, endpoint: LOCAL_OCR_SERVER };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Local OCR server failed";
    return { ok: false, error: errorMessage, endpoint: LOCAL_OCR_SERVER };
  } finally {
    clearTimeout(timeoutHandle);
  }
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

    const remoteText = String(
      (remotePayload && (remotePayload.text as string)) || "",
    ).trim();

    if (!response.ok || !remoteSuccess || !remotePayload || !remoteText) {
      return {
        ok: false,
        error:
          remoteError ||
          `Remote OCR request failed or returned no text with status ${response.status}`,
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

  const startMs = Date.now();
  console.log(
    `🔍 [OCR] Starting tesseract.js (lang: ${tesseractLang}, file: ${uploaded.name})`,
  );

  try {
    const worker = await getOrCreateTessWorker(tesseractLang);
    const arrayBuffer = await uploaded.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("Empty file buffer");
    }
    const imageBytes = Buffer.from(arrayBuffer);

    console.log(
      `🔍 [OCR] Buffer created (${imageBytes.length} bytes), running recognize...`,
    );
    const result = await worker.recognize(imageBytes);
    const text = String(result?.data?.text || "").trim();

    console.log(
      `✅ [OCR] tesseract.js completed in ${Date.now() - startMs}ms (${text.length} chars)`,
    );

    return {
      success: true,
      engine: "tesseract.js",
      device: "cpu",
      text,
      pages: [text],
      transport: "js_fallback",
    };
  } catch (err) {
    console.error(`❌ [OCR] tesseract.js core failure:`, err);
    throw err;
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

  let uploaded = form.get("file");

  if (!uploaded || !(uploaded instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "'file' is required",
      },
      { status: 400 },
    );
  }

  // Check if this is a local file path (from upload fallback)
  const localPath = form.get("localPath") as string;
  if (localPath) {
    try {
      // Read the local file and convert to File object for processing
      const fileBuffer = await fs.readFile(localPath);
      const fileName =
        (form.get("fileName") as string) || path.basename(localPath);
      const file = new File([fileBuffer], fileName, {
        type: (form.get("fileType") as string) || "application/octet-stream",
      });

      // Replace the uploaded file with the local file
      uploaded = file;
    } catch (localError) {
      console.error("Failed to read local file:", localError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to access local file for OCR",
        },
        { status: 500 },
      );
    }
  }

  const fileExt = path.extname(uploaded.name || "").toLowerCase() || ".bin";

  // Validate file type early
  if (!SUPPORTED_EXTENSIONS.has(fileExt)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported file type: ${fileExt}`,
        supported_types: Array.from(SUPPORTED_EXTENSIONS),
        hint: "Supported formats: Images (JPG, PNG, etc.) and Documents (PDF, DOCX, DOC)",
      },
      { status: 400 },
    );
  }

  const defaultTimeoutMs = process.env.VERCEL ? 120000 : 600000; // 2min on Vercel, 10min locally
  const timeoutMs = Number(
    process.env.OCR_PROCESS_TIMEOUT_MS || defaultTimeoutMs,
  );

  const localFallbackEnabled =
    !process.env.VERCEL || process.env.OCR_LOCAL_FALLBACK === "1";
  const jsFallbackEnabled = (process.env.OCR_JS_FALLBACK || "1") !== "0";
  const isImageFile = IMAGE_EXTENSIONS.has(fileExt);
  const isDocumentFile = DOCUMENT_EXTENSIONS.has(fileExt);

  try {
    // ── 0. Local OCR server (fastest - pre-loaded EasyOCR models) ──
    try {
      console.log(`📡 [OCR] Trying local OCR server for ${uploaded.name}...`);
      // Increase timeout for local server, especially for PDFs
      const localTimeout = isDocumentFile
        ? Math.min(timeoutMs, 300000)
        : Math.min(timeoutMs, 60000);
      const localResult = await runLocalOcrServer(uploaded, localTimeout);

      if (localResult?.ok) {
        console.log(
          `✅ [OCR] Local server success: ${shorten(localResult.payload.text as string, 50)}`,
        );
        return NextResponse.json({
          success: true,
          data: {
            ...localResult.payload,
            transport: "local_ocr_server",
          },
          timestamp: new Date().toISOString(),
        });
      } else if (localResult) {
        console.warn(`⚠️ [OCR] Local server failed: ${localResult.error}`);
      }
    } catch (err) {
      console.log(
        "Local OCR server not available or error, trying other methods...",
        err,
      );
      // Continue to other methods
    }

    // ── 1. For IMAGE files on Vercel: try tesseract.js FIRST (reliable in serverless) ──
    // Documents (PDF, DOCX, DOC) should go directly to Python script
    if (isImageFile && jsFallbackEnabled) {
      try {
        const jsPayload = await runJsOcrFallback(uploaded, fileExt);
        if (jsPayload && jsPayload.text) {
          return NextResponse.json({
            success: true,
            data: {
              ...jsPayload,
              transport: "tesseract_js_vercel",
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          console.warn("⚠️ [OCR] tesseract.js returned empty text");
        }
      } catch (jsError: unknown) {
        console.error("❌ [OCR] tesseract.js failed on Vercel:", jsError);
        // Fall through to remote/local if possible
      }
    }

    // ── 2. Remote OCR service (highest priority if configured and not on Vercel) ──
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

    // ── 2. For IMAGE files: try tesseract.js FIRST if remote fails ──
    // Documents should always go to Python script for proper processing
    if (isImageFile && jsFallbackEnabled && !isDocumentFile) {
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
        const jsErrMsg =
          jsError instanceof Error ? jsError.message : "JS OCR failed";
        console.warn(
          "⚠️ tesseract.js failed, will try Python fallback:",
          jsErrMsg,
        );
        // Continue to Python fallback below
      }
    }

    // ── 3. Python easyocr fallback (handles PDFs + images) ──
    if (localFallbackEnabled) {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-"));
      const tempFilePath = path.join(tempDir, `input${fileExt}`);

      try {
        const bytes = Buffer.from(await uploaded.arrayBuffer());
        await fs.writeFile(tempFilePath, bytes);

        const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
        if (!existsSync(scriptPath)) {
          // If no Python script and it's an image, we already tried JS above
          if (!isImageFile || !jsFallbackEnabled) {
            return NextResponse.json(
              {
                success: false,
                error: `OCR script not found at ${scriptPath}`,
              },
              { status: 500 },
            );
          }
        } else {
          const candidates = resolvePythonCandidates();
          const attempts: Array<{
            command: string;
            code: number | null;
            timedOut: boolean;
            spawnError?: string;
            stderr: string;
            payloadError?: string;
          }> = [];

          // Increase timeout for large PDF files (Arabic PDFs especially)
          let adjustedTimeoutMs = timeoutMs;
          const fileSize = bytes.length / (1024 * 1024); // MB
          if (isDocumentFile) {
            // For PDFs, add more time based on file size
            const extraMs = Math.min(fileSize * 5000, 240000); // ~5s per MB, max 4min extra
            adjustedTimeoutMs = Math.max(timeoutMs, 180000 + extraMs); // Min 3min for PDFs
            console.log(
              `📄 [OCR] PDF file: ${fileSize.toFixed(1)}MB, timeout: ${adjustedTimeoutMs / 1000}s`,
            );
          }

          for (const candidate of candidates) {
            const result = await runPythonOcr(
              candidate,
              scriptPath,
              tempFilePath,
              adjustedTimeoutMs,
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

          // Python failed — build informative error
          const firstUsefulAttempt = attempts.find((item) =>
            Boolean(item.payloadError || item.stderr || item.spawnError),
          );
          const rawError =
            firstUsefulAttempt?.payloadError ||
            firstUsefulAttempt?.stderr ||
            firstUsefulAttempt?.spawnError ||
            "OCR failed";

          const missingModuleMatch = rawError.match(
            /No module named ['"]([^'"]+)['"]/,
          );
          const isPythonMissing = attempts.every(
            (item) =>
              (item.spawnError || "").includes("ENOENT") ||
              (item.stderr || "").includes("not recognized") ||
              (item.stderr || "").includes("No such file or directory"),
          );

          let errorMessage = `OCR failed: ${rawError}`;
          if (isPythonMissing) {
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
              hint: "Install easyocr, opencv-python-headless, pypdfium2, torch in .venv.",
              timestamp: new Date().toISOString(),
            },
            { status: 500 },
          );
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }

    // ── 4. Nothing worked ──
    const errorDetail =
      remoteResult && !remoteResult.ok ? `Remote: ${remoteResult.error}. ` : "";

    return NextResponse.json(
      {
        success: false,
        error: `${errorDetail}No OCR engine available for this file type (${fileExt}).`,
        hint: "For images, tesseract.js is used. For PDFs, Python easyocr is required. Set OCR_SERVICE_URL for a remote OCR service.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
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
