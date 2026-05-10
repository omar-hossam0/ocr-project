import sys
import os
sys.path.append('scripts')
from ocr_runner import process_pdf_with_easyocr
import easyocr

file_path = r"قضايا مجتمعية (متطلب جامعة).pdf"
print(f"Testing file: {file_path}")
print(f"File exists: {os.path.exists(file_path)}")

if os.path.exists(file_path):
    import torch
    gpu_available = torch.cuda.is_available()
    print(f"CUDA Available: {gpu_available}")
    reader = easyocr.Reader(['ar', 'en'], gpu=gpu_available, verbose=True)
    print(f"Running on: {'GPU (CUDA)' if gpu_available else 'CPU'}")
    result = process_pdf_with_easyocr(file_path, reader)
    print(f"Result: {result}")
else:
    print("File not found")
