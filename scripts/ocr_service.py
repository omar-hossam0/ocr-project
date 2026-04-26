import os
from pathlib import Path
from tempfile import mkdtemp
import shutil

from fastapi import FastAPI, File, HTTPException, UploadFile
import uvicorn

from ocr_runner import is_cuda_available, get_reader, ocr_from_image_path, ocr_from_pdf_path

app = FastAPI(title="DocuMind OCR Service", version="1.0.0")

SUPPORTED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}


def resolve_suffix(filename: str, content_type: str) -> str:
    suffix = Path(filename or "").suffix.lower().strip()
    if suffix:
        return suffix

    mime_to_suffix = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
        "image/webp": ".webp",
    }
    return mime_to_suffix.get((content_type or "").lower(), ".bin")


@app.on_event("startup")
def warmup_model() -> None:
    if os.environ.get("OCR_WARMUP_ON_START", "1") != "1":
        return

    try:
        get_reader()
    except Exception as exc:
        print(f"[WARN] OCR warmup failed: {exc}")


@app.get("/health")
def health() -> dict:
    return {
        "success": True,
        "service": "ocr_service",
        "engine": "easyocr",
        "device": "cuda" if is_cuda_available() else "cpu",
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)) -> dict:
    suffix = resolve_suffix(file.filename or "", file.content_type or "")
    if suffix not in SUPPORTED_IMAGE_SUFFIXES and suffix != ".pdf":
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Unsupported file type for OCR",
                "supported": sorted(list(SUPPORTED_IMAGE_SUFFIXES | {'.pdf'})),
            },
        )

    temp_dir = Path(mkdtemp(prefix="ocr-service-"))
    temp_path = temp_dir / f"input{suffix}"

    try:
        payload = await file.read()
        if not payload:
            raise HTTPException(status_code=400, detail={"error": "Uploaded file is empty"})

        temp_path.write_bytes(payload)

        if suffix == ".pdf":
            result = ocr_from_pdf_path(temp_path)
        else:
            result = ocr_from_image_path(temp_path)

        return {
            "success": True,
            "data": {
                "success": True,
                "engine": result.get("engine", "easyocr"),
                "device": "cuda" if is_cuda_available() else "cpu",
                **result,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": str(exc)})
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    host = os.environ.get("OCR_SERVICE_HOST", "0.0.0.0")
    port = int(os.environ.get("OCR_SERVICE_PORT", "8088"))
    uvicorn.run("ocr_service:app", host=host, port=port, reload=False)
