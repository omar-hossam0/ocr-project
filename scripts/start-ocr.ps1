# Start OCR warmup then OCR server (CPU-optimized) - PowerShell helper

param()

Write-Host "Activating virtual environment..."
if (Test-Path .\.venv\Scripts\Activate.ps1) {
    & .\.venv\Scripts\Activate.ps1
} else {
    Write-Host "Warning: virtual environment activate script not found. Ensure .venv exists." -ForegroundColor Yellow
}

Write-Host "Setting recommended environment variables for CPU-optimized OCR..."
$env:OCR_USE_GPU = "0"
$env:OCR_PDF_DPI = "200"
$env:EASYOCR_CACHE_DIR = "$env:USERPROFILE\\.EasyOCRCache"

Write-Host "Running warmup (loads EasyOCR models into memory)..."
python .\scripts\warmup_ocr.py

Write-Host "Starting OCR microservice (press Ctrl+C to stop)..."
python .\scripts\ocr_server.py
