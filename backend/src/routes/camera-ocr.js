import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Cache for model instances
let modelCache = {
  easyocr: null,
  trocr: null,
  lastUsed: null,
  isLoading: false
};

// Initialize optimized OCR model
async function initializeOCREngine() {
  if (modelCache.isLoading) {
    // Wait for initialization to complete
    while (modelCache.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelCache.easyocr !== null;
  }

  if (modelCache.easyocr) {
    return true;
  }

  modelCache.isLoading = true;

  try {
    // Import the optimized camera OCR module
    const cameraOCRPath = path.resolve(process.cwd(), "..", "model", "camera_ocr_to_pdf (1).py");
    
    // Test if the module is available
    const testResult = await testPythonModule(cameraOCRPath);
    
    if (testResult.success) {
      modelCache.easyocr = cameraOCRPath;
      modelCache.lastUsed = Date.now();
      console.log("Camera OCR model initialized successfully");
      return true;
    } else {
      console.error("Failed to initialize camera OCR model:", testResult.error);
      return false;
    }
  } catch (error) {
    console.error("Error initializing OCR model:", error);
    return false;
  } finally {
    modelCache.isLoading = false;
  }
}

async function testPythonModule(modulePath) {
  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    if (!pythonPath) {
      resolve({ success: false, error: "Python not found" });
      return;
    }

    const child = spawn(pythonPath, ["-c", `
import sys
sys.path.append('${path.dirname(modulePath)}')
try:
  import cv2
  import easyocr
  import torch
  from PIL import Image
  print("SUCCESS: All required modules available")
except ImportError as e:
  print(f"ERROR: {e}")
  sys.exit(1)
`], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
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
      if (code === 0 && stdout.includes("SUCCESS")) {
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

// Optimized OCR processing function
async function processImageOCR(imageBuffer, fileName) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "camera-ocr-"));
  const tempImagePath = path.join(tempDir, fileName);
  
  try {
    // Write image to temporary file
    await fs.writeFile(tempImagePath, imageBuffer);
    
    // Run optimized OCR processing
    const result = await runOptimizedOCR(tempImagePath);
    
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

async function runOptimizedOCR(imagePath) {
  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    if (!pythonPath) {
      resolve({ success: false, error: "Python not available" });
      return;
    }

    // Create optimized OCR script
    const ocrScript = `
import cv2
import numpy as np
import easyocr
import torch
import sys
import json
from pathlib import Path

# Initialize EasyOCR with optimized settings
def init_ocr():
    reader = easyocr.Reader(['ar', 'en'], gpu=torch.cuda.is_available())
    return reader

def preprocess_image(img_path):
    # Read image
    img = cv2.imread(img_path)
    if img is None:
        return None
    
    # Convert to RGB
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Optimized preprocessing for speed
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    
    # Apply adaptive threshold for better text detection
    processed = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    return processed

def extract_text(reader, img_path):
    try:
        # Preprocess image
        processed_img = preprocess_image(img_path)
        if processed_img is None:
            return {"success": False, "error": "Failed to process image"}
        
        # Extract text with optimized parameters
        results = reader.readtext(
            processed_img,
            detail=1,
            paragraph=True,
            batch_size=1,
            workers=0,
            decoder="greedy",
            beamWidth=1,
            contrast_ths=0.1,
            adjust_contrast=0.5,
            text_threshold=0.7,
            low_text=0.4,
            link_threshold=0.4
        )
        
        if not results:
            return {"success": True, "text": "", "confidence": 0.0}
        
        # Sort results by position (top to bottom)
        results.sort(key=lambda x: (x[0][0][1], x[0][0][0]))
        
        # Extract text and calculate average confidence
        texts = []
        confidences = []
        
        for (bbox, text, confidence) in results:
            if text.strip():
                texts.append(text.strip())
                confidences.append(confidence)
        
        full_text = "\\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return {
            "success": True,
            "text": full_text,
            "confidence": avg_confidence,
            "engine": "easyocr_optimized",
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Image path required"}))
        return
    
    image_path = sys.argv[1]
    
    try:
        # Initialize OCR
        reader = init_ocr()
        
        # Extract text
        result = extract_text(reader, image_path)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
`;

    const child = spawn(pythonPath, ["-c", ocrScript, imagePath], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      timeout: 30000, // 30 second timeout
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

// Camera capture endpoint
router.post("/capture", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided"
      });
    }

    // Initialize OCR engine if not already done
    const isInitialized = await initializeOCREngine();
    if (!isInitialized) {
      return res.status(500).json({
        success: false,
        error: "Failed to initialize OCR engine"
      });
    }

    // Process the image
    const result = await processImageOCR(req.file.buffer, req.file.originalname);
    
    if (result.success) {
      modelCache.lastUsed = Date.now();
      res.json({
        success: true,
        data: {
          text: result.text,
          confidence: result.confidence,
          engine: result.engine,
          device: result.device,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error("Camera OCR error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  const isInitialized = await initializeOCREngine();
  res.json({
    success: true,
    data: {
      initialized: isInitialized,
      modelLoaded: modelCache.easyocr !== null,
      lastUsed: modelCache.lastUsed,
      timestamp: new Date().toISOString()
    }
  });
});

// Model info endpoint
router.get("/info", async (req, res) => {
  const isInitialized = await initializeOCREngine();
  res.json({
    success: true,
    data: {
      model: "Camera OCR (EasyOCR Optimized)",
      languages: ["ar", "en"],
      device: "cuda", // Will be determined at runtime
      initialized: isInitialized,
      features: [
        "Real-time camera capture",
        "Arabic and English text recognition",
        "Optimized preprocessing",
        "GPU acceleration support"
      ]
    }
  });
});

export default router;
