#!/usr/bin/env python3
"""
OCR Model Server - Flask API
Provides REST API for OCR processing
"""

import sys
import os
import json
import torch
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import io

# Add model directory to path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    import easyocr
    import cv2
    import numpy as np
    from PIL import Image
    import pypdfium2 as pdfium
    from arabic_reshaper import reshape
    from ocr_config import get_config, get_cache_dir
    HAS_DEPENDENCIES = True
except ImportError as e:
    HAS_DEPENDENCIES = False
    print(f"ERROR: Missing dependencies: {e}")

# Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
UPLOAD_FOLDER = Path(MODEL_DIR.parent) / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'tiff', 'tif'}

# Global reader
_reader = None
_device = None

def get_reader():
    """Get or create OCR reader"""
    global _reader, _device
    
    if _reader is not None:
        return _reader, _device
    
    try:
        config = get_config()
        languages = config["languages"]
        requested_gpu = bool(config["use_gpu"])
        actual_gpu_available = torch.cuda.is_available()

        print(
            f"[OCR] Initializing EasyOCR (requested_gpu={requested_gpu}, torch_cuda={actual_gpu_available})"
        )

        # Only use GPU when both requested and actually available.
        if requested_gpu and actual_gpu_available:
            try:
                _reader = easyocr.Reader(
                    languages,
                    gpu=True,
                    verbose=False,
                    model_storage_directory=str(get_cache_dir())
                )
                _device = "cuda"
                print("[OCR] Using CUDA device")
                return _reader, _device
            except Exception as e:
                print(f"[OCR] GPU initialization failed: {e}, falling back to CPU")
        else:
            if requested_gpu and not actual_gpu_available:
                print("[OCR] CUDA not available in PyTorch, using CPU")
        
        # Fallback to CPU
        _reader = easyocr.Reader(
            languages,
            gpu=False,
            verbose=False,
            model_storage_directory=str(get_cache_dir())
        )
        _device = "cpu"
        print(f"[OCR] Using CPU device")
        return _reader, _device
        
    except Exception as e:
        print(f"[OCR] ERROR initializing reader: {e}")
        raise

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_image(image_path):
    """Process image with OCR"""
    try:
        reader, device = get_reader()
        
        # Read image
        image = cv2.imread(str(image_path))
        if image is None:
            return {"success": False, "error": "Failed to read image"}
        
        # OCR
        results = reader.readtext(image, detail=1)
        
        # Extract text
        texts = []
        confidence = []
        
        for bbox, text, conf in results:
            if text.strip() and conf >= 0.3:
                texts.append(text.strip())
                confidence.append(conf)
        
        full_text = "\n".join(texts)
        avg_confidence = sum(confidence) / len(confidence) if confidence else 0

        if not full_text.strip():
            return {"success": False, "error": "No text detected in image"}
        
        return {
            "success": True,
            "text": full_text,
            "confidence": avg_confidence,
            "engine": "easyocr",
            "device": device,
            "format": "image",
            "source": "image_ocr",
            "processing_time_ms": 0
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def extract_pdf_page_text(page):
    """Extract embedded text from a PDF page if available"""
    try:
        textpage = page.get_textpage()
        if not textpage:
            return ""

        text = textpage.get_text_range()
        return "\n".join(
            line.strip() for line in str(text).splitlines() if line.strip()
        ).strip()
    except Exception:
        return ""

def process_pdf(pdf_path):
    """Process PDF with OCR"""
    try:
        reader, device = get_reader()
        
        pdf = pdfium.PdfDocument(pdf_path)
        pages_text = []
        
        for page_num, page in enumerate(pdf):
            try:
                direct_text = extract_pdf_page_text(page)
                if direct_text:
                    pages_text.append(f"--- Page {page_num + 1} ---\n{direct_text}")
                    continue

                # Render page to image
                bitmap = page.render(scale=3.0)
                pil_image = bitmap.to_pil()
                
                # OCR
                results = reader.readtext(np.array(pil_image), detail=1)
                
                # Extract text
                page_texts = []
                for bbox, text, conf in results:
                    if text.strip() and conf >= 0.3:
                        page_texts.append(text.strip())
                
                if page_texts:
                    pages_text.append(f"--- Page {page_num + 1} ---\n" + "\n".join(page_texts))
                    
            except Exception as e:
                print(f"[OCR] Error processing page {page_num + 1}: {e}")
                continue
        
        full_text = "\n\n".join(pages_text) if pages_text else ""

        if not full_text.strip():
            return {"success": False, "error": "No text detected in PDF"}
        
        return {
            "success": True,
            "text": full_text,
            "engine": "easyocr",
            "device": device,
            "format": "pdf",
            "source": "pdf_text_layer" if pages_text and all(entry.startswith("--- Page") for entry in pages_text) else "pdf_ocr",
            "pages": len(pdf),
            "pages_processed": len(pages_text),
            "processing_time_ms": 0
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# Routes
@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    try:
        reader, device = get_reader()
        return jsonify({
            "status": "ok",
            "ocr": "ready",
            "device": device,
            "gpu_available": torch.cuda.is_available(),
            "pytorch_version": torch.__version__
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Get OCR status"""
    return jsonify({
        "status": "running",
        "gpu": torch.cuda.is_available(),
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "pytorch": torch.__version__,
        "supported_formats": list(ALLOWED_EXTENSIONS)
    })

@app.route('/ocr', methods=['POST'])
def ocr():
    """Process file with OCR"""
    
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file provided"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": f"File type not allowed. Supported: {','.join(ALLOWED_EXTENSIONS)}"
        }), 400
    
    try:
        # Save file
        filename = secure_filename(file.filename)
        filepath = UPLOAD_FOLDER / filename
        file.save(str(filepath))
        
        # Process
        ext = filename.rsplit('.', 1)[1].lower()
        
        if ext == 'pdf':
            result = process_pdf(filepath)
        else:
            result = process_image(filepath)
        
        # Cleanup
        try:
            filepath.unlink()
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ocr/url', methods=['POST'])
def ocr_url():
    """Process URL with OCR"""
    try:
        data = request.get_json()
        
        if 'url' not in data:
            return jsonify({"success": False, "error": "No URL provided"}), 400
        
        url = data['url']
        
        # Download and process
        import requests
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        image = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
        
        reader, device = get_reader()
        results = reader.readtext(image, detail=1)
        
        texts = []
        confidence = []
        
        for bbox, text, conf in results:
            if text.strip() and conf >= 0.3:
                texts.append(text.strip())
                confidence.append(conf)
        
        full_text = "\n".join(texts)
        avg_confidence = sum(confidence) / len(confidence) if confidence else 0
        
        return jsonify({
            "success": True,
            "text": full_text,
            "confidence": avg_confidence,
            "engine": "easyocr",
            "device": device,
            "source": "url"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({"success": False, "error": "File too large (max 50MB)"}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Server error"}), 500

if __name__ == '__main__':
    if not HAS_DEPENDENCIES:
        print("ERROR: Missing required dependencies")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("OCR Model Server Starting")
    print("="*60)
    
    try:
        reader, device = get_reader()
        print(f"OCR Ready on {device.upper()}")
        print(f"GPU Available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"Device: {torch.cuda.get_device_name(0)}")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    
    print(f"\nServer running on http://127.0.0.1:5000")
    print(f"Endpoints:")
    print(f"GET  /health    - Health check")
    print(f"GET  /status    - OCR status")
    print(f"POST /ocr       - Process file")
    print(f"POST /ocr/url   - Process URL")
    print("="*60 + "\n")
    
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
