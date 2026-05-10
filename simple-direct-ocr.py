#!/usr/bin/env python3
"""
Simple Direct OCR Test - Bypass complex PDF processing
"""

import sys
import os
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

def direct_ocr_test(file_path: str):
    """Direct OCR test without complex processing"""
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    try:
        import easyocr
        import torch
        import pypdfium2 as pdfium
        from PIL import Image
        # Compatibility for Pillow 10+
        if not hasattr(Image, 'ANTIALIAS'):
            Image.ANTIALIAS = Image.Resampling.LANCZOS
        
        print(f"🔍 Direct OCR test: {file_path}")
        gpu_available = torch.cuda.is_available()
        print(f"CUDA Available: {gpu_available}")
        
        # Initialize EasyOCR with GPU support
        reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=True)
        print(f"Running on: {'GPU (CUDA)' if gpu_available else 'CPU'}")
        print("✅ EasyOCR initialized")
        
        # For PDF, convert first page to image
        if file_path.lower().endswith('.pdf'):
            print("📄 Processing PDF directly...")
            pdf = pdfium.PdfDocument(file_path)
            
            if len(pdf) > 0:
                page = pdf[0]
                print(f"✅ PDF loaded: {len(pdf)} pages")
                
                # Convert to image with high quality
                bitmap = page.render(
                    scale=3.0,  # High DPI
                )
                pil_image = bitmap.to_pil()
                print(f"✅ Page rendered: {pil_image.size}")
                
                # Direct OCR on rendered image
                results = reader.readtext(
                    pil_image,
                    detail=0,
                    paragraph=True,
                    width_ths=0.5,  # Lower thresholds
                    height_ths=0.5,
                    x_ths=1.0,
                    y_ths=0.5,
                )
                
                print(f"📊 OCR Results: {len(results)} regions found")
                
                if results:
                    text = "\n".join(results)
                    print(f"✅ SUCCESS: Extracted {len(text)} characters")
                    print(f"📝 First 200 characters: {text[:200]}")
                    print("🎉 DIRECT OCR IS WORKING!")
                    return True
                else:
                    print("❌ No text found in rendered page")
                    return False
            else:
                print("❌ PDF has no pages")
                return False
        else:
            # For images, process directly
            print("🖼️ Processing image directly...")
            from PIL import Image
            
            img = Image.open(file_path)
            print(f"✅ Image loaded: {img.size}")
            
            results = reader.readtext(
                img,
                detail=0,
                paragraph=True,
                width_ths=0.5,
                height_ths=0.5,
            )
            
            if results:
                text = "\n".join(results)
                print(f"✅ SUCCESS: Extracted {len(text)} characters")
                print(f"📝 First 200 characters: {text[:200]}")
                print("🎉 DIRECT OCR IS WORKING!")
                return True
            else:
                print("❌ No text found in image")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python simple-direct-ocr.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    success = direct_ocr_test(file_path)
    
    if success:
        print("\n🎉 DIRECT OCR TEST PASSED!")
        print("✅ The OCR system is working correctly!")
        print("📝 This confirms EasyOCR can extract text from your files.")
    else:
        print("\n💥 DIRECT OCR TEST FAILED!")
        print("❌ There may be an issue with the file format or content.")
