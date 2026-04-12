import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolvePythonCommand() {
  if (process.env.OCR_PYTHON_PATH) {
    return process.env.OCR_PYTHON_PATH;
  }

  const localVenvPython = path.join(
    process.cwd(),
    ".venv",
    "Scripts",
    "python.exe",
  );
  return localVenvPython;
}

function runPythonOcr(
  pythonPath: string,
  scriptPath: string,
  filePath: string,
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn(pythonPath, [scriptPath, filePath], {
        cwd: process.cwd(),
        shell: false,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on("error", (error) => {
        stderr += error.message;
        resolve({ code: 1, stdout, stderr });
      });
    },
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
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

  try {
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    await fs.writeFile(tempFilePath, bytes);

    const pythonPath = resolvePythonCommand();
    const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
    const result = await runPythonOcr(pythonPath, scriptPath, tempFilePath);

    if (!result.stdout.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "OCR process produced no output",
          stderr: result.stderr,
        },
        { status: 500 },
      );
    }

    let payload: Record<string, unknown> | null = null;
    const lines = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        payload = JSON.parse(lines[i]) as Record<string, unknown>;
        break;
      } catch {
        // Keep scanning backward until we find a valid JSON payload.
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "OCR output was not valid JSON",
          stdout: result.stdout,
          stderr: result.stderr,
        },
        { status: 500 },
      );
    }

    if (result.code !== 0 || payload.error) {
      return NextResponse.json(
        {
          success: false,
          error: payload.error || "OCR processing failed",
          stderr: result.stderr,
          code: result.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: payload,
      timestamp: new Date().toISOString(),
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
