#!/usr/bin/env python3
"""
OCR Microservice - Fast HTTP API for OCR processing
Keeps EasyOCR loaded in memory for instant responses
"""

import sys
import os
import json
import time
import io
import base64
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import gc

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

print("Starting OCR Microservice...")
start_time = time.time()

# Load all dependencies
try:
    import easyocr
    import cv2
    import numpy as np
    from PIL import Image
    # Compatibility for Pillow 10+
    if not hasattr(Image, 'ANTIALIAS'):
        Image.ANTIALIAS = Image.Resampling.LANCZOS
    import pypdfium2 as pdfium
    
    from arabic_reshaper import reshape
    from ocr_config import get_config, get_cache_dir
    HAS_MODEL = True
except ImportError as e:
    print(f"Missing dependencies: {e}")
    sys.exit(1)

# Initialize EasyOCR once
config = get_config()
languages = config["languages"]
use_gpu = config["use_gpu"]

print(f"  Loading EasyOCR (languages: {languages}, GPU: {use_gpu})...")

# Try GPU first
if use_gpu:
    try:
        reader = easyocr.Reader(
            languages,
            gpu=True,
            verbose=False,
            model_storage_directory=str(get_cache_dir())
        )
        device = "cuda"
        print(f"  GPU mode active")
    except Exception as e:
        print(f"  GPU failed ({e}), using CPU...")
        reader = easyocr.Reader(
            languages,
            gpu=False,
            verbose=False,
            model_storage_directory=str(get_cache_dir())
        )
        device = "cpu"
else:
    reader = easyocr.Reader(
        languages,
        gpu=False,
        verbose=False,
        model_storage_directory=str(get_cache_dir())
    )
    device = "cpu"

init_time = time.time() - start_time
print(f"\nOCR Service ready in {init_time:.1f}s")
print(f"   Device: {device}")
print(f"  EasyOCR ready on CPU for fast OCR processing!\n")


def preprocess_image(image_array):
    """Fast image preprocessing"""
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


def process_image(image_data):
    """Process image bytes"""
    try:
        # Convert bytes to image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            # Try PIL fallback
            pil_image = Image.open(io.BytesIO(image_data))
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        processed = preprocess_image(image)
        results = reader.readtext(processed, detail=0, paragraph=True)
        raw_text = "\n".join(results)

        return {
            "success": True,
            "text": raw_text,
            "raw_text": raw_text,
            "engine": "easyocr",
            "languages": languages,
            "device": device
        }
    except Exception as e:
        return {"success": False, "error": f"Image processing failed: {str(e)}"}


def process_pdf(file_data):
    """Process PDF bytes"""
    try:
        # Save to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(file_data)
            tmp_path = tmp.name
        
        pdf = pdfium.PdfDocument(tmp_path)
        total_pages = len(pdf)
        all_text = []
        pages_processed = 0
        
        # Adaptive DPI for server stability
        try:
            base_dpi = config.get("pdf_config", {}).get("dpi", 150)
        except Exception:
            base_dpi = 150
            
        if total_pages > 30:
            dpi = 120
        elif total_pages > 10:
            dpi = 150
        else:
            dpi = 180
            
        for page_num in range(total_pages):
            try:
                page = pdf[page_num]
                scale = float(dpi) / 72.0
                bitmap = page.render(scale=scale)
                pil_image = bitmap.to_pil()
                
                # Convert to grayscale numpy array immediately
                if pil_image.mode != 'L':
                    pil_image = pil_image.convert('L')
                image_array = np.array(pil_image)
                
                # Clean up
                del pil_image
                bitmap.close()
                page.close()
                
                processed = preprocess_image(image_array)
                results = reader.readtext(processed, detail=0, paragraph=True)
                page_text = "\n".join(results)

                if page_text.strip():
                    all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    pages_processed += 1
                
                if (page_num + 1) % 3 == 0:
                    gc.collect()
                    
            except Exception as page_error:
                print(f"Warning: Page {page_num + 1} failed: {page_error}", file=sys.stderr)
                continue
        
        # Cleanup
        os.unlink(tmp_path)
        pdf.close()
        gc.collect()
        
        return {
            "success": True,
            "text": "\n\n".join(all_text),
            "raw_text": "\n\n".join(all_text),
            "engine": "easyocr",
            "languages": languages,
            "pages_processed": pages_processed,
            "total_pages": total_pages,
            "device": device
        }
    except Exception as e:
        return {"success": False, "error": f"PDF processing failed: {str(e)}"}


class OCRHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler for OCR requests"""
    
    def log_message(self, format, *args):
        # Suppress logs
        pass
    
    def do_POST(self):
        """Handle OCR requests"""
        start_time = time.time()
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse request
            data = json.loads(body.decode('utf-8'))
            file_data = base64.b64decode(data['file'])
            file_type = data.get('type', 'image')
            filename = data.get('filename') or data.get('name') or 'upload'
            print(f"[OCR Server] Received {file_type} request: {filename} ({len(file_data)} bytes)")
            
            # Process based on type
            if file_type == 'pdf':
                result = process_pdf(file_data)
            else:
                result = process_image(file_data)
            
            # Add timing
            result['processing_time_ms'] = (time.time() - start_time) * 1000
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e)
            }, ensure_ascii=False).encode('utf-8'))
    
    def do_GET(self):
        """Health check"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": True,
            "status": "ready",
            "device": device,
            "languages": languages
        }).encode('utf-8'))


def start_server(port=5000):
    """Start the OCR server"""
    server = HTTPServer(('localhost', port), OCRHandler)
    print(f"\nOCR Server running on http://localhost:{port}")
    print(f"   Health: http://localhost:{port}/")
    print(f"   OCR:    POST http://localhost:{port}/")
    print("\n   Press Ctrl+C to stop\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping OCR Server...")
        server.shutdown()


if __name__ == "__main__":
    port = int(os.environ.get('OCR_SERVICE_PORT', 5000))
    start_server(port)
