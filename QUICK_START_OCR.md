# البدء السريع - نظام OCR

## التثبيت السريع (5 دقائق)

### 1. تثبيت المكتبات

```bash
# تثبيت مكتبات Python
npm run ocr:setup

# أو يدوياً
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements_ocr.txt
```

### 2. اختبار الموديل

```bash
npm run ocr:test
```

### 3. تشغيل التطبيق

```bash
npm run dev
```

### 4. استخدام النظام

افتح المتصفح: `http://localhost:3000/upload`

## الميزات الرئيسية

✅ **التعرف على النصوص العربية والإنجليزية**
- يستخدم موديل مخصص من مجلد `model/`
- دعم كامل للحروف العربية المتصلة
- إعادة تشكيل النصوص بشكل صحيح

✅ **دعم الكاميرا**
- التقاط صور مباشرة من الكاميرا
- معالجة OCR فورية
- حفظ تلقائي في قاعدة البيانات

✅ **دعم صيغ متعددة**
- صور: JPG, PNG, BMP, TIFF, WebP
- مستندات: PDF (متعدد الصفحات)

✅ **تصدير النتائج**
- PDF: مستند نصي
- TXT: ملف نصي بسيط
- PNG: صورة تحتوي على النص

## الأوامر المفيدة

```bash
# إعداد البيئة
npm run ocr:setup

# اختبار الموديل
npm run ocr:test

# معالجة ملف محدد
npm run ocr:run path/to/file.jpg

# تشغيل التطبيق
npm run dev
```

## التحقق من التثبيت

```bash
# اختبار Python
python --version  # يجب أن يكون 3.8+

# اختبار المكتبات
python -c "import easyocr; print('✓ EasyOCR installed')"
python -c "import cv2; print('✓ OpenCV installed')"
python -c "from model.arabic_reshaper import reshape; print('✓ Model loaded')"

# اختبار GPU (اختياري)
python -c "import torch; print('GPU:', torch.cuda.is_available())"
```

## استكشاف الأخطاء السريع

### المشكلة: "Module not found"
```bash
pip install -r requirements_ocr.txt
```

### المشكلة: "Python not found"
```bash
# أضف في .env.local
OCR_PYTHON_PATH=.venv/Scripts/python.exe
```

### المشكلة: OCR بطيء
- استخدم GPU: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`
- أو قلل حجم الصور

## المزيد من التفاصيل

راجع `OCR_SETUP_GUIDE.md` للدليل الكامل
