#!/usr/bin/env python3
"""
Fast OCR Service - Pre-loaded EasyOCR for quick responses
Keeps EasyOCR reader in memory for fast processing
"""

import sys
import os
import json
import time
from pathlib import Path
import io

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

# Pre-load all dependencies
try:
    import easyocr
    import cv2
    import numpy as np
    from PIL import Image
    import pypdfium2 as pdfium
    
    from arabic_reshaper import reshape
    from ocr_config import get_config, get_cache_dir
    HAS_MODEL = True
except ImportError:
    HAS_MODEL = False

# Global reader instance (cached)
_reader = None
_device = None


def get_reader():
    """Get or create cached EasyOCR reader"""
    global _reader, _device
    
    if _reader is not None:
        return _reader, _device
    
    config = get_config()
    languages = config["languages"]
    use_gpu = config["use_gpu"]
    
    # Try GPU first
    if use_gpu:
        try:
            _reader = easyocr.Reader(
                languages,
                gpu=True,
                verbose=False,
                model_storage_directory=str(get_cache_dir())
            )
            _device = "cuda"
            return _reader, _device
        except Exception:
            pass
    
    # Fallback to CPU
    _reader = easyocr.Reader(
        languages,
        gpu=False,
        verbose=False,
        model_storage_directory=str(get_cache_dir())
    )
    _device = "cpu"
    return _reader, _device


def preprocess_image(image_array):
    """Preprocess image for better OCR results"""
    try:
        if len(image_array.shape) == 3:
            gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        else:
            gray = image_array
        
        # Fast denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh
    except Exception:
        return image_array


def reshape_arabic_text(text):
    """Reshape Arabic text"""
    if not text or not HAS_MODEL:
        return text
    try:
        return reshape(text)
    except Exception:
        return text


def process_image(image_path, reader, device):
    """Process a single image"""
    try:
        image = cv2.imread(image_path)
        if image is None:
            pil_image = Image.open(image_path)
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        processed = preprocess_image(image)
        results = reader.readtext(processed, detail=0, paragraph=True)
        raw_text = "\n".join(results)
        reshaped_text = reshape_arabic_text(raw_text)
        
        return {
            "success": True,
            "text": reshaped_text,
            "raw_text": raw_text,
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "model": "custom_arabic_reshaper",
            "device": device
        }
    except Exception as e:
        return {"success": False, "error": f"Image processing failed: {str(e)}"}


def process_pdf(pdf_path, reader, device):
    """Process PDF pages"""
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        all_text = []
        pages_processed = 0
        
        for page_num in range(len(pdf)):
            try:
                page = pdf[page_num]
                bitmap = page.render(scale=300/72)
                pil_image = bitmap.to_pil()
                image_array = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                processed = preprocess_image(image_array)
                results = reader.readtext(processed, detail=0, paragraph=True)
                page_text = "\n".join(results)
                reshaped_text = reshape_arabic_text(page_text)
                
                if reshaped_text.strip():
                    all_text.append(f"--- Page {page_num + 1} ---\n{reshaped_text}")
                    pages_processed += 1
            except Exception as page_error:
                print(f"Warning: Page {page_num + 1} failed: {page_error}", file=sys.stderr)
                continue
        
        return {
            "success": True,
            "text": "\n\n".join(all_text),
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "pages_processed": pages_processed,
            "total_pages": len(pdf),
            "model": "custom_arabic_reshaper",
            "device": device
        }
    except Exception as e:
        return {"success": False, "error": f"PDF processing failed: {str(e)}"}


def main():
    """Main entry point"""
    if not HAS_MODEL:
        print(json.dumps({
            "success": False,
            "error": "Missing required dependencies",
            "hint": "Install: pip install easyocr opencv-python-headless pypdfium2 pillow"
        }, ensure_ascii=False))
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No file path provided"
        }, ensure_ascii=False))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {file_path}"
        }, ensure_ascii=False))
        sys.exit(1)
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        # Get cached reader (fast!)
        reader, device = get_reader()
        
        # Process based on file type
        if file_ext == '.pdf':
            result = process_pdf(file_path, reader, device)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp']:
            result = process_image(file_path, reader, device)
        else:
            result = {
                "success": False,
                "error": f"Unsupported file type: {file_ext}",
                "supported": [".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]
            }
        
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if result.get("success") else 1)
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"OCR processing failed: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
