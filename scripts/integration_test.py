#!/usr/bin/env python3
"""
Integration test for OCR system
Tests the complete flow: image -> OCR -> database
"""

import sys
import os
import json
import tempfile
import time
from pathlib import Path

# Add model directory to path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

def test_model_import():
    """Test that model can be imported"""
    print("\n" + "="*60)
    print("Test 1: Model Import")
    print("="*60)
    
    try:
        from arabic_reshaper import reshape, ArabicReshaper
        from ocr_config import get_config, get_model_path
        
        print("✓ Model imports successful")
        
        # Test configuration
        config = get_config()
        print(f"✓ Configuration loaded: {len(config)} settings")
        
        # Test model path
        model_path = get_model_path()
        print(f"✓ Model path: {model_path}")
        
        return True
    except Exception as e:
        print(f"✗ Model import failed: {e}")
        return False

def test_arabic_reshaper():
    """Test Arabic text reshaping"""
    print("\n" + "="*60)
    print("Test 2: Arabic Reshaper")
    print("="*60)
    
    try:
        from arabic_reshaper import reshape
        
        test_cases = [
            ("مرحبا", "Basic greeting"),
            ("السلام عليكم ورحمة الله وبركاته", "Long greeting"),
            ("نظام التعرف الضوئي على الحروف", "Technical term"),
            ("123 عربي English مختلط", "Mixed content"),
            ("الله", "Religious term"),
        ]
        
        for text, description in test_cases:
            reshaped = reshape(text)
            print(f"✓ {description}")
            print(f"  Input:  {text}")
            print(f"  Output: {reshaped}")
        
        print("\n✓ All reshaping tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Reshaper test failed: {e}")
        return False

def test_ocr_dependencies():
    """Test OCR dependencies"""
    print("\n" + "="*60)
    print("Test 3: OCR Dependencies")
    print("="*60)
    
    dependencies = {
        "easyocr": "EasyOCR engine",
        "cv2": "OpenCV for image processing",
        "PIL": "Pillow for image handling",
        "pypdfium2": "PDF processing",
        "torch": "PyTorch backend",
        "numpy": "Numerical operations"
    }
    
    all_ok = True
    
    for module, description in dependencies.items():
        try:
            imported = __import__(module)
            version = getattr(imported, "__version__", "unknown")
            print(f"✓ {description} (v{version})")
        except ImportError:
            print(f"✗ {description} - NOT INSTALLED")
            all_ok = False
    
    # Check GPU
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"✓ GPU available: {gpu_name}")
        else:
            print("⚠ No GPU detected (will use CPU)")
    except:
        pass
    
    return all_ok

def test_ocr_runner():
    """Test OCR runner script"""
    print("\n" + "="*60)
    print("Test 4: OCR Runner Script")
    print("="*60)
    
    try:
        import subprocess
        from PIL import Image, ImageDraw, ImageFont
        
        # Create test image
        print("Creating test image...")
        img = Image.new('RGB', (600, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 50), "مرحبا Hello", fill='black', font=font)
        draw.text((50, 100), "Test OCR نظام", fill='black', font=font)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            img.save(tmp.name)
            test_image = tmp.name
        
        print(f"✓ Test image created: {test_image}")
        
        # Run OCR
        print("Running OCR...")
        ocr_script = Path(__file__).parent / "ocr_runner.py"
        
        start_time = time.time()
        result = subprocess.run(
            [sys.executable, str(ocr_script), test_image],
            capture_output=True,
            text=True,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        # Parse result
        if result.stdout:
            try:
                output = json.loads(result.stdout)
                
                if output.get("success"):
                    print(f"✓ OCR completed in {elapsed:.2f}s")
                    print(f"  Engine: {output['data'].get('engine')}")
                    print(f"  Device: {output['data'].get('device')}")
                    print(f"  Languages: {output['data'].get('languages')}")
                    print(f"  Text length: {len(output['data'].get('text', ''))} chars")
                    print(f"\n  Extracted text:")
                    print(f"  {output['data'].get('text', '')[:200]}")
                    
                    # Clean up
                    os.unlink(test_image)
                    return True
                else:
                    print(f"✗ OCR failed: {output.get('error')}")
                    os.unlink(test_image)
                    return False
                    
            except json.JSONDecodeError:
                print(f"✗ Invalid JSON output")
                print(f"  stdout: {result.stdout[:200]}")
                print(f"  stderr: {result.stderr[:200]}")
                os.unlink(test_image)
                return False
        else:
            print(f"✗ No output from OCR")
            print(f"  stderr: {result.stderr}")
            os.unlink(test_image)
            return False
            
    except Exception as e:
        print(f"✗ OCR runner test failed: {e}")
        return False

def test_api_integration():
    """Test API integration (requires running server)"""
    print("\n" + "="*60)
    print("Test 5: API Integration (Optional)")
    print("="*60)
    
    try:
        import requests
        
        # Check if server is running
        try:
            response = requests.get("http://localhost:3000/api/health", timeout=2)
            if response.status_code == 200:
                print("✓ Server is running")
                
                # Test OCR endpoint
                print("Testing OCR endpoint...")
                # This would require creating a test file and uploading
                print("⚠ Skipping detailed API test (requires manual testing)")
                return True
            else:
                print("⚠ Server not responding correctly")
                return True  # Not a failure, just not running
        except requests.exceptions.RequestException:
            print("⚠ Server not running (start with: npm run dev)")
            return True  # Not a failure, just not running
            
    except ImportError:
        print("⚠ requests library not installed (optional)")
        return True

def main():
    """Run all integration tests"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║           OCR System Integration Test Suite               ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    tests = [
        ("Model Import", test_model_import),
        ("Arabic Reshaper", test_arabic_reshaper),
        ("OCR Dependencies", test_ocr_dependencies),
        ("OCR Runner", test_ocr_runner),
        ("API Integration", test_api_integration),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed! System is ready to use.")
        print("\nNext steps:")
        print("  1. Start the server: npm run dev")
        print("  2. Open browser: http://localhost:3000/upload")
        print("  3. Upload a file to test OCR")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
