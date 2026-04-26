import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

function resolvePythonPath() {
  const candidates = [
    process.env.OCR_PYTHON_PATH,
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python",
  ].filter((item) => Boolean(item && String(item).trim()));

  for (const candidate of candidates) {
    if (!candidate.includes(path.sep) && !candidate.includes("/")) {
      return candidate;
    }
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "python";
}

function run() {
  const pythonPath = resolvePythonPath();
  const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
  console.log("Warming OCR model (first run may take several minutes)...");

  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath, "--warmup"], {
      cwd: process.cwd(),
      shell: false,
      stdio: "pipe",
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
      if (code === 0) {
        console.log("OCR warmup complete");
        if (stdout.trim()) {
          console.log(stdout.trim());
        }
        resolve();
        return;
      }

      reject(
        new Error(`OCR warmup failed with code ${code}. ${stderr || stdout}`),
      );
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

run().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
