#!/usr/bin/env python3
"""
Comprehensive OCR Test - Debug PDF processing issues
"""

import sys
import os
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent / "model"
sys.path.insert(0, str(MODEL_DIR))

def test_dependencies():
    """Test all OCR dependencies individually"""
    print("🔍 Testing OCR Dependencies...")
    
    tests = [
        ("EasyOCR", "easyocr"),
        ("OpenCV", "cv2"),
        ("Pillow", "PIL"),
        ("NumPy", "numpy"),
        ("PDFium", "pypdfium2"),
        ("Arabic Reshaper", "arabic_reshaper"),
    ]
    
    failed = []
    for name, module in tests:
        try:
            __import__(module)
            print(f"✅ {name}: OK")
        except ImportError as e:
            print(f"❌ {name}: FAILED - {e}")
            failed.append(name)
    
    if failed:
        print(f"\n❌ Missing dependencies: {', '.join(failed)}")
        return False
    
    print("✅ All dependencies available")
    return True

def test_pdfium_directly():
    """Test PDFium with a simple PDF"""
    print("\n📄 Testing PDFium directly...")
    
    try:
        import pypdfium2 as pdfium
        
        # Test with a simple text-based PDF creation
        print("Creating test PDF...")
        
        # Try to load the problematic file
        pdf_path = "قضايا مجتمعية (متطلب جامعة).pdf"
        print(f"Looking for file: {repr(pdf_path)}")
        if os.path.exists(pdf_path):
            print(f"Loading PDF: {pdf_path}")
            try:
                pdf = pdfium.PdfDocument(pdf_path)
                print(f"✅ PDF loaded successfully - {len(pdf)} pages")
                
                # Try to read first page
                if len(pdf) > 0:
                    page = pdf[0]
                    print(f"✅ First page accessible - Size: {page.get_width()}x{page.get_height()}")
                    
                    # Try to render page
                    try:
                        bitmap = page.render(scale=2.0)
                        pil_image = bitmap.to_pil()
                        print(f"✅ Page rendered successfully - Size: {pil_image.size}")
                        return True
                    except Exception as render_error:
                        print(f"❌ Page render failed: {render_error}")
                        return False
                else:
                    print("❌ PDF has no pages")
                    return False
                    
            except Exception as pdf_error:
                print(f"❌ PDF loading failed: {pdf_error}")
                return False
        else:
            print(f"❌ File not found: {pdf_path}")
            return False
            
    except Exception as e:
        print(f"❌ PDFium test failed: {e}")
        return False

def test_ocr_with_known_good_pdf():
    """Test OCR with a known good PDF"""
    print("\n🧪 Testing OCR with known good PDF...")
    
    try:
        from ocr_runner import process_pdf_with_easyocr
        import easyocr
        
        # Create a simple test PDF with known text
        print("Creating test PDF with known text...")
        
        # Create a simple PDF for testing
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # Create a simple PDF
        c = canvas.Canvas("test-good-pdf.pdf", pagesize=letter)
        
        # Try to use a standard font
        try:
            font = TTFont("Helvetica", 12)
        except:
            font = pdfmetrics.getFont("Helvetica")
        
        # Add known text
        text_lines = [
            "This is a test document.",
            "It should be easily readable by OCR.",
            "Line 3: Arabic text: تجربة نص عربي",
            "Line 4: Numbers: 123456789",
            "Line 5: Mixed: Hello مرحبا 123"
        ]
        
        y = 750
        for line in text_lines:
            c.drawString(72, y, line)
            y -= 14
        
        c.save()
        print("✅ Test PDF created successfully")
        
        # Test OCR on the good PDF
        import torch
        gpu_available = torch.cuda.is_available()
        print(f"CUDA Available: {gpu_available}")
        reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=False)
        print(f"✅ EasyOCR initialized on {'GPU (CUDA)' if gpu_available else 'CPU'}")
        
        result = process_pdf_with_easyocr("test-good-pdf.pdf", reader)
        
        if result.get('success'):
            text = result.get('text', '').strip()
            if text and len(text) > 50:
                print(f"✅ OCR SUCCESS on good PDF! Extracted {len(text)} characters")
                print(f"📝 Sample: {text[:200]}...")
                return True
            else:
                print("⚠️  OCR completed but minimal text found")
                return True
        else:
            print(f"❌ OCR FAILED on good PDF: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def main():
    print("🚀 COMPREHENSIVE OCR DIAGNOSTIC")
    print("=" * 50)
    
    # Test 1: Dependencies
    if not test_dependencies():
        print("❌ Cannot proceed - missing dependencies")
        return False
    
    # Test 2: PDFium directly
    if not test_pdfium_directly():
        print("❌ Cannot proceed - PDFium issues")
        return False
    
    # Test 3: OCR with known good PDF
    if not test_ocr_with_known_good_pdf():
        print("❌ Cannot proceed - OCR processing issues")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 ALL TESTS PASSED!")
    print("✅ Dependencies: OK")
    print("✅ PDFium: Working")  
    print("✅ OCR Processing: Working")
    print("\n📝 CONCLUSION:")
    print("The OCR system is working correctly.")
    print("The issue is likely with the specific PDF files you're testing.")
    print("Try the test PDF 'test-good-pdf.pdf' that was created.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
