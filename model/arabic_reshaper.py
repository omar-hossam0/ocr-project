"""
Lightweight Arabic text reshaper for OCR processing
Optimized for performance with minimal dependencies
"""

import re
from typing import Dict, List, Optional

class ArabicReshaper:
    """Lightweight Arabic text reshaper for proper display"""
    
    def __init__(self):
        # Basic Arabic character mapping for common shapes
        self.letters = {
            # Isolated, Initial, Medial, Final forms
            'أ': ('\uFE8D', '\uFE8D', '\uFE8E', '\uFE8E'),
            'إ': ('\uFE85', '\uFE85', '\uFE86', '\uFE86'),
            'آ': ('\uFE81', '\uFE81', '\uFE82', '\uFE82'),
            'ا': ('\uFE8E', '\uFE8E', '\uFE8E', '\uFE8E'),
            'ب': ('\uFE8F', '\uFE91', '\uFE92', '\uFE90'),
            'ت': ('\uFE97', '\uFE99', '\uFE9A', '\uFE98'),
            'ث': ('\uFE9B', '\uFE9D', '\uFE9E', '\uFE9C'),
            'ج': ('\uFE9F', '\uFEA1', '\uFEA2', '\uFEA0'),
            'ح': ('\uFEA3', '\uFEA5', '\uFEA6', '\uFEA4'),
            'خ': ('\uFEA7', '\uFEA9', '\uFEAA', '\uFEA8'),
            'د': ('\uFEA9', '\uFEA9', '\uFEA9', '\uFEAA'),
            'ذ': ('\uFEAB', '\uFEAB', '\uFEAB', '\uFEAC'),
            'ر': ('\uFEAD', '\uFEAD', '\uFEAD', '\uFEAE'),
            'ز': ('\uFEAF', '\uFEAF', '\uFEAF', '\uFEB0'),
            'س': ('\uFEB1', '\uFEB3', '\uFEB4', '\uFEB2'),
            'ش': ('\uFEB5', '\uFEB7', '\uFEB8', '\uFEB6'),
            'ص': ('\uFEB9', '\uFEBB', '\uFEBC', '\uFEBA'),
            'ض': ('\uFEBD', '\uFEBF', '\uFEC0', '\uFEBE'),
            'ط': ('\uFEC1', '\uFEC3', '\uFEC4', '\uFEC2'),
            'ظ': ('\uFEC5', '\uFEC7', '\uFEC8', '\uFEC6'),
            'ع': ('\uFEC9', '\uFECB', '\uFECC', '\uFECA'),
            'غ': ('\uFECD', '\uFECF', '\uFED0', '\uFECE'),
            'ف': ('\uFED1', '\uFED3', '\uFED4', '\uFED2'),
            'ق': ('\uFED5', '\uFED7', '\uFED8', '\uFED6'),
            'ك': ('\uFED9', '\uFEDB', '\uFEDC', '\uFEDA'),
            'ل': ('\uFEDD', '\uFEDF', '\uFEE0', '\uFEDE'),
            'م': ('\uFEE1', '\uFEE3', '\uFEE4', '\uFEE2'),
            'ن': ('\uFEE5', '\uFEE7', '\uFEE8', '\uFEE6'),
            'ه': ('\uFEE9', '\uFEEB', '\uFEEC', '\uFEEA'),
            'و': ('\uFEED', '\uFEED', '\uFEED', '\uFEEE'),
            'ي': ('\uFEF1', '\uFEF3', '\uFEF4', '\uFEF2'),
            'ى': ('\uFEF3', '\uFEF3', '\uFEF3', '\uFEF4'),
            'ة': ('\uFE93', '\uFE93', '\uFE94', '\uFE94'),
            'لا': ('\uFEF5', '\uFEF5', '\uFEF6', '\uFEF6'),
            'لأ': ('\uFEF7', '\uFEF7', '\uFEF8', '\uFEF8'),
            'لإ': ('\uFEF9', '\uFEF9', '\uFEFA', '\uFEFA'),
            'لآ': ('\uFEFB', '\uFEFB', '\uFEFC', '\uFEFC'),
        }
        
        # Non-connecting characters
        self.non_connecting = {
            'ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ى', 'ة'
        }
        
        # Punctuation and numbers
        self.punctuation = {
            '؟', '،', '؛', '：', '！', '؟', '،', '؛'
        }
    
    def is_arabic_char(self, char: str) -> bool:
        """Check if character is Arabic"""
        return '\u0600' <= char <= '\u06FF' or char in self.letters
    
    def get_char_form(self, char: str, prev_char: str, next_char: str) -> str:
        """Get correct form of Arabic character"""
        if char not in self.letters:
            return char
        
        # Non-connecting characters only have isolated/final forms
        if char in self.non_connecting:
            if prev_char and self.is_arabic_char(prev_char) and prev_char not in self.non_connecting:
                return self.letters[char][3]  # Final
            else:
                return self.letters[char][0]  # Isolated
        
        # Connecting characters
        prev_connects = prev_char and self.is_arabic_char(prev_char) and prev_char not in self.non_connecting
        next_connects = next_char and self.is_arabic_char(next_char) and next_char not in self.non_connecting
        
        if prev_connects and next_connects:
            return self.letters[char][2]  # Medial
        elif prev_connects:
            return self.letters[char][3]  # Final
        elif next_connects:
            return self.letters[char][1]  # Initial
        else:
            return self.letters[char][0]  # Isolated
    
    def reshape(self, text: str) -> str:
        """Reshape Arabic text for proper display"""
        if not text:
            return text
        
        # Check if text contains Arabic
        if not any(self.is_arabic_char(char) for char in text):
            return text
        
        result = []
        chars = list(text)
        
        for i, char in enumerate(chars):
            if self.is_arabic_char(char):
                prev_char = chars[i-1] if i > 0 else None
                next_char = chars[i+1] if i < len(chars)-1 else None
                reshaped_char = self.get_char_form(char, prev_char, next_char)
                result.append(reshaped_char)
            else:
                result.append(char)
        
        return ''.join(result)

# Global instance for caching
_reshaper_instance = None

def get_reshaper():
    """Get cached reshaper instance"""
    global _reshaper_instance
    if _reshaper_instance is None:
        _reshaper_instance = ArabicReshaper()
    return _reshaper_instance

def reshape(text: str) -> str:
    """Reshape Arabic text"""
    reshaper = get_reshaper()
    return reshaper.reshape(text)

def is_arabic_text(text: str) -> bool:
    """Check if text contains Arabic characters"""
    reshaper = get_reshaper()
    return any(reshaper.is_arabic_char(char) for char in text)

def get_arabic_ratio(text: str) -> float:
    """Get ratio of Arabic characters in text"""
    if not text:
        return 0.0
    
    reshaper = get_reshaper()
    arabic_chars = sum(1 for char in text if reshaper.is_arabic_char(char))
    total_chars = sum(1 for char in text if char.strip())
    
    return arabic_chars / total_chars if total_chars > 0 else 0.0

# Simple bidirectional text handling
def get_display(text: str) -> str:
    """Return Arabic text as-is — EasyOCR already provides correct RTL word order"""
    return text

# Default reshaper instance for backward compatibility
default_reshaper = get_reshaper()
