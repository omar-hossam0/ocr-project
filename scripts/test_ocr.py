#!/usr/bin/env python3
"""
Test script for OCR model
Creates a test image with Arabic and English text and runs OCR on it
"""

import sys
import os
import json
from pathlib import Path
import tempfile

# Add model directory to path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def create_test_image():
    """Create a test image with Arabic and English text"""
    if not HAS_PIL:
        print("Error: Pillow is required to create test image")
        return None
    
    # Create a white image
    width, height = 800, 400
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # Try to use a font that supports Arabic
    try:
        # Try to find Arial or another font that supports Arabic
        font_size = 40
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except:
                # Fallback to default font
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Add text to image
    texts = [
        "مرحبا بك في نظام OCR",
        "Welcome to OCR System",
        "التعرف الضوئي على الحروف",
        "Optical Character Recognition",
        "نص عربي وإنجليزي معاً",
        "Arabic and English text together"
    ]
    
    y_position = 50
    for text in texts:
        draw.text((50, y_position), text, fill='black', font=font)
        y_position += 60
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
    image.save(temp_file.name)
    temp_file.close()
    
    return temp_file.name

def test_arabic_reshaper():
    """Test the Arabic reshaper from our model"""
    print("\n" + "="*60)
    print("Testing Arabic Reshaper")
    print("="*60)
    
    try:
        from arabic_reshaper import reshape
        
        test_cases = [
            "مرحبا",
            "السلام عليكم",
            "نظام التعرف الضوئي",
            "Hello مرحبا",
            "123 عربي English"
        ]
        
        print("\nReshaping test cases:")
        for text in test_cases:
            reshaped = reshape(text)
            print(f"  Original: {text}")
            print(f"  Reshaped: {reshaped}")
            print()
        
        print("✓ Arabic reshaper is working correctly")
        return True
        
    except Exception as e:
        print(f"✗ Arabic reshaper test failed: {e}")
        return False

def test_ocr_runner(test_image_path):
    """Test the OCR runner script"""
    print("\n" + "="*60)
    print("Testing OCR Runner")
    print("="*60)
    
    try:
        import subprocess
        
        # Get the ocr_runner.py path
        ocr_runner = Path(__file__).parent / "ocr_runner.py"
        
        if not ocr_runner.exists():
            print(f"✗ OCR runner not found: {ocr_runner}")
            return False
        
        # Run OCR on test image
        print(f"\nRunning OCR on test image: {test_image_path}")
        
        result = subprocess.run(
            [sys.executable, str(ocr_runner), test_image_path],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        print("\nOCR Runner Output:")
        print("-" * 60)
        
        if result.stderr:
            print("STDERR:", result.stderr)
        
        if result.stdout:
            try:
                output = json.loads(result.stdout)
                print(json.dumps(output, indent=2, ensure_ascii=False))
                
                if output.get("success"):
                    print("\n✓ OCR processing successful!")
                    print(f"\nExtracted text ({len(output.get('text', ''))} characters):")
                    print("-" * 60)
                    print(output.get('text', ''))
                    print("-" * 60)
                    return True
                else:
                    print(f"\n✗ OCR processing failed: {output.get('error')}")
                    return False
                    
            except json.JSONDecodeError:
                print("Raw output:", result.stdout)
                print("\n✗ Failed to parse OCR output as JSON")
                return False
        else:
            print("✗ No output from OCR runner")
            return False
            
    except subprocess.TimeoutExpired:
        print("✗ OCR runner timed out (>120s)")
        return False
    except Exception as e:
        print(f"✗ OCR runner test failed: {e}")
        return False

def test_dependencies():
    """Test if all required dependencies are installed"""
    print("\n" + "="*60)
    print("Checking Dependencies")
    print("="*60)
    
    dependencies = {
        "easyocr": "EasyOCR",
        "cv2": "OpenCV",
        "PIL": "Pillow",
        "pypdfium2": "pypdfium2",
        "torch": "PyTorch"
    }
    
    all_installed = True
    
    for module, name in dependencies.items():
        try:
            __import__(module)
            print(f"✓ {name} is installed")
        except ImportError:
            print(f"✗ {name} is NOT installed")
            all_installed = False
    
    # Check GPU availability
    try:
        import torch
        if torch.cuda.is_available():
            print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print("⚠ No GPU detected, will use CPU")
    except:
        pass
    
    return all_installed

def main():
    """Main test function"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║              OCR Model Test Suite                          ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Test 1: Check dependencies
    if not test_dependencies():
        print("\n✗ Some dependencies are missing. Run: python scripts/setup_ocr.py")
        sys.exit(1)
    
    # Test 2: Test Arabic reshaper
    if not test_arabic_reshaper():
        print("\n✗ Arabic reshaper test failed")
        sys.exit(1)
    
    # Test 3: Create test image
    print("\n" + "="*60)
    print("Creating Test Image")
    print("="*60)
    
    test_image = create_test_image()
    if not test_image:
        print("⚠ Could not create test image, skipping OCR test")
        print("  Install Pillow to enable test image creation")
    else:
        print(f"✓ Test image created: {test_image}")
        
        # Test 4: Run OCR on test image
        try:
            if test_ocr_runner(test_image):
                print("\n" + "="*60)
                print("✓ All Tests Passed!")
                print("="*60)
            else:
                print("\n✗ OCR runner test failed")
                sys.exit(1)
        finally:
            # Clean up test image
            try:
                os.unlink(test_image)
                print(f"\nCleaned up test image: {test_image}")
            except:
                pass
    
    print("\n✓ OCR model is ready to use!")
    print("\nNext steps:")
    print("  1. Start the web application: npm run dev")
    print("  2. Go to /upload page")
    print("  3. Upload an image or PDF to test OCR")

if __name__ == "__main__":
    main()
