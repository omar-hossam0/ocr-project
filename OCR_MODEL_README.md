# نظام OCR المخصص - التعرف الضوئي على النصوص العربية

## 📋 نظرة عامة

نظام OCR متكامل للتعرف على النصوص العربية والإنجليزية من الصور وملفات PDF. يستخدم موديل مخصص من مجلد `model/` مع دعم كامل لإعادة تشكيل النصوص العربية.

### ✨ الميزات الرئيسية

- ✅ **التعرف على النصوص العربية والإنجليزية** باستخدام EasyOCR
- ✅ **إعادة تشكيل النصوص العربية** باستخدام موديل مخصص
- ✅ **دعم الكاميرا** للالتقاط المباشر
- ✅ **معالجة PDF** متعدد الصفحات
- ✅ **تصدير متعدد الصيغ** (PDF, TXT, PNG)
- ✅ **تكامل مع قاعدة البيانات** (Firestore)
- ✅ **دعم GPU** لتسريع المعالجة
- ✅ **واجهة ويب حديثة** مع Next.js

---

## 🚀 البدء السريع

### 1. التثبيت

```bash
# تثبيت مكتبات Python
npm run ocr:setup

# أو يدوياً
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements_ocr.txt
```

### 2. الاختبار

```bash
# اختبار شامل
npm run ocr:integration

# اختبار الموديل فقط
npm run ocr:test
```

### 3. التشغيل

```bash
# تشغيل التطبيق
npm run dev

# فتح المتصفح
# http://localhost:3000/upload
```

---

## 📁 بنية المشروع

```
project/
├── model/                          # الموديل المخصص
│   ├── arabic_reshaper.py         # محرك إعادة التشكيل
│   ├── letters.py                 # تعريفات الحروف
│   ├── ligatures.py               # الحروف المتصلة
│   ├── reshaper_config.py         # إعدادات التشكيل
│   └── ocr_config.py              # إعدادات OCR
│
├── scripts/                        # سكريبتات Python
│   ├── ocr_runner.py              # السكريبت الرئيسي
│   ├── setup_ocr.py               # سكريبت الإعداد
│   ├── test_ocr.py                # اختبارات الموديل
│   └── integration_test.py        # اختبارات التكامل
│
├── app/                            # تطبيق Next.js
│   ├── (app)/upload/              # صفحة الرفع
│   │   └── page.tsx               # واجهة الرفع والكاميرا
│   └── api/                       # API Routes
│       ├── ocr/route.ts           # معالجة OCR
│       ├── files/route.ts         # إدارة الملفات
│       └── upload/route.ts        # رفع S3
│
├── requirements_ocr.txt            # مكتبات Python
├── .env.ocr.example               # إعدادات البيئة
├── OCR_SETUP_GUIDE.md             # دليل الإعداد الكامل
├── QUICK_START_OCR.md             # البدء السريع
└── API_DOCUMENTATION.md           # توثيق API
```

---

## 🔧 كيفية عمل النظام

### 1. معالجة الصور

```python
# قراءة الصورة
image = cv2.imread(image_path)

# معالجة مسبقة
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
thresh = cv2.adaptiveThreshold(denoised, 255, ...)

# تشغيل OCR
reader = easyocr.Reader(['ar', 'en'], gpu=True)
results = reader.readtext(processed, detail=0, paragraph=True)

# إعادة تشكيل النص العربي
from arabic_reshaper import reshape
reshaped_text = reshape(raw_text)
```

### 2. معالجة PDF

```python
# فتح PDF
pdf = pdfium.PdfDocument(pdf_path)

# معالجة كل صفحة
for page_num in range(len(pdf)):
    page = pdf[page_num]
    bitmap = page.render(scale=300/72)  # 300 DPI
    
    # تحويل إلى صورة
    image_array = convert_to_array(bitmap)
    
    # تشغيل OCR
    results = reader.readtext(image_array)
    
    # إعادة تشكيل
    reshaped = reshape(page_text)
```

### 3. التكامل مع الواجهة

```typescript
// رفع ملف ومعالجة OCR
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/ocr', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  setOcrResult(result.data.text);
  setOcrEngine(result.data.engine);
}
```

---

## 📸 استخدام الكاميرا

### في الواجهة

1. اضغط على زر **"Scan"**
2. امنح إذن الوصول للكاميرا
3. وجه الكاميرا نحو المستند
4. اضغط **"Capture & Use"**
5. سيتم تشغيل OCR تلقائياً

### الكود

```typescript
// فتح الكاميرا
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: "environment" } }
});

// التقاط صورة
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0);

// تحويل إلى ملف
const blob = await canvas.toBlob();
const file = new File([blob], 'camera_capture.jpg');

// معالجة OCR
await queueOcrWithPersistence(file);
```

---

## 💾 التكامل مع قاعدة البيانات

### حفظ البيانات

```typescript
const metadata = {
  name: fileName,
  location: location,
  department: department,
  ocrText: extractedText,  // من الموديل
  tags: tags.split(','),
  uploadedAt: new Date(),
  status: "available"
};

await fetch('/api/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(metadata)
});
```

### البحث في النصوص

```typescript
const response = await fetch(`/api/search?q=${searchQuery}`);
const results = await response.json();

// النتائج تحتوي على:
// - النص المستخرج من OCR
// - معلومات الملف
// - درجة الصلة
```

---

## ⚙️ الإعدادات

### ملف `.env.local`

```bash
# Python path (اختياري)
OCR_PYTHON_PATH=.venv/Scripts/python.exe

# Timeout
OCR_PROCESS_TIMEOUT_MS=300000

# Fallback options
OCR_LOCAL_FALLBACK=1
OCR_JS_FALLBACK=1

# Languages
OCR_JS_LANGS=ara+eng

# GPU (يتم الكشف تلقائياً)
# CUDA_VISIBLE_DEVICES=0
```

### ملف `model/ocr_config.py`

```python
MODEL_CONFIG = {
    "languages": ["ar", "en"],
    "use_gpu": True,
    "preprocessing": {
        "denoise": True,
        "adaptive_threshold": True,
    },
    "pdf_config": {
        "dpi": 300,
    },
    "arabic_reshaper": {
        "delete_harakat": False,
        "support_ligatures": True,
    }
}
```

---

## 🎯 الأوامر المتاحة

```bash
# الإعداد والتثبيت
npm run ocr:setup              # إعداد البيئة وتثبيت المكتبات

# الاختبار
npm run ocr:test               # اختبار الموديل
npm run ocr:integration        # اختبار التكامل الكامل

# المعالجة
npm run ocr:run <file>         # معالجة ملف محدد

# التطوير
npm run dev                    # تشغيل التطبيق
npm run dev:web                # تشغيل الواجهة فقط
npm run dev:backend            # تشغيل Backend فقط
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Missing required dependencies"

```bash
# الحل
pip install -r requirements_ocr.txt
```

### المشكلة: "Python executable not found"

```bash
# أضف في .env.local
OCR_PYTHON_PATH=.venv/Scripts/python.exe
```

### المشكلة: OCR بطيء جداً

```bash
# ثبت PyTorch مع CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### المشكلة: النص العربي يظهر بشكل خاطئ

```bash
# اختبر Arabic Reshaper
python -c "from model.arabic_reshaper import reshape; print(reshape('مرحبا'))"
```

### المشكلة: الكاميرا لا تعمل

- تأكد من منح إذن الوصول للكاميرا
- استخدم HTTPS أو localhost
- تحقق من عدم استخدام الكاميرا من تطبيق آخر

---

## 📊 الأداء

### معايير الأداء

| الجهاز | الصورة (1MB) | PDF (5 صفحات) |
|--------|-------------|---------------|
| GPU (CUDA) | ~2-3 ثانية | ~8-12 ثانية |
| CPU | ~10-15 ثانية | ~45-60 ثانية |
| Browser (tesseract.js) | ~15-20 ثانية | غير مدعوم |

### تحسين الأداء

1. **استخدم GPU**: أسرع 5-7 مرات من CPU
2. **صور عالية الدقة**: 300 DPI للنتائج الأفضل
3. **معالجة مسبقة**: تحسين الصورة قبل OCR
4. **Cache**: الموديل يتم تحميله مرة واحدة

---

## 📚 الموارد

### الوثائق

- [دليل الإعداد الكامل](OCR_SETUP_GUIDE.md)
- [البدء السريع](QUICK_START_OCR.md)
- [توثيق API](API_DOCUMENTATION.md)
- [نظرة عامة على Backend](BACKEND_OVERVIEW.md)

### المكتبات المستخدمة

- [EasyOCR](https://github.com/JaidedAI/EasyOCR) - محرك OCR
- [Arabic Reshaper](https://github.com/mpcabd/python-arabic-reshaper) - إعادة تشكيل العربية
- [OpenCV](https://opencv.org/) - معالجة الصور
- [PyPDFium2](https://github.com/pypdfium2-team/pypdfium2) - معالجة PDF
- [Next.js](https://nextjs.org/) - إطار الواجهة
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR في المتصفح

---

## 🤝 المساهمة

للمساهمة في تطوير النظام:

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

---

## 📝 الترخيص

هذا المشروع يستخدم:
- EasyOCR (Apache 2.0)
- Arabic Reshaper (MIT License)
- OpenCV (Apache 2.0)
- Next.js (MIT License)

---

## 📞 الدعم

للحصول على المساعدة:

1. راجع [دليل الإعداد](OCR_SETUP_GUIDE.md)
2. شغل الاختبارات: `npm run ocr:integration`
3. تحقق من logs في console
4. افتح issue على GitHub

---

## 🎉 شكر خاص

- فريق EasyOCR على المحرك الرائع
- مطوري Arabic Reshaper على دعم العربية
- مجتمع Open Source

---

**تم التطوير بواسطة:** فريق التطوير  
**آخر تحديث:** 2024  
**الإصدار:** 1.0.0
