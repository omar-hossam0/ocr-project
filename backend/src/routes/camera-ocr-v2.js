import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const router = express.Router();

// Configure multer for memory storage with optimized settings
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for faster processing
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Cache for model status
let modelStatus = {
  initialized: false,
  lastCheck: null,
  loading: false
};

// Initialize optimized OCR model
async function initializeOptimizedOCR() {
  if (modelStatus.loading) {
    // Wait for initialization
    while (modelStatus.loading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelStatus.initialized;
  }

  if (modelStatus.initialized && Date.now() - modelStatus.lastCheck < 300000) {
    // Cache for 5 minutes
    return true;
  }

  modelStatus.loading = true;

  try {
    const modelPath = path.resolve(process.cwd(), "..", "model", "camera_ocr_optimized.py");
    
    // Test if the optimized model is available
    const testResult = await testOptimizedModel(modelPath);
    
    modelStatus.initialized = testResult.success;
    modelStatus.lastCheck = Date.now();
    modelStatus.loading = false;

    if (testResult.success) {
      console.log("✅ Optimized Camera OCR model ready");
    } else {
      console.error("❌ Optimized Camera OCR model failed:", testResult.error);
    }

    return testResult.success;
  } catch (error) {
    console.error("Error initializing optimized OCR model:", error);
    modelStatus.initialized = false;
    modelStatus.lastCheck = Date.now();
    modelStatus.loading = false;
    return false;
  }
}

async function testOptimizedModel(modelPath) {
  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    if (!pythonPath) {
      resolve({ success: false, error: "Python not found" });
      return;
    }

    const child = spawn(pythonPath, [modelPath, "--test"], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      timeout: 10000, // 10 second timeout for test
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
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || stdout });
      }
    });

    child.on("error", (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

function getPythonPath() {
  const candidates = [
    process.env.OCR_PYTHON_PATH,
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv", "bin", "python"),
    "python3",
    "python",
  ].filter(Boolean);

  return candidates[0];
}

// Fast OCR processing using optimized model
async function processImageFast(imageBuffer, fileName, options = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fast-ocr-"));
  const tempImagePath = path.join(tempDir, fileName);
  
  try {
    // Write image to temporary file
    await fs.writeFile(tempImagePath, imageBuffer);
    
    // Run fast OCR processing
    const result = await runFastOCR(tempImagePath, options);
    
    return result;
  } finally {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn("Failed to clean up temp directory:", cleanupError);
    }
  }
}

async function runFastOCR(imagePath, options = {}) {
  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    if (!pythonPath) {
      resolve({ success: false, error: "Python not available" });
      return;
    }

    const modelPath = path.resolve(process.cwd(), "..", "model", "camera_ocr_optimized.py");
    
    // Create fast OCR script
    const ocrScript = `
import sys
import json
import time
from pathlib import Path

# Add model directory to path
sys.path.append('${path.dirname(modelPath)}')

try:
    from camera_ocr_optimized import process_camera_capture
    
    start_time = time.time()
    
    # Process the image
    with open('${imagePath}', 'rb') as f:
        image_data = f.read()
    
    result = process_camera_capture(
        image_data, 
        confidence_threshold=${options.confidence_threshold || 0.5}
    )
    
    # Add processing time
    if result.get('success'):
        result['processing_time_ms'] = (time.time() - start_time) * 1000
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e),
        "processing_time_ms": 0
    }))
`;

    const child = spawn(pythonPath, ["-c", ocrScript], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      timeout: 15000, // 15 second timeout for fast processing
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
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: stderr || "Failed to parse OCR result",
          code
        });
      }
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
  });
}

// Main camera capture endpoint - optimized for speed
router.post("/capture", upload.single("image"), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided"
      });
    }

    // Initialize OCR engine if needed
    const isReady = await initializeOptimizedOCR();
    if (!isReady) {
      return res.status(500).json({
        success: false,
        error: "OCR service not available"
      });
    }

    // Process image with optimized settings
    const options = {
      confidence_threshold: parseFloat(req.body.confidence) || 0.5
    };

    const result = await processImageFast(req.file.buffer, req.file.originalname, options);
    
    // Add API processing time
    const apiTime = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          text: result.text,
          confidence: result.confidence,
          language_detected: result.language_detected,
          arabic_ratio: result.arabic_ratio,
          device: result.device,
          processing_time_ms: result.processing_time_ms,
          api_time_ms: apiTime,
          total_time_ms: apiTime + (result.processing_time_ms || 0),
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        api_time_ms: apiTime
      });
    }
  } catch (error) {
    const apiTime = Date.now() - startTime;
    console.error("Camera OCR error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      api_time_ms: apiTime
    });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  const isReady = await initializeOptimizedOCR();
  
  res.json({
    success: true,
    data: {
      status: isReady ? "healthy" : "unhealthy",
      initialized: modelStatus.initialized,
      last_check: modelStatus.lastCheck,
      timestamp: new Date().toISOString()
    }
  });
});

// Model info endpoint
router.get("/info", async (req, res) => {
  const isReady = await initializeOptimizedOCR();
  
  res.json({
    success: true,
    data: {
      model: "Optimized Camera OCR v2",
      version: "2.0.0",
      languages: ["ar", "en"],
      initialized: isReady,
      features: [
        "Ultra-fast processing",
        "Arabic and English recognition",
        "GPU acceleration",
        "Language detection",
        "Confidence scoring",
        "Optimized preprocessing"
      ],
      performance: {
        max_file_size: "5MB",
        timeout: "15 seconds",
        supported_formats: ["JPEG", "PNG", "BMP", "TIFF"]
      }
    }
  });
});

// Batch processing endpoint for multiple images
router.post("/batch", upload.array("images", 5), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No image files provided"
      });
    }

    const isReady = await initializeOptimizedOCR();
    if (!isReady) {
      return res.status(500).json({
        success: false,
        error: "OCR service not available"
      });
    }

    const options = {
      confidence_threshold: parseFloat(req.body.confidence) || 0.5
    };

    // Process images in parallel for better performance
    const promises = req.files.map(async (file, index) => {
      const result = await processImageFast(file.buffer, file.originalname, options);
      return {
        index,
        filename: file.originalname,
        ...result
      };
    });

    const batchResults = await Promise.all(promises);
    
    const apiTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        results: batchResults,
        total_images: req.files.length,
        successful: batchResults.filter(r => r.success).length,
        failed: batchResults.filter(r => !r.success).length,
        api_time_ms: apiTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const apiTime = Date.now() - startTime;
    console.error("Batch OCR error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      api_time_ms: apiTime
    });
  }
});

export default router;
