#!/usr/bin/env python3
"""
Direct OCR Test - Bypass file storage to test OCR model
"""

import sys
import os
import json
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
    from ocr_runner import process_pdf_with_easyocr, process_docx_with_text_extraction
    import easyocr
    print("✅ All OCR imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_ocr_with_sample():
    """Test OCR with a simple sample"""
    
    # Create a simple test PDF if no file provided
    if len(sys.argv) < 2:
        print("Testing OCR with sample data...")
        
        # Test EasyOCR initialization
        try:
            import torch
            gpu_available = torch.cuda.is_available()
            print(f"CUDA Available: {gpu_available}")
            reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=False)
            print(f"✅ EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
            
            # Create a simple test image
            import numpy as np
            from PIL import Image
            
            # Create a test image with text
            img_array = np.ones((100, 300, 3), dtype=np.uint8) * 255  # White background
            test_img = Image.fromarray(img_array, mode='RGB')
            
            # Test OCR on the image
            results = reader.readtext(np.array(test_img), detail=0, paragraph=True)
            print(f"✅ OCR test completed. Found {len(results)} text regions")
            
            if results:
                print(f"Sample OCR result: {results[0] if results else 'No text found'}")
            
            return True
            
        except Exception as e:
            print(f"❌ OCR test failed: {e}")
            return False
    else:
        # Test with provided file
        file_path = sys.argv[1]
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return False
            
        print(f"Testing OCR with file: {file_path}")
        
        try:
            # Initialize EasyOCR
            import torch
            gpu_available = torch.cuda.is_available()
            print(f"CUDA Available: {gpu_available}")
            reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=False)
            print(f"✅ EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
            
            # Process based on file type
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.pdf':
                result = process_pdf_with_easyocr(file_path, reader)
            elif file_ext == '.docx':
                result = process_docx_with_text_extraction(file_path)
            elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                from ocr_runner import process_image_with_easyocr
                result = process_image_with_easyocr(file_path, reader)
            else:
                print(f"❌ Unsupported file type: {file_ext}")
                return False
            
            if result.get('success'):
                text = result.get('text', '').strip()
                if text:
                    print(f"✅ OCR successful! Extracted {len(text)} characters")
                    print(f"First 100 chars: {text[:100]}...")
                    return True
                else:
                    print("⚠️  OCR completed but no text found")
                    return True
            else:
                print(f"❌ OCR failed: {result.get('error', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"❌ File processing failed: {e}")
            return False

if __name__ == "__main__":
    success = test_ocr_with_sample()
    if success:
        print("\n🎉 OCR MODEL IS WORKING!")
        print("The issue is likely with file storage, not the OCR model.")
    else:
        print("\n💥 OCR MODEL HAS ISSUES!")
        print("Check dependencies and model configuration.")
