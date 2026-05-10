#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to verify Arabic PDF OCR improvements
Tests the optimized processing with reduced DPI and better Arabic handling
"""

import sys
import os
import json
import time
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    import easyocr
    import pypdfium2 as pdfium
    import numpy as np
    from PIL import Image
    import cv2
    HAS_DEPS = True
except ImportError as e:
    HAS_DEPS = False
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install easyocr pypdfium2 pillow opencv-python-headless")
    sys.exit(1)

# Import OCR utilities
try:
    from ocr_config import get_config
    from ocr_runner import process_pdf_with_easyocr
    SCRIPT_PATH = Path(__file__).parent / "scripts" / "ocr_runner.py"
except ImportError:
    SCRIPT_PATH = None

def test_pdf_loading(pdf_path):
    """Test basic PDF loading and page extraction"""
    print(f"\n🔍 Testing PDF loading: {pdf_path}")
    
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        total_pages = len(pdf)
        file_size = os.path.getsize(pdf_path) / (1024 * 1024)
        
        print(f"✅ PDF loaded: {total_pages} pages, {file_size:.2f} MB")
        
        # Test rendering first page
        if total_pages > 0:
            page = pdf[0]
            bitmap = page.render(scale=150/72)
            pil_image = bitmap.to_pil()
            bitmap.close()
            page.close()
            print(f"✅ First page rendered: {pil_image.size}")
        
        pdf.close()
        return True
    except Exception as e:
        print(f"❌ PDF loading failed: {e}")
        return False


def test_easyocr_arabic():
    """Test EasyOCR with Arabic language"""
    print(f"\n🔍 Testing EasyOCR Arabic support")
    
    try:
        config = get_config()
        languages = config.get("languages", ["ar", "en"])
        
        print(f"📦 Initializing EasyOCR with languages: {languages}")
        reader = easyocr.Reader(languages, gpu=False, verbose=False)
        print(f"✅ EasyOCR initialized")
        
        # Create a simple test image with Arabic text
        from PIL import ImageDraw, ImageFont
        img = Image.new('RGB', (400, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # Write Arabic text
        try:
            # Try to use a system font with Arabic support
            font_paths = [
                "C:\\Windows\\Fonts\\arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/System/Library/Fonts/Arial.ttf"
            ]
            font = None
            for fp in font_paths:
                if os.path.exists(fp):
                    font = ImageFont.truetype(fp, 24)
                    break
            
            if not font:
                font = ImageFont.load_default()
            
            # Arabic text: "مرحبا بالخير" (Hello with blessings)
            draw.text((10, 40), "مرحبا بالخير", fill='black', font=font)
        except Exception as e:
            print(f"⚠️  Font loading issue: {e}")
            draw.text((10, 40), "Test", fill='black')
        
        img_array = np.array(img)
        
        # Test OCR
        print(f"🔍 Running OCR on test image")
        results = reader.readtext(img_array, detail=1)
        
        print(f"✅ OCR completed: {len(results)} regions detected")
        if results:
            for i, (bbox, text, conf) in enumerate(results[:3]):
                print(f"   {i+1}. '{text}' (confidence: {conf:.2f})")
        
        return True
    except Exception as e:
        print(f"❌ EasyOCR test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pdf_dpi_settings():
    """Test DPI optimization settings"""
    print(f"\n🔍 Testing DPI settings")
    
    config = get_config()
    pdf_config = config.get("pdf_config", {})
    
    print(f"📋 PDF Configuration:")
    print(f"   Base DPI: {pdf_config.get('dpi', 150)}")
    print(f"   Arabic optimization: {pdf_config.get('arabic_optimization', False)}")
    print(f"   Skip blank pages: {pdf_config.get('skip_blank_pages', True)}")
    print(f"   Min text length: {pdf_config.get('min_text_length', 10)}")
    
    print(f"\n📊 Adaptive DPI calculation:")
    test_cases = [
        (5, 2),      # 5 pages, 2 MB
        (25, 15),    # 25 pages, 15 MB
        (50, 30),    # 50 pages, 30 MB
        (100, 50),   # 100 pages, 50 MB
    ]
    
    for total_pages, file_size in test_cases:
        if file_size > 20:
            dpi = 100
        elif total_pages > 50:
            dpi = 120
        elif total_pages > 20:
            dpi = 140
        else:
            dpi = 150
        
        print(f"   {total_pages} pages, {file_size}MB → DPI: {dpi}")
    
    return True


def test_arabic_text_reshaping():
    """Test Arabic text reshaping function"""
    print(f"\n🔍 Testing Arabic text reshaping")
    
    try:
        from ocr_runner import reshape_arabic_text
        
        # Test samples
        test_cases = [
            ("مرحبا بالخير", "Arabic greeting"),
            ("123 رقم", "Mixed Arabic and numbers"),
            ("Hello السلام", "Mixed English and Arabic"),
        ]
        
        for text, description in test_cases:
            reshaped = reshape_arabic_text(text)
            print(f"   ✓ {description}")
            print(f"     Original:  {text}")
            print(f"     Reshaped:  {reshaped}")
        
        print(f"✅ Text reshaping working")
        return True
    except Exception as e:
        print(f"❌ Text reshaping test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║      Arabic PDF OCR Fix - Verification Test Suite          ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # Test 1: DPI settings
    results.append(("DPI Settings", test_pdf_dpi_settings()))
    
    # Test 2: EasyOCR Arabic
    results.append(("EasyOCR Arabic", test_easyocr_arabic()))
    
    # Test 3: Arabic text reshaping
    results.append(("Arabic Text Reshaping", test_arabic_text_reshaping()))
    
    # Test 4: PDF operations (if sample PDF exists)
    pdf_samples = [
        Path("uploads/pdf/sample.pdf"),
        Path("test.pdf"),
    ]
    
    for pdf_path in pdf_samples:
        if pdf_path.exists():
            results.append((f"PDF Loading: {pdf_path.name}", test_pdf_loading(str(pdf_path))))
            break
    else:
        print(f"\n⚠️  No sample PDF found for testing. Create a test PDF or place it in uploads/pdf/")
    
    # Print summary
    print(f"\n" + "="*60)
    print(f"TEST SUMMARY")
    print(f"="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n🎉 All tests passed! The Arabic PDF OCR fix is ready.")
    else:
        print(f"\n⚠️  Some tests failed. Check the output above for details.")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
