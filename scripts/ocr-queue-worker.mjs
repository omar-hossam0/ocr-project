import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const logFilePath = path.join(process.cwd(), "ocr-worker.log");

async function logLine(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    await fs.appendFile(logFilePath, line, "utf8");
  } catch {
    // ignore log write errors
  }
}

function resolvePythonCandidates() {
  const candidates = [
    process.env.OCR_PYTHON_PATH,
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python",
  ].filter((item) => Boolean(item && String(item).trim()));

  return [...new Set(candidates)];
}

function extensionFrom(fileType = "") {
  if (fileType.includes("pdf")) return ".pdf";
  if (fileType.includes("png")) return ".png";
  if (fileType.includes("jpeg") || fileType.includes("jpg")) return ".jpg";
  if (fileType.includes("bmp")) return ".bmp";
  if (fileType.includes("tiff") || fileType.includes("tif")) return ".tiff";
  if (fileType.includes("webp")) return ".webp";
  return ".bin";
}

function parseLastJsonLine(stdout) {
  const lines = String(stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // continue
    }
  }
  return null;
}

function runPythonOcr(pythonPath, scriptPath, filePath, timeoutMs = 300000) {
  return new Promise((resolve) => {
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

function resolveTimeoutMs(defaultValue) {
  const raw = String(process.env.OCR_PROCESS_TIMEOUT_MS || "").trim();
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return defaultValue;
}

async function downloadToFile(url, destPath, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Could not download storage file (${response.status})`);
    }

    if (!response.body) {
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(destPath, bytes);
      return;
    }

    const nodeStream = Readable.fromWeb(response.body);
    const handle = await fs.open(destPath, "w");
    try {
      await pipeline(nodeStream, handle.createWriteStream());
    } finally {
      await handle.close();
    }
  } finally {
    clearTimeout(timer);
  }
}

async function patchFile(baseUrl, fileId, updates) {
  await fetch(`${baseUrl}/api/files/${fileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
}

async function main() {
  const [, , fileId, storageUrl, fileType] = process.argv;
  const baseUrl = process.env.OCR_APP_BASE_URL || "http://localhost:3000";

  await logLine(
    `worker-start fileId=${fileId || ""} fileType=${fileType || ""}`,
  );

  if (!fileId || !storageUrl) {
    await logLine("worker-exit missing fileId/storageUrl");
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ocr-bg-"));
  const tempFilePath = path.join(
    tempDir,
    `input${extensionFrom(fileType || "")}`,
  );

  const downloadTimeoutMs = resolveTimeoutMs(180000);
  const ocrTimeoutMs = resolveTimeoutMs(300000);

  try {
    await logLine(`download-start fileId=${fileId}`);
    await downloadToFile(storageUrl, tempFilePath, downloadTimeoutMs);
    await logLine(`download-ok fileId=${fileId} path=${tempFilePath}`);

    const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
    const attempts = [];
    let payload = null;
    let run = null;

    for (const pythonPath of resolvePythonCandidates()) {
      const attempt = await runPythonOcr(
        pythonPath,
        scriptPath,
        tempFilePath,
        ocrTimeoutMs,
      );
      attempts.push(attempt);

      const maybePayload = parseLastJsonLine(attempt.stdout);
      if (attempt.code === 0 && maybePayload && !maybePayload.error) {
        payload = maybePayload;
        run = attempt;
        break;
      }
    }

    if (!payload || !run) {
      const bestAttempt = attempts.find(
        (item) =>
          Boolean(item.stderr) ||
          Boolean(item.spawnError) ||
          Boolean(parseLastJsonLine(item.stdout)?.error),
      );

      const bestPayload = bestAttempt
        ? parseLastJsonLine(bestAttempt.stdout)
        : null;
      const reason =
        bestPayload?.error ||
        bestAttempt?.stderr ||
        bestAttempt?.spawnError ||
        "OCR failed";

      await patchFile(baseUrl, fileId, {
        status: "failed",
        notes: `OCR failed: ${reason}`,
      });
      await logLine(
        `patch-failed-status fileId=${fileId} reason=${String(reason).slice(0, 120)}`,
      );
      return;
    }

    await logLine(
      `python-exit fileId=${fileId} code=${run.code} command=${run.command} timedOut=${run.timedOut}`,
    );

    const extractedText = String(payload.text || "").trim();
    const engine = String(payload.engine || "easyocr").trim();
    const device = String(payload.device || "cpu").trim();

    await patchFile(baseUrl, fileId, {
      status: "available",
      ocrText: extractedText,
      notes: `OCR complete (${engine} • ${device})`,
    });
    await logLine(
      `patch-available fileId=${fileId} textLen=${extractedText.length}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected OCR worker error";
    await patchFile(baseUrl, fileId, {
      status: "failed",
      notes: `OCR failed: ${message}`,
    });
    await logLine(
      `worker-error fileId=${fileId} message=${String(message).slice(0, 200)}`,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await logLine(`worker-end fileId=${fileId}`);
  }
}

main().catch(() => {
  process.exit(0);
});
