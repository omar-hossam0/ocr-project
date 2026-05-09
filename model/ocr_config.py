#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR Configuration for Custom Arabic Model
Provides configuration options for OCR processing
"""

import os
from pathlib import Path

# Model configuration
MODEL_CONFIG = {
    # Languages to use for OCR
    "languages": ["ar", "en"],
    
    # GPU configuration
    "use_gpu": True,  # Will fallback to CPU if GPU not available
    
    # Image preprocessing
    "preprocessing": {
        "denoise": True,
        "denoise_strength": 10,
        "adaptive_threshold": True,
        "threshold_block_size": 11,
        "threshold_constant": 2,
    },
    
    # OCR parameters
    "ocr_params": {
        "detail": 0,  # 0 = text only, 1 = text with bounding boxes
        "paragraph": True,  # Group text into paragraphs
        "batch_size": 1,
        "workers": 0,  # 0 = auto-detect
        "allowlist": None,  # None = all characters allowed
        "blocklist": None,  # Characters to ignore
        "decoder": "greedy",  # or "beamsearch"
        "beamWidth": 5,
        "contrast_ths": 0.1,
        "adjust_contrast": 0.5,
        "text_threshold": 0.7,
        "low_text": 0.4,
        "link_threshold": 0.4,
        "canvas_size": 2560,
        "mag_ratio": 1.0,
    },
    
    # PDF processing
    "pdf_config": {
        "dpi": 300,  # Resolution for PDF rendering
        "max_pages": None,  # None = process all pages
        "skip_blank_pages": True,
        "min_text_length": 10,  # Minimum characters to consider page as non-blank
    },
    
    # Arabic reshaper configuration
    "arabic_reshaper": {
        "delete_harakat": False,  # Keep diacritics
        "delete_tatweel": False,  # Keep tatweel (ـ)
        "support_zwj": True,  # Support zero-width joiner
        "shift_harakat_position": False,
        "support_ligatures": True,  # Enable ligatures
        "language": "Arabic",  # or "ArabicV2" or "Kurdish"
    },
    
    # Output configuration
    "output": {
        "include_confidence": False,
        "include_bounding_boxes": False,
        "format": "text",  # "text" or "json"
        "encoding": "utf-8",
    },
    
    # Performance tuning
    "performance": {
        "cache_model": True,  # Cache EasyOCR model in memory
        "timeout_seconds": 300,  # Maximum processing time
        "max_image_size": 10 * 1024 * 1024,  # 10MB
        "max_pdf_size": 50 * 1024 * 1024,  # 50MB
    }
}


def get_config():
    """
    Get OCR configuration with environment variable overrides
    """
    config = MODEL_CONFIG.copy()
    
    # Override with environment variables if set
    if os.getenv("OCR_USE_GPU") is not None:
        config["use_gpu"] = os.getenv("OCR_USE_GPU", "1") == "1"
    
    if os.getenv("OCR_PDF_DPI"):
        config["pdf_config"]["dpi"] = int(os.getenv("OCR_PDF_DPI"))
    
    if os.getenv("OCR_TIMEOUT"):
        config["performance"]["timeout_seconds"] = int(os.getenv("OCR_TIMEOUT"))
    
    if os.getenv("OCR_LANGUAGES"):
        langs = os.getenv("OCR_LANGUAGES").split(",")
        config["languages"] = [lang.strip() for lang in langs]
    
    return config


def get_model_path():
    """
    Get the path to the model directory
    """
    return Path(__file__).parent


def get_cache_dir():
    """
    Get the cache directory for EasyOCR models
    """
    cache_dir = os.getenv("EASYOCR_CACHE_DIR")
    if cache_dir:
        return Path(cache_dir)
    
    # Default cache directory
    return Path.home() / ".EasyOCR"


# Export configuration
__all__ = [
    "MODEL_CONFIG",
    "get_config",
    "get_model_path",
    "get_cache_dir",
]
