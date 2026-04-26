import json
import os
import sys
from pathlib import Path

import numpy as np


_reader = None
_cv2 = None
_torch = None
_pdfium = None


def emit_json(payload: dict) -> None:
    """Print JSON safely on Windows terminals with legacy code pages."""
    print(json.dumps(payload, ensure_ascii=True))


def get_cv2():
    global _cv2
    if _cv2 is None:
        import cv2 as cv2_lib

        _cv2 = cv2_lib
    return _cv2


def get_torch():
    global _torch
    if _torch is None:
        import torch as torch_lib

        _torch = torch_lib
    return _torch


def get_pdfium():
    global _pdfium
    if _pdfium is None:
        import pypdfium2 as pdfium_lib

        _pdfium = pdfium_lib
    return _pdfium


def is_cuda_available() -> bool:
    try:
        return bool(get_torch().cuda.is_available())
    except Exception:
        return False


def get_reader():
    global _reader
    if _reader is None:
        import easyocr

        _reader = easyocr.Reader(
            ["ar", "en"],
            gpu=is_cuda_available(),
            verbose=False,
        )
    return _reader


def optimize_image_size(image_rgb: np.ndarray) -> np.ndarray:
    """Downscale huge images to EasyOCR-friendly size to reduce latency."""
    try:
        max_side = int(os.environ.get("OCR_MAX_IMAGE_SIDE", "2560"))
    except Exception:
        max_side = 2560

    if max_side <= 0:
        return image_rgb

    height, width = image_rgb.shape[:2]
    longest = max(height, width)
    if longest <= max_side:
        return image_rgb

    scale = max_side / float(longest)
    new_size = (max(1, int(round(width * scale))), max(1, int(round(height * scale))))
    cv2 = get_cv2()
    return cv2.resize(image_rgb, new_size, interpolation=cv2.INTER_AREA)


def ocr_image(image_rgb: np.ndarray) -> str:
    reader = get_reader()
    detections = reader.readtext(image_rgb, detail=1, paragraph=False)
    if not detections:
        return ""

    ordered = sorted(
        detections,
        key=lambda d: (
            (d[0][0][1] + d[0][2][1]) / 2.0,
            -((d[0][0][0] + d[0][2][0]) / 2.0),
        ),
    )

    lines = [str(item[1]).strip() for item in ordered if str(item[1]).strip()]
    return "\n".join(lines).strip()


def extract_pdf_text(page) -> str:
    """Extract machine text from a PDF page when available."""
    try:
        text_page = page.get_textpage()
        text = text_page.get_text_bounded().strip()
        text_page.close()
        return text
    except Exception:
        return ""


def ocr_from_image_path(file_path: Path) -> dict:
    cv2 = get_cv2()
    bgr = cv2.imread(str(file_path))
    if bgr is None:
        raise ValueError(f"Cannot read image file: {file_path}")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    optimized_rgb = optimize_image_size(rgb)
    text = ocr_image(optimized_rgb)
    return {
        "pages": [text],
        "text": text,
    }


def ocr_from_pdf_path(file_path: Path) -> dict:
    pdfium = get_pdfium()
    pdf = pdfium.PdfDocument(str(file_path))
    pages = []
    source = []

    for page_idx in range(len(pdf)):
        page = pdf[page_idx]

        # Fast path: for digital PDFs with embedded text, this avoids OCR latency.
        direct_text = extract_pdf_text(page)
        if len(direct_text) >= 20:
            pages.append(direct_text)
            source.append("pdf_text")
            continue

        # Fallback path: scanned pages without embedded text need vision OCR.
        bitmap = page.render(scale=2.0)
        pil_img = bitmap.to_pil()
        page_np = np.array(pil_img.convert("RGB"))
        pages.append(ocr_image(page_np))
        source.append("easyocr")

    text = "\n\n".join([p for p in pages if p.strip()]).strip()

    if source and all(item == "pdf_text" for item in source):
        engine = "pdf_text"
    elif source and any(item == "pdf_text" for item in source):
        engine = "pdf_text+easyocr"
    else:
        engine = "easyocr"

    return {
        "pages": pages,
        "text": text,
        "engine": engine,
        "page_count": len(pages),
    }


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        # Older Python or redirected streams may not support reconfigure.
        pass

    if len(sys.argv) >= 2 and sys.argv[1] == "--warmup":
        try:
            get_reader()
            emit_json(
                {
                    "success": True,
                    "mode": "warmup",
                    "engine": "easyocr",
                    "device": "cuda" if is_cuda_available() else "cpu",
                }
            )
            return 0
        except Exception as exc:
            emit_json({"error": str(exc)})
            return 1

    if len(sys.argv) < 2:
        emit_json({"error": "Usage: python ocr_runner.py <file_path> | --warmup"})
        return 1

    file_path = Path(sys.argv[1]).resolve()
    if not file_path.exists():
        emit_json({"error": f"File not found: {file_path}"})
        return 1

    suffix = file_path.suffix.lower()

    try:
        if suffix in {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}:
            result = ocr_from_image_path(file_path)
        elif suffix == ".pdf":
            result = ocr_from_pdf_path(file_path)
        else:
            emit_json(
                {
                    "error": "Unsupported file type for vision OCR. Supported: image files and PDF.",
                    "supported": [".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp", ".pdf"],
                }
            )
            return 2

        payload = {
            "success": True,
            "engine": result.get("engine", "easyocr"),
            "device": "cuda" if is_cuda_available() else "cpu",
            **result,
        }
        emit_json(payload)
        return 0
    except Exception as exc:
        emit_json({"error": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
