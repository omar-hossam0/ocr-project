import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

function resolvePythonPath() {
  if (process.env.OCR_PYTHON_PATH) {
    return process.env.OCR_PYTHON_PATH;
  }

  const venvPython = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (existsSync(venvPython)) {
    return venvPython;
  }

  return "python";
}

const pythonPath = resolvePythonPath();
const cameraScriptPath = path.join(process.cwd(), "camera_ocr_to_pdf.py");

console.log("Starting Camera OCR service...");

const child = spawn(pythonPath, [cameraScriptPath], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
  windowsHide: false,
  env: {
    ...process.env,
    OCR_INPUT_MODE: "camera",
  },
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Camera OCR failed: ${error.message}`);
  process.exit(1);
});
