#!/usr/bin/env python3
"""
Test OCR with your uploaded file
"""

import sys
import os
from pathlib import Path

# Add model and scripts directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
SCRIPTS_DIR = Path(__file__).parent / "scripts"
sys.path.insert(0, str(MODEL_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from ocr_runner import process_pdf_with_easyocr
    import easyocr
    print("✅ OCR imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_file(file_path: str):
    """Test OCR with any file"""
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"🔍 Testing OCR with: {file_path}")
    print(f"📊 File size: {os.path.getsize(file_path)} bytes")
    
    try:
        # Initialize EasyOCR with more verbose output
        print("📋 Initializing EasyOCR...")
        import torch
        gpu_available = torch.cuda.is_available()
        print(f"CUDA Available: {gpu_available}")
        reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=True)
        print(f"✅ EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
        
        # Process file
        print("📄 Starting OCR processing...")
        result = process_pdf_with_easyocr(file_path, reader)
        
        print(f"📊 Result: {result}")
        
        if result.get('success'):
            text = result.get('text', '').strip()
            if text:
                print(f"✅ SUCCESS: Extracted {len(text)} characters")
                print(f"📝 First 200 characters: {text[:200]}")
                print(f"📝 Last 200 characters: {text[-200:]}")
                return True
            else:
                print("⚠️  WARNING: OCR completed but no text found")
                print("🔍 This might be normal for some documents")
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
        print("Usage: python test-your-file.py <file_path>")
        print("\nAvailable files to test:")
        for f in os.listdir('.'):
            if f.endswith(('.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.docx')):
                print(f"  - {f}")
        sys.exit(1)
    
    file_path = sys.argv[1]
    success = test_file(file_path)
    
    if success:
        print("\n🎉 OCR TEST COMPLETED SUCCESSFULLY!")
        print("✅ The OCR system is working correctly.")
        print("📝 If this test shows text extraction, your original files should work too.")
    else:
        print("\n💥 OCR TEST FAILED!")
        print("❌ There may be an issue with the specific file or OCR configuration.")
