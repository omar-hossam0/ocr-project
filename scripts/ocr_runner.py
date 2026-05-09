#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR Runner Script - Uses EasyOCR with Arabic reshaper from model folder
This script processes images and PDFs using the custom Arabic OCR model
"""

import sys
import os
import json
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    import easyocr
    import cv2
    import numpy as np
    from PIL import Image
    import pypdfium2 as pdfium
    try:
        import torch
    except Exception:
        torch = None
    
    # Import Arabic reshaper from our model
    try:
        from arabic_reshaper import reshape
        from ocr_config import get_config, get_cache_dir
        HAS_MODEL = True
    except ImportError:
        # Fallback if model imports fail
        HAS_MODEL = False
        def reshape(text):
            return text
        def get_config():
            return {"languages": ["ar", "en"], "use_gpu": True}
        def get_cache_dir():
            return Path.home() / ".EasyOCR"
    
    HAS_DEPENDENCIES = True
except ImportError as e:
    HAS_DEPENDENCIES = False
    IMPORT_ERROR = str(e)
    HAS_MODEL = False


def reshape_arabic_text(text: str) -> str:
    """
    Reshape Arabic text using our custom model's reshaper
    This ensures proper Arabic text rendering and ligature support
    """
    if not text:
        return text
    
    try:
        # Use the reshape function from our model
        reshaped = reshape(text)
        return reshaped
    except Exception as e:
        # If reshaping fails, return original text
        print(f"Warning: Arabic reshaping failed: {e}", file=sys.stderr)
        return text


def preprocess_image(image_array):
    """
    Preprocess image for better OCR results
    - Convert to grayscale
    - Apply adaptive thresholding
    - Denoise
    """
    try:
        # Convert to grayscale if needed
        if len(image_array.shape) == 3:
            gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        else:
            gray = image_array
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Apply adaptive thresholding for better text detection
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh
    except Exception as e:
        print(f"Warning: Preprocessing failed, using original: {e}", file=sys.stderr)
        return image_array


def process_image_with_easyocr(image_path: str, reader) -> dict:
    """
    Process a single image using EasyOCR with Arabic support
    """
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            # Try with PIL if cv2 fails
            pil_image = Image.open(image_path)
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Preprocess image
        processed = preprocess_image(image)
        
        # Run OCR with both Arabic and English
        results = reader.readtext(processed, detail=0, paragraph=True)
        
        # Combine all text
        raw_text = "\n".join(results)
        
        # Reshape Arabic text using our custom model
        reshaped_text = reshape_arabic_text(raw_text)
        
        return {
            "success": True,
            "text": reshaped_text,
            "raw_text": raw_text,
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "model": "custom_arabic_reshaper"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Image processing failed: {str(e)}"
        }


def process_pdf_with_easyocr(pdf_path: str, reader) -> dict:
    """
    Process PDF by converting pages to images and running OCR
    """
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        all_text = []
        pages_processed = 0
        
        for page_num in range(len(pdf)):
            try:
                page = pdf[page_num]

                # Render page to image using configured DPI for better perf/quality tradeoff
                try:
                    cfg = get_config()
                    dpi = cfg.get("pdf_config", {}).get("dpi", 300)
                except Exception:
                    dpi = 300
                scale = float(dpi) / 72.0
                bitmap = page.render(scale=scale)
                pil_image = bitmap.to_pil()
                
                # Convert to numpy array for OpenCV
                image_array = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                
                # Preprocess
                processed = preprocess_image(image_array)
                
                # Run OCR
                results = reader.readtext(processed, detail=0, paragraph=True)
                page_text = "\n".join(results)
                
                # Reshape Arabic text
                reshaped_text = reshape_arabic_text(page_text)
                
                if reshaped_text.strip():
                    all_text.append(f"--- Page {page_num + 1} ---\n{reshaped_text}")
                    pages_processed += 1
                
            except Exception as page_error:
                print(f"Warning: Failed to process page {page_num + 1}: {page_error}", file=sys.stderr)
                continue
        
        combined_text = "\n\n".join(all_text)
        
        return {
            "success": True,
            "text": combined_text,
            "engine": "easyocr",
            "languages": ["ar", "en"],
            "pages_processed": pages_processed,
            "total_pages": len(pdf),
            "model": "custom_arabic_reshaper"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"PDF processing failed: {str(e)}"
        }


def main():
    """
    Main entry point for OCR processing
    Expects file path as command line argument
    Returns JSON result to stdout
    """
    if not HAS_DEPENDENCIES:
        result = {
            "success": False,
            "error": f"Missing required dependencies: {IMPORT_ERROR}",
            "hint": "Install: pip install easyocr opencv-python-headless pypdfium2 pillow"
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "No file path provided",
            "usage": "python ocr_runner.py <file_path>"
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        result = {
            "success": False,
            "error": f"File not found: {file_path}"
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    # Load configuration
    config = get_config()
    
    # Determine file type
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        # Initialize EasyOCR reader with configuration
        languages = config["languages"]
        use_gpu = config["use_gpu"]
        
        print(f"Initializing EasyOCR with languages: {languages}, GPU: {use_gpu}...", file=sys.stderr)
        try:
            if torch is not None:
                print(f"torch: {torch.__version__}", file=sys.stderr)
                print(f"torch.cuda.is_available: {torch.cuda.is_available()}", file=sys.stderr)
            else:
                print("torch: not installed", file=sys.stderr)
        except Exception:
            pass
        
        try:
            # Try GPU first if enabled
            if use_gpu:
                reader = easyocr.Reader(
                    languages, 
                    gpu=True, 
                    verbose=False,
                    model_storage_directory=str(get_cache_dir())
                )
                device = "cuda"
            else:
                raise Exception("GPU disabled in config")
        except Exception:
            # Fallback to CPU
            reader = easyocr.Reader(
                languages, 
                gpu=False, 
                verbose=False,
                model_storage_directory=str(get_cache_dir())
            )
            device = "cpu"
        
        print(f"EasyOCR initialized on {device}", file=sys.stderr)
        
        # Process based on file type
        if file_ext == '.pdf':
            result = process_pdf_with_easyocr(file_path, reader)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp']:
            result = process_image_with_easyocr(file_path, reader)
        else:
            result = {
                "success": False,
                "error": f"Unsupported file type: {file_ext}",
                "supported": [".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]
            }
        
        # Add device info and config to result
        if result.get("success"):
            result["device"] = device
            result["config"] = {
                "languages": languages,
                "gpu_enabled": use_gpu,
                "gpu_used": device == "cuda"
            }
        
        # Output JSON result
        print(json.dumps(result, ensure_ascii=False))
        
        sys.exit(0 if result.get("success") else 1)
    
    except Exception as e:
        result = {
            "success": False,
            "error": f"OCR processing failed: {str(e)}",
            "traceback": str(e)
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
