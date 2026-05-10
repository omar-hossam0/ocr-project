#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick GPU Verification Script
تحقق سريع من وجود GPU و PyTorch
"""

import torch
import sys

print("\n" + "="*70)
print(" 🔍 OCR GPU VERIFICATION - تحقق من GPU")
print("="*70 + "\n")

# 1. PyTorch Version
print(f"📦 PyTorch Version: {torch.__version__}")

# 2. CUDA Status
cuda_available = torch.cuda.is_available()
print(f"💻 CUDA Available: {cuda_available}")

if cuda_available:
    print(f"🖥️  GPU Device: {torch.cuda.get_device_name(0)}")
    print(f"📊 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    print(f"✅ STATUS: GPU Ready - OCR will run FAST (5-10x faster)")
else:
    print(f"⚠️  GPU not available - OCR will run on CPU (slower)")
    print(f"💡 To enable GPU:")
    print(f"   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")

# 3. EasyOCR Test
print(f"\n📚 Testing EasyOCR...")
try:
    import easyocr
    reader = easyocr.Reader(['ar', 'en'], gpu=cuda_available, verbose=False)
    device = "GPU (CUDA)" if cuda_available else "CPU"
    print(f"✅ EasyOCR Ready on {device}")
except Exception as e:
    print(f"❌ EasyOCR Error: {e}")
    sys.exit(1)

print("\n" + "="*70)
if cuda_available:
    print(" ✅ All systems GO! GPU acceleration enabled.")
else:
    print(" ✅ All systems GO! Running on CPU (normal performance)")
print("="*70 + "\n")
