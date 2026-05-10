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
    """Minimal preprocessing: grayscale only. EasyOCR handles the rest internally."""
    try:
        if len(image_array.shape) == 3:
            return cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        return image_array
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
    """Process a single image with RTL Arabic sorting"""
    try:
        image = cv2.imread(image_path)
        if image is None:
            pil_image = Image.open(image_path)
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

        processed = preprocess_image(image)
        results = reader.readtext(processed, detail=1, paragraph=False, batch_size=8)

        if not results:
            return {"success": False, "error": "No text detected"}

        # Sort by Y then X descending (RTL)
        results.sort(key=lambda r: (r[0][0][1], -r[0][0][0]))

        # Calculate adaptive y_threshold from median text height
        heights = []
        for r in results:
            bbox = r[0]
            h = abs(bbox[2][1] - bbox[0][1])
            if h > 5:
                heights.append(h)
        median_height = np.median(heights) if heights else 20
        y_threshold = max(20, median_height * 0.6)

        lines = []
        current_line = []
        current_y = None

        for bbox, text, confidence in results:
            if not text.strip():
                continue
            y = bbox[0][1]
            if current_y is None or abs(y - current_y) <= y_threshold:
                current_line.append((bbox, text.strip(), confidence))
                current_y = (current_y * len(current_line) + y) / (len(current_line) + 1) if current_y else y
            else:
                current_line.sort(key=lambda r: -r[0][0][0])
                lines.append(" ".join([w[1] for w in current_line]))
                current_line = [(bbox, text.strip(), confidence)]
                current_y = y

        if current_line:
            current_line.sort(key=lambda r: -r[0][0][0])
            lines.append(" ".join([w[1] for w in current_line]))

        raw_text = "\n".join(lines)

        return {
            "success": True,
            "text": raw_text,
            "raw_text": raw_text,
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "model": "easyocr",
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
                results = reader.readtext(processed, detail=1, paragraph=False, batch_size=8)

                # Sort by Y then X descending (RTL for Arabic)
                results.sort(key=lambda r: (r[0][0][1], -r[0][0][0]))

                # Calculate adaptive y_threshold from median text height
                heights = []
                for r in results:
                    bbox = r[0]
                    h = abs(bbox[2][1] - bbox[0][1])
                    if h > 5:
                        heights.append(h)
                median_height = np.median(heights) if heights else 20
                y_threshold = max(20, median_height * 0.6)

                lines = []
                current_line = []
                current_y = None

                for bbox, text, confidence in results:
                    if not text.strip():
                        continue
                    y = bbox[0][1]
                    if current_y is None or abs(y - current_y) <= y_threshold:
                        current_line.append((bbox, text.strip(), confidence))
                        current_y = (current_y * len(current_line) + y) / (len(current_line) + 1) if current_y else y
                    else:
                        current_line.sort(key=lambda r: -r[0][0][0])
                        lines.append(" ".join([w[1] for w in current_line]))
                        current_line = [(bbox, text.strip(), confidence)]
                        current_y = y

                if current_line:
                    current_line.sort(key=lambda r: -r[0][0][0])
                    lines.append(" ".join([w[1] for w in current_line]))

                page_text = "\n".join(lines)

                if page_text.strip():
                    all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    pages_processed += 1
            except Exception as page_error:
                print(f"Warning: Page {page_num + 1} failed: {page_error}", file=sys.stderr)
                continue
        
        combined_text = "\n\n".join(all_text)

        return {
            "success": True,
            "text": combined_text,
            "raw_text": combined_text,
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "pages_processed": pages_processed,
            "total_pages": len(pdf),
            "model": "easyocr",
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
