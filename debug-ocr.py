#!/usr/bin/env python3
"""
Debug OCR Script - Test with your specific PDF file
"""

import sys
import os
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
    from ocr_runner import process_pdf_with_easyocr
    import easyocr
    print("✅ OCR imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def debug_pdf_ocr(pdf_path: str):
    """Debug OCR process with detailed logging"""
    
    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        return False
    
    print(f"🔍 Processing PDF: {pdf_path}")
    
    try:
        # Initialize EasyOCR
        print("📋 Initializing EasyOCR...")
        import torch
        gpu_available = torch.cuda.is_available()
        print(f"CUDA Available: {gpu_available}")
        reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=True)
        print(f"✅ EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
        
        # Process PDF
        print("📄 Starting PDF processing...")
        result = process_pdf_with_easyocr(pdf_path, reader)
        
        print(f"📊 Result: {result}")
        
        if result.get('success'):
            text = result.get('text', '').strip()
            if text:
                print(f"✅ SUCCESS: Extracted {len(text)} characters")
                print(f"📝 First 200 characters: {text[:200]}")
                return True
            else:
                print("⚠️  WARNING: OCR completed but no text found")
                return True
        else:
            print(f"❌ FAILED: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug-ocr.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    success = debug_pdf_ocr(pdf_file)
    
    if success:
        print("\n🎉 OCR PROCESSING COMPLETED SUCCESSFULLY!")
    else:
        print("\n💥 OCR PROCESSING FAILED!")
