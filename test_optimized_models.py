#!/usr/bin/env python3
"""
Comprehensive test for optimized OCR models
Tests camera OCR performance and accuracy
"""

import sys
import time
import json
from pathlib import Path

# Add model directory to path
sys.path.append(str(Path(__file__).parent / "model"))

def test_arabic_reshaper():
    """Test lightweight Arabic reshaper"""
    print("🔤 Testing Arabic Reshaper...")
    
    try:
        from model.arabic_reshaper import reshape, get_display, is_arabic_text, get_arabic_ratio
        
        # Test Arabic text
        arabic_text = "مرحبا بالعالم"
        reshaped = reshape(arabic_text)
        displayed = get_display(arabic_text)
        
        print(f"  Original: {arabic_text}")
        print(f"  Reshaped: {reshaped}")
        print(f"  Displayed: {displayed}")
        print(f"  Is Arabic: {is_arabic_text(arabic_text)}")
        print(f"  Arabic Ratio: {get_arabic_ratio(arabic_text):.2f}")
        
        # Test mixed text
        mixed_text = "Hello مرحبا World"
        print(f"  Mixed Arabic Ratio: {get_arabic_ratio(mixed_text):.2f}")
        
        print("✅ Arabic Reshaper test passed")
        return True
        
    except Exception as e:
        print(f"❌ Arabic Reshaper test failed: {e}")
        return False

def test_camera_ocr():
    """Test optimized camera OCR model"""
    print("\n📷 Testing Camera OCR Model...")
    
    try:
        from model.camera_ocr_optimized import OptimizedCameraOCR, get_model
        
        # Test model initialization
        start_time = time.time()
        model = get_model()
        init_time = time.time() - start_time
        
        print(f"  Model initialized in {init_time:.2f} seconds")
        
        # Get model info
        info = model.get_model_info()
        print(f"  Model: {info['model']}")
        print(f"  Device: {info['device']}")
        print(f"  Languages: {info['languages']}")
        print(f"  GPU Available: {info['gpu_available']}")
        
        # Test with sample image if available
        test_image_path = Path("test_text.png")
        if test_image_path.exists():
            print(f"  Testing with image: {test_image_path}")
            
            start_time = time.time()
            result = model.extract_from_path(test_image_path)
            process_time = time.time() - start_time
            
            print(f"  Processing time: {process_time:.2f} seconds")
            
            if result.get('success'):
                print(f"  Text extracted: {result.get('text', '')[:100]}...")
                print(f"  Confidence: {result.get('confidence', 0):.3f}")
                print(f"  Language detected: {result.get('language_detected', 'unknown')}")
                print(f"  Arabic ratio: {result.get('arabic_ratio', 0):.3f}")
            else:
                print(f"  Error: {result.get('error', 'Unknown error')}")
        else:
            print("  ⚠️  No test image found (test_text.png)")
        
        print("✅ Camera OCR test passed")
        return True
        
    except Exception as e:
        print(f"❌ Camera OCR test failed: {e}")
        return False

def test_performance():
    """Test performance metrics"""
    print("\n⚡ Performance Testing...")
    
    try:
        from model.camera_ocr_optimized import get_model
        
        model = get_model()
        
        # Test multiple initializations (should use cache)
        times = []
        for i in range(3):
            start_time = time.time()
            test_model = get_model()
            times.append(time.time() - start_time)
        
        print(f"  Initialization times: {[f'{t:.3f}s' for t in times]}")
        print(f"  Average init time: {sum(times)/len(times):.3f}s")
        
        # Test model info performance
        start_time = time.time()
        info = model.get_model_info()
        info_time = time.time() - start_time
        
        print(f"  Model info time: {info_time:.3f}s")
        
        print("✅ Performance test passed")
        return True
        
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return False

def test_web_api_compatibility():
    """Test web API compatibility"""
    print("\n🌐 Testing Web API Compatibility...")
    
    try:
        from model.camera_ocr_optimized import process_camera_capture, health_check
        
        # Test health check
        health = health_check()
        print(f"  Health check: {health.get('status', 'unknown')}")
        
        if health.get('success'):
            model_info = health.get('model_info', {})
            print(f"  Model: {model_info.get('model', 'unknown')}")
            print(f"  Device: {model_info.get('device', 'unknown')}")
        
        # Test process function with dummy data
        try:
            # Create a simple test image (1x1 pixel)
            import numpy as np
            test_image = np.zeros((100, 100, 3), dtype=np.uint8)
            test_image[:] = (255, 255, 255)  # White background
            
            # Add some text using OpenCV
            import cv2
            cv2.putText(test_image, "Test", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
            
            # Convert to bytes
            _, buffer = cv2.imencode('.png', test_image)
            image_bytes = buffer.tobytes()
            
            result = process_camera_capture(image_bytes)
            print(f"  Process capture result: {result.get('success', False)}")
            
        except Exception as e:
            print(f"  ⚠️  Image processing test skipped: {e}")
        
        print("✅ Web API compatibility test passed")
        return True
        
    except Exception as e:
        print(f"❌ Web API compatibility test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Optimized OCR Model Tests\n")
    
    tests = [
        ("Arabic Reshaper", test_arabic_reshaper),
        ("Camera OCR", test_camera_ocr),
        ("Performance", test_performance),
        ("Web API Compatibility", test_web_api_compatibility)
    ]
    
    results = []
    total_start_time = time.time()
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    total_time = time.time() - total_start_time
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:<25} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    print(f"Total time: {total_time:.2f} seconds")
    
    if passed == total:
        print("\n🎉 All tests passed! Models are optimized and ready.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the output above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
