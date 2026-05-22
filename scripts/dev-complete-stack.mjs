#!/usr/bin/env node
/**
 * Complete Full Stack Development Server
 * Frontend + Backend + OCR Model Server (with GPU verification)
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const pythonExe = join(rootDir, ".venv", "Scripts", "python.exe");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(70));
  log(`  ${title}`, "bright");
  console.log("=".repeat(70) + "\n");
}

// Check GPU Status
async function checkGPUStatus() {
  logSection("🔍 GPU Status Check");

  return new Promise((resolve) => {
    const pythonScript = `
import torch
gpu_available = torch.cuda.is_available()
print(f"GPU_AVAILABLE:{gpu_available}")
if gpu_available:
    print(f"GPU_NAME:{torch.cuda.get_device_name(0)}")
    print(f"GPU_MEMORY:{torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}")
`;

    const proc = spawn(pythonExe, ["-c", pythonScript], {
      cwd: rootDir,
      stdio: "pipe",
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });

    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", () => {
      const lines = output.split("\n");
      const gpuLine = lines.find((l) => l.startsWith("GPU_AVAILABLE:"));
      const nameLine = lines.find((l) => l.startsWith("GPU_NAME:"));
      const memLine = lines.find((l) => l.startsWith("GPU_MEMORY:"));

      if (gpuLine && gpuLine.includes("True")) {
        log("✅ GPU Available: YES", "green");
        if (nameLine) log(`   Device: ${nameLine.split(":")[1]}`, "green");
        if (memLine) log(`   Memory: ${memLine.split(":")[1]} GB`, "green");
        resolve(true);
      } else {
        log("⚠️  GPU Available: NO (Using CPU)", "yellow");
        log("   PyTorch will use CPU for OCR processing", "yellow");
        log("   Performance will be slower but functional", "yellow");
        resolve(false);
      }
    });
  });
}

// Check MongoDB
function checkMongoDBConfig() {
  logSection("🔍 MongoDB Configuration");

  const backendEnvPath = join(rootDir, "backend", ".env");

  if (!fs.existsSync(backendEnvPath)) {
    log("⚠️  backend/.env not found", "yellow");
    log("   Some features may not work", "yellow");
    return false;
  }

  const envContent = fs.readFileSync(backendEnvPath, "utf-8");
  const hasMongoUri =
    envContent.includes("MONGODB_URI=") &&
    !envContent.includes("MONGODB_URI=mongodb+srv://USER:PASSWORD");

  if (hasMongoUri) {
    log("✅ MongoDB configured", "green");
    return true;
  } else {
    log("⚠️  MongoDB URI not configured", "yellow");
    return false;
  }
}

// Health check
async function waitForService(name, url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        log(`✅ ${name} is ready!`, "green");
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.stdout.write(".");
  }

  log(`\n❌ ${name} failed to start`, "red");
  return false;
}

async function isServiceHealthy(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function isPortInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onDone = (isInUse) => {
      socket.destroy();
      resolve(isInUse);
    };

    socket.setTimeout(500);
    socket.once("connect", () => onDone(true));
    socket.once("timeout", () => onDone(false));
    socket.once("error", () => onDone(false));

    socket.connect(port, host);
  });
}

// Start process
function startProcess(name, command, args, cwd, color) {
  log(`🚀 Starting ${name}...`, color);

  const proc = spawn(command, args, {
    cwd: cwd || rootDir,
    shell: true,
    stdio: "pipe",
    env: {
      ...process.env,
      FORCE_COLOR: "1",
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    },
  });

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${colors[color]}[${name}]${colors.reset} ${line}`);
      }
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${colors.red}[${name} ERROR]${colors.reset} ${line}`);
      }
    });
  });

  return proc;
}

// Main
async function main() {
  logSection("🚀 COMPLETE FULL STACK DEVELOPMENT");

  // Check GPU
  const gpuAvailable = await checkGPUStatus();

  // Check MongoDB
  checkMongoDBConfig();

  logSection("📋 Starting Services");

  // Start Backend
  const backendHealthUrl = "http://localhost:4000/api/health";
  let backendProc = null;

  const backendPortInUse = await isPortInUse(4000);
  if (backendPortInUse) {
    const backendHealthy = await isServiceHealthy(backendHealthUrl);
    if (backendHealthy) {
      log(
        "⚠️  Backend already running on port 4000; reusing existing process",
        "yellow",
      );
    } else {
      log("❌ Port 4000 is already in use by another process.", "red");
      log("   Stop it or set PORT before starting the backend.", "red");
      process.exit(1);
    }
  } else {
    backendProc = startProcess(
      "Backend",
      "npm",
      ["run", "dev"],
      join(rootDir, "backend"),
      "magenta",
    );

    const backendReady = await waitForService("Backend API", backendHealthUrl);
    if (!backendReady) {
      log("❌ Backend failed to start. Port 4000 may be in use.", "red");
      process.exit(1);
    }
  }

  // Start OCR Model Server
  log("\n🤖 Starting OCR Model Server...", "blue");

  const ocrProc = startProcess(
    "OCR Model",
    pythonExe,
    [join(rootDir, "scripts", "ocr_model_server.py")],
    rootDir,
    "blue",
  );

  await waitForService("OCR Model Server", "http://localhost:5000/health", 30);

  // Start Frontend after OCR is confirmed ready
  const frontendProc = startProcess(
    "Frontend",
    "npm",
    ["run", "dev:web"],
    rootDir,
    "cyan",
  );

  await waitForService("Frontend", "http://localhost:3000");

  // Success
  logSection("✅ ALL SERVICES RUNNING!");

  log("🌐 SERVICES:", "bright");
  log("   Frontend:  http://localhost:3000", "cyan");
  log("   Backend:   http://localhost:4000", "magenta");
  log("   OCR API:   http://localhost:5000", "blue");

  log("\n📸 FEATURES AVAILABLE:", "bright");
  log("   ✅ Image Upload & OCR", "green");
  log("   ✅ PDF Processing", "green");
  log("   ✅ Arabic Text Support", "green");
  if (gpuAvailable) {
    log("   ✅ GPU Acceleration (RTX 3050)", "green");
  } else {
    log("   ⚠️  CPU Processing (slower)", "yellow");
  }

  log("\n🎯 QUICK LINKS:", "bright");
  log("   • Upload Page:    http://localhost:3000/upload", "cyan");
  log("   • Dashboard:      http://localhost:3000/dashboard", "cyan");
  log("   • OCR Search:     http://localhost:3000/search", "cyan");

  log("\n🧪 TEST OCR:", "bright");
  log("   • Test Camera:    npm run dev:camera", "yellow");
  log("   • Test OCR:       npm run ocr:test", "yellow");
  log("   • OCR with Image: npm run ocr:run /path/to/image.jpg", "yellow");

  log("\n📝 SUPPORTED FORMATS:", "bright");
  log("   • Images: JPG, PNG, BMP, GIF, WEBP", "cyan");
  log("   • Documents: PDF", "cyan");
  log("   • Languages: Arabic, English", "cyan");

  if (!gpuAvailable) {
    log("\n💡 TO ENABLE GPU:", "yellow");
    log("   1. Install CUDA Toolkit 12.1 or 13.1", "yellow");
    log("   2. Install cuDNN", "yellow");
    log("   3. Reinstall PyTorch with CUDA support", "yellow");
  }

  log("\n⚠️  Press Ctrl+C to stop all services", "red");

  // Handle shutdown
  const cleanup = () => {
    log("\n\n🛑 Shutting down services...", "yellow");

    if (backendProc) backendProc.kill();
    if (frontendProc) frontendProc.kill();
    if (ocrProc) ocrProc.kill();

    log("✅ All services stopped", "green");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  log(`❌ ERROR: ${error.message}`, "red");
  process.exit(1);
});
