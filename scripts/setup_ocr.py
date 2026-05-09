#!/usr/bin/env python3
"""
Setup script for OCR environment
Installs required dependencies and tests the OCR model
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a shell command and print status"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("✗ Python 3.8 or higher is required")
        return False
    
    print("✓ Python version is compatible")
    return True

def check_gpu_availability():
    """Check if CUDA GPU is available"""
    try:
        import torch
        if torch.cuda.is_available():
            print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
            print(f"  CUDA version: {torch.version.cuda}")
            return True
        else:
            print("⚠ No GPU detected, will use CPU (slower)")
            return False
    except ImportError:
        print("⚠ PyTorch not installed yet, will check after installation")
        return False

def test_ocr_model():
    """Test the OCR model with a simple example"""
    print(f"\n{'='*60}")
    print("Testing OCR Model")
    print(f"{'='*60}")
    
    try:
        # Add model directory to path
        model_dir = Path(__file__).parent.parent / "model"
        sys.path.insert(0, str(model_dir))
        
        from arabic_reshaper import reshape
        
        # Test Arabic reshaping
        test_text = "مرحبا بك في نظام OCR"
        reshaped = reshape(test_text)
        
        print(f"Original: {test_text}")
        print(f"Reshaped: {reshaped}")
        print("✓ Arabic reshaper is working correctly")
        
        # Test EasyOCR import
        import easyocr
        print("✓ EasyOCR is installed")
        
        # Test OpenCV
        import cv2
        print(f"✓ OpenCV is installed (version: {cv2.__version__})")
        
        # Test PIL
        from PIL import Image
        print("✓ Pillow is installed")
        
        # Test pypdfium2
        import pypdfium2
        print("✓ pypdfium2 is installed")
        
        print("\n✓ All OCR dependencies are working correctly!")
        return True
        
    except Exception as e:
        print(f"✗ OCR model test failed: {e}")
        return False

def main():
    """Main setup process"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║         OCR Model Setup - Arabic Text Recognition         ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Step 1: Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Step 2: Check for virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
    )
    
    if not in_venv:
        print("\n⚠ Warning: Not running in a virtual environment")
        print("  It's recommended to use a virtual environment:")
        print("  python -m venv .venv")
        print("  .venv\\Scripts\\activate  (Windows)")
        print("  source .venv/bin/activate  (Linux/Mac)")
        
        response = input("\nContinue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    else:
        print("✓ Running in virtual environment")
    
    # Step 3: Upgrade pip
    run_command(
        f"{sys.executable} -m pip install --upgrade pip",
        "Upgrading pip"
    )
    
    # Step 4: Install requirements
    requirements_file = Path(__file__).parent.parent / "requirements_ocr.txt"
    
    if not requirements_file.exists():
        print(f"✗ Requirements file not found: {requirements_file}")
        sys.exit(1)
    
    success = run_command(
        f"{sys.executable} -m pip install -r {requirements_file}",
        "Installing OCR dependencies"
    )
    
    if not success:
        print("\n✗ Failed to install dependencies")
        sys.exit(1)
    
    # Step 5: Check GPU availability
    check_gpu_availability()
    
    # Step 6: Test the OCR model
    if test_ocr_model():
        print(f"\n{'='*60}")
        print("✓ OCR Setup Complete!")
        print(f"{'='*60}")
        print("\nYou can now use the OCR model:")
        print("  python scripts/ocr_runner.py <image_or_pdf_path>")
        print("\nOr start the web application:")
        print("  npm run dev")
    else:
        print("\n✗ OCR setup completed but tests failed")
        print("Please check the error messages above")
        sys.exit(1)

if __name__ == "__main__":
    main()
