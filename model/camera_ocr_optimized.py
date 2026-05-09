"""
Optimized Camera OCR Model for Web Integration
Fast Arabic and English text recognition with GPU acceleration
"""

import cv2
import numpy as np
import easyocr
import torch
import time
import logging
from pathlib import Path
from PIL import Image
from arabic_reshaper import reshape, get_display, is_arabic_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedCameraOCR:
    """Optimized OCR model for camera integration with web API"""
    
    def __init__(self, languages=['ar', 'en'], use_gpu=True):
        self.languages = languages
        self.use_gpu = use_gpu and torch.cuda.is_available()
        self.reader = None
        self.device = "cuda" if self.use_gpu else "cpu"
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize EasyOCR with optimized settings"""
        try:
            logger.info(f"Initializing OCR model on {self.device}")
            self.reader = easyocr.Reader(
                self.languages,
                gpu=self.use_gpu,
                detector=True,
                recognizer=True
            )
            logger.info("OCR model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OCR model: {e}")
            raise
    
    def preprocess_image(self, image):
        """Optimized image preprocessing for faster processing"""
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb = image
            
            # Convert to grayscale for processing
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY) if len(rgb.shape) == 3 else rgb
            
            # Apply adaptive threshold for better text detection
            processed = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            return processed
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return image
    
    def extract_text(self, image, confidence_threshold=0.5):
        """Extract text from image with optimized parameters"""
        if self.reader is None:
            raise RuntimeError("OCR model not initialized")
        
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image)
            
            # Extract text with optimized parameters
            results = self.reader.readtext(
                processed_image,
                detail=1,
                paragraph=False,  # Faster processing
                batch_size=1,
                workers=0,
                decoder="greedy",  # Faster than beamsearch
                beamWidth=1,
                contrast_ths=0.1,
                adjust_contrast=0.5,
                text_threshold=confidence_threshold,
                low_text=0.4,
                link_threshold=0.4
            )
            
            if not results:
                return {
                    "success": True,
                    "text": "",
                    "confidence": 0.0,
                    "detections": [],
                    "language_detected": "none"
                }
            
            # Sort results by position (top to bottom, right to left for Arabic)
            results.sort(key=lambda x: (x[0][0][1], -x[0][0][0]))
            
            # Extract text and calculate confidence
            texts = []
            confidences = []
            detections = []
            
            for bbox, text, confidence in results:
                if text.strip() and confidence >= confidence_threshold:
                    # Detect if text is Arabic
                    is_arabic = is_arabic_text(text)
                    
                    # Shape Arabic text if needed
                    if is_arabic:
                        try:
                            text = reshape(text)
                            text = get_display(text)
                        except:
                            pass  # Fallback to original text
                    
                    texts.append(text.strip())
                    confidences.append(confidence)
                    detections.append({
                        "text": text.strip(),
                        "confidence": confidence,
                        "bbox": bbox,
                        "is_arabic": is_arabic
                    })
            
            full_text = "\n".join(texts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            # Detect primary language
            arabic_ratio = sum(1 for d in detections if d["is_arabic"]) / len(detections) if detections else 0
            primary_lang = "arabic" if arabic_ratio > 0.3 else "english"
            
            return {
                "success": True,
                "text": full_text,
                "confidence": avg_confidence,
                "detections": detections,
                "language_detected": primary_lang,
                "arabic_ratio": arabic_ratio,
                "processing_time": time.time(),
                "device": self.device
            }
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0.0
            }
    
    def extract_from_path(self, image_path):
        """Extract text from image file path"""
        try:
            # Read image
            image = cv2.imread(str(image_path))
            if image is None:
                raise ValueError(f"Cannot read image: {image_path}")
            
            return self.extract_text(image)
        except Exception as e:
            logger.error(f"Failed to process image {image_path}: {e}")
            return {"success": False, "error": str(e)}
    
    def get_model_info(self):
        """Get model information"""
        return {
            "model": "OptimizedCameraOCR",
            "languages": self.languages,
            "device": self.device,
            "gpu_available": torch.cuda.is_available(),
            "model_loaded": self.reader is not None,
            "features": [
                "Fast Arabic and English recognition",
                "GPU acceleration support",
                "Optimized preprocessing",
                "Real-time processing",
                "Language detection"
            ]
        }

# Global model instance for caching
_model_instance = None

def get_model(languages=['ar', 'en'], use_gpu=True):
    """Get or create cached model instance"""
    global _model_instance
    if _model_instance is None:
        _model_instance = OptimizedCameraOCR(languages, use_gpu)
    return _model_instance

# API endpoint functions
def process_camera_capture(image_data, confidence_threshold=0.5):
    """Process camera capture for web API"""
    try:
        # Get model instance
        model = get_model()
        
        # Convert image data to numpy array
        if isinstance(image_data, bytes):
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(image_data, str):
            image = cv2.imread(image_data)
        else:
            image = image_data
        
        if image is None:
            return {"success": False, "error": "Invalid image data"}
        
        # Extract text
        result = model.extract_text(image, confidence_threshold)
        
        return result
        
    except Exception as e:
        logger.error(f"Camera capture processing failed: {e}")
        return {"success": False, "error": str(e)}

def health_check():
    """Health check for the OCR service"""
    try:
        model = get_model()
        info = model.get_model_info()
        return {
            "success": True,
            "status": "healthy",
            "model_info": info
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    # Test the model
    print("Testing Optimized Camera OCR...")
    
    # Initialize model
    model = get_model()
    
    # Print model info
    info = model.get_model_info()
    print(f"Model: {info['model']}")
    print(f"Device: {info['device']}")
    print(f"Languages: {info['languages']}")
    print(f"GPU Available: {info['gpu_available']}")
    print(f"Model Loaded: {info['model_loaded']}")
    
    print("Optimized Camera OCR is ready for use!")
