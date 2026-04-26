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
        error: "Failed to parse form data. Make sure request body is valid multipart form data.",
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
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-upload-"));
  const tempFilePath = path.join(tempDir, `input${fileExt}`);
  const timeoutMs = Number(process.env.OCR_PROCESS_TIMEOUT_MS || 300000);

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

    const firstUsefulAttempt = attempts.find(
      (item) => Boolean(item.payloadError || item.stderr || item.spawnError),
    );
    const rawError =
      firstUsefulAttempt?.payloadError ||
      firstUsefulAttempt?.stderr ||
      firstUsefulAttempt?.spawnError ||
      "OCR failed";

    const missingModuleMatch = rawError.match(/No module named ['\"]([^'\"]+)['\"]/);
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

    return NextResponse.json({
      success: false,
      error: errorMessage,
      attempts,
      hint: "If you deploy on Linux, use .venv/bin/python or set OCR_PYTHON_PATH. Install easyocr, opencv-python-headless, pypdfium2, torch.",
      timestamp: new Date().toISOString(),
    },
    {
      status: 500,
    });
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
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
