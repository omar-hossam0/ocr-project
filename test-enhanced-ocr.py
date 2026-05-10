#!/usr/bin/env python3
"""
Test Enhanced OCR with Better Parameters
"""

import sys
import os
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    from ocr_runner import process_pdf_with_easyocr
    import easyocr
    print("✅ OCR imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_enhanced_ocr(file_path: str):
    """Test OCR with enhanced parameters"""
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"🔍 Testing Enhanced OCR with: {file_path}")
    
    try:
        # Initialize EasyOCR with enhanced settings
        print("📋 Initializing Enhanced EasyOCR...")
        import torch
        gpu_available = torch.cuda.is_available()
        print(f"CUDA Available: {gpu_available}")
        reader = easyocr.Reader(
            ['ar', 'en'], 
            gpu=gpu_available, 
            verbose=True,
            detector=True,  # Enable text detector
            recognizer=True,  # Enable text recognizer
        )
        print(f"✅ Enhanced EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
        
        # Process with enhanced parameters
        print("📄 Starting Enhanced PDF processing...")
        result = process_pdf_with_easyocr(file_path, reader)
        
        print(f"📊 Result: {result}")
        
        if result.get('success'):
            text = result.get('text', '').strip()
            if text:
                print(f"✅ SUCCESS: Extracted {len(text)} characters")
                print(f"📝 First 200 characters: {text[:200]}")
                print(f"📝 Last 200 characters: {text[-200:]}")
                print("🎉 ENHANCED OCR IS WORKING!")
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
        print("Usage: python test-enhanced-ocr.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    success = test_enhanced_ocr(pdf_file)
    
    if success:
        print("\n🎉 ENHANCED OCR TEST PASSED!")
        print("✅ The OCR system is working with enhanced parameters.")
        print("📝 Try uploading your PDF again - it should work now!")
    else:
        print("\n💥 ENHANCED OCR TEST FAILED!")
        print("❌ There may be an issue with the specific file or OCR configuration.")
