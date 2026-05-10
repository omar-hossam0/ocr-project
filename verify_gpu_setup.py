import torch
import sys

print("=" * 60)
print("GPU/CUDA Verification Report")
print("=" * 60)

print(f"PyTorch Version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA Version: {torch.version.cuda}")
    print(f"GPU Device: {torch.cuda.get_device_name(0)}")
    print(f"GPU Count: {torch.cuda.device_count()}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
else:
    print("CUDA Version: Not Available")
    print("WARNING: GPU not available - OCR will run on CPU (slower)")

print()
print("=" * 60)
print("Testing EasyOCR...")
print("=" * 60)

try:
    import easyocr
    print(f"EasyOCR Version: {easyocr.__version__ if hasattr(easyocr, '__version__') else 'Unknown'}")
    
    gpu_available = torch.cuda.is_available()
    print(f"Initializing EasyOCR on {'GPU' if gpu_available else 'CPU'}...")
    
    # Small test reader
    reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=False)
    print(f"✅ EasyOCR initialized successfully on {'GPU (CUDA)' if gpu_available else 'CPU'}")
    
except Exception as e:
    print(f"❌ Error initializing EasyOCR: {e}")
    sys.exit(1)

print()
print("=" * 60)
print("✅ All checks passed!")
print("=" * 60)
