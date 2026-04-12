import { spawn } from "node:child_process";

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    windowsHide: false,
    ...options,
  });
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
}

async function main() {
  const warmupEnabled = process.env.OCR_WARMUP === "1";

  if (warmupEnabled) {
    console.log("1) Warming OCR model...");
    const warmup = run(npmCommand(), ["run", "ocr:warmup"]);
    const warmupCode = await waitForExit(warmup);

    if (warmupCode !== 0) {
      console.warn(
        "OCR warmup failed; continuing to start web + camera OCR...",
      );
    }
  } else {
    console.log(
      "1) Skipping warmup for faster startup (set OCR_WARMUP=1 to enable)...",
    );
  }

  console.log("2) Starting web + camera OCR in parallel...");

  const web = run(npmCommand(), ["run", "dev:web"]);
  const camera = run(npmCommand(), ["run", "dev:camera"]);

  const shutdown = () => {
    web.kill("SIGTERM");
    camera.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const [webCode, cameraCode] = await Promise.all([
    waitForExit(web),
    waitForExit(camera),
  ]);

  process.exit(webCode || cameraCode || 0);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
