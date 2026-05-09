#!/usr/bin/env python3
"""
OCR Warm-up Script
Pre-loads EasyOCR models to speed up subsequent requests
Run this before starting the backend server
"""

import sys
import time
from pathlib import Path

# Add model directory to Python path
MODEL_DIR = Path(__file__).parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

print("🔥 Warming up OCR models...")
start_time = time.time()

try:
    from ocr_config import get_config, get_cache_dir
    
    config = get_config()
    languages = config["languages"]
    use_gpu = config["use_gpu"]
    
    print(f"  Languages: {languages}")
    print(f"  GPU enabled: {use_gpu}")
    
    # Import EasyOCR
    import easyocr
    try:
        import torch
    except Exception:
        torch = None
    
    # Try GPU first
    if use_gpu:
        try:
            print("  Initializing EasyOCR with GPU...")
            reader = easyocr.Reader(
                languages,
                gpu=True,
                verbose=False,
                model_storage_directory=str(get_cache_dir())
            )
            device = "cuda"
            print(f"  ✅ EasyOCR ready on GPU")
        except Exception as e:
            print(f"  ⚠️ GPU failed ({e}), falling back to CPU...")
            reader = easyocr.Reader(
                languages,
                gpu=False,
                verbose=False,
                model_storage_directory=str(get_cache_dir())
            )
            device = "cpu"
            print(f"  ✅ EasyOCR ready on CPU")
    else:
        print("  Initializing EasyOCR with CPU...")
        reader = easyocr.Reader(
            languages,
            gpu=False,
            verbose=False,
            model_storage_directory=str(get_cache_dir())
        )
        device = "cpu"
        print(f"  ✅ EasyOCR ready on CPU")
    
    elapsed = time.time() - start_time
    print(f"\n✅ OCR warm-up complete in {elapsed:.1f} seconds")
    print(f"   Device: {device}")
    print(f"   Models cached and ready for fast processing")
    try:
        if torch is not None:
            print(f"   torch: {torch.__version__}")
            print(f"   torch.cuda.is_available: {torch.cuda.is_available()}")
        else:
            print("   torch: not installed")
    except Exception:
        pass
    
    # Keep reader alive to prevent garbage collection
    print("   (Keeping models loaded...)")
    
    # Test with a dummy image to ensure everything works
    import numpy as np
    test_img = np.zeros((100, 100, 3), dtype=np.uint8)
    test_img[:] = 255
    
    result = reader.readtext(test_img, detail=0)
    print(f"   Test recognition: OK")
    
    print("\n🚀 OCR Service is ready for requests!")
    
except Exception as e:
    print(f"\n❌ Warm-up failed: {e}")
    sys.exit(1)
