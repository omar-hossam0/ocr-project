# دليل إعداد نظام OCR - التعرف الضوئي على النصوص العربية

## نظرة عامة

هذا النظام يستخدم موديل OCR مخصص للتعرف على النصوص العربية والإنجليزية من الصور والملفات PDF. الموديل يستخدم:

- **EasyOCR**: محرك التعرف الضوئي الأساسي
- **Arabic Reshaper**: من مجلد `model` لإعادة تشكيل النصوص العربية بشكل صحيح
- **OpenCV**: لمعالجة الصور وتحسينها قبل OCR
- **PyPDFium2**: لمعالجة ملفات PDF

## المتطلبات

- Python 3.8 أو أحدث
- Node.js 18 أو أحدث
- (اختياري) GPU مع CUDA لتسريع المعالجة

## خطوات التثبيت

### 1. إنشاء بيئة افتراضية (Virtual Environment)

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

### 2. تثبيت مكتبات Python

```bash
# تثبيت تلقائي باستخدام سكريبت الإعداد
python scripts/setup_ocr.py

# أو تثبيت يدوي
pip install -r requirements_ocr.txt
```

### 3. تثبيت مكتبات Node.js

```bash
npm install
```

### 4. إعداد ملف البيئة

```bash
# نسخ ملف البيئة النموذجي
copy .env.ocr.example .env.local

# تعديل الإعدادات حسب الحاجة
```

### 5. اختبار الموديل

```bash
# اختبار شامل للموديل
python scripts/test_ocr.py

# اختبار على ملف محدد
python scripts/ocr_runner.py path/to/image.jpg
```

## استخدام النظام

### 1. تشغيل التطبيق

```bash
npm run dev
```

### 2. الوصول إلى صفحة الرفع

افتح المتصفح وانتقل إلى:
```
http://localhost:3000/upload
```

### 3. رفع الملفات

يمكنك:
- **سحب وإفلات** الملفات في منطقة الرفع
- **تصفح الملفات** من جهازك
- **استخدام الكاميرا** لالتقاط صورة مباشرة

### 4. معالجة OCR

بعد رفع الملف:
1. اضغط على زر **"Start OCR & Save"**
2. انتظر حتى تكتمل المعالجة
3. سيظهر النص المستخرج في الجانب الأيمن

### 5. تحميل النتائج

يمكنك تحميل النص المستخرج بصيغ متعددة:
- **PDF**: ملف PDF يحتوي على النص
- **TXT**: ملف نصي بسيط
- **PNG**: صورة تحتوي على النص

## بنية الموديل

```
model/
├── arabic_reshaper.py      # محرك إعادة تشكيل النصوص العربية
├── letters.py              # تعريفات الحروف العربية
├── ligatures.py            # الحروف المتصلة (Ligatures)
├── reshaper_config.py      # إعدادات إعادة التشكيل
└── __init__.py            # واجهة الموديل

scripts/
├── ocr_runner.py          # السكريبت الرئيسي لتشغيل OCR
├── setup_ocr.py           # سكريبت الإعداد والتثبيت
└── test_ocr.py            # سكريبت الاختبار

app/api/ocr/
└── route.ts               # API endpoint للـ OCR
```

## كيفية عمل الموديل

### 1. معالجة الصور

```python
# قراءة الصورة
image = cv2.imread(image_path)

# معالجة مسبقة (Preprocessing)
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
denoised = cv2.fastNlMeansDenoising(gray)
thresh = cv2.adaptiveThreshold(denoised, ...)

# تشغيل OCR
results = reader.readtext(processed, detail=0, paragraph=True)

# إعادة تشكيل النص العربي
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
    
    # تحويل إلى صورة ومعالجتها
    image_array = convert_to_array(bitmap)
    results = reader.readtext(image_array)
    
    # إعادة تشكيل النص
    reshaped = reshape(page_text)
```

### 3. إعادة تشكيل النصوص العربية

الموديل يستخدم `arabic_reshaper` من مجلد `model` لـ:
- تصحيح اتجاه الحروف العربية
- ربط الحروف المتصلة بشكل صحيح
- دعم الحركات (التشكيل)
- دعم الحروف الكردية

## التكامل مع الكاميرا

### استخدام الكاميرا في الواجهة

1. اضغط على زر **"Scan"**
2. امنح التطبيق إذن الوصول للكاميرا
3. وجه الكاميرا نحو المستند
4. اضغط على **"Capture & Use"**
5. سيتم تشغيل OCR تلقائياً على الصورة الملتقطة

### الكود الخاص بالكاميرا

```typescript
// فتح الكاميرا
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: "environment" } }
});

// التقاط صورة
canvas.getContext('2d').drawImage(video, 0, 0);
const blob = await canvas.toBlob();

// تشغيل OCR
await queueOcrWithPersistence(capturedFile);
```

## التكامل مع قاعدة البيانات

### حفظ البيانات في Firestore

```typescript
const metadataPayload = {
  name: fileName,
  originalName: file.name,
  location: location,
  department: department,
  tags: tags.split(','),
  ocrText: extractedText,  // النص المستخرج من الموديل
  fileSize: file.size,
  uploadedAt: new Date(),
  status: "available"
};

await fetch('/api/files', {
  method: 'POST',
  body: JSON.stringify(metadataPayload)
});
```

### استرجاع البيانات

```typescript
// البحث في النصوص المستخرجة
const response = await fetch('/api/search?q=' + searchQuery);
const results = await response.json();
```

## استكشاف الأخطاء

### المشكلة: "Missing required dependencies"

**الحل:**
```bash
pip install -r requirements_ocr.txt
```

### المشكلة: "Python executable not found"

**الحل:**
أضف مسار Python في `.env.local`:
```
OCR_PYTHON_PATH=.venv/Scripts/python.exe
```

### المشكلة: OCR بطيء جداً

**الحل:**
- تأكد من تثبيت PyTorch مع دعم CUDA للـ GPU
- أو قلل دقة الصور قبل المعالجة

### المشكلة: النص العربي يظهر بشكل خاطئ

**الحل:**
- تأكد من أن `arabic_reshaper` يعمل بشكل صحيح
- اختبر باستخدام: `python scripts/test_ocr.py`

### المشكلة: الكاميرا لا تعمل

**الحل:**
- تأكد من منح المتصفح إذن الوصول للكاميرا
- استخدم HTTPS أو localhost
- تحقق من أن الكاميرا غير مستخدمة من تطبيق آخر

## الأداء والتحسين

### استخدام GPU

لتسريع المعالجة، ثبت PyTorch مع دعم CUDA:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### تحسين جودة OCR

1. **استخدم صور عالية الدقة**: 300 DPI أو أعلى
2. **تأكد من وضوح النص**: تجنب الصور الضبابية
3. **استخدم إضاءة جيدة**: عند استخدام الكاميرا
4. **تجنب الميلان**: اجعل المستند مستقيماً

## API Reference

### POST /api/ocr

رفع ملف لمعالجة OCR

**Request:**
```typescript
const formData = new FormData();
formData.append('file', file);

fetch('/api/ocr', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "النص المستخرج...",
    "engine": "easyocr",
    "device": "cuda",
    "languages": ["ar", "en"],
    "model": "custom_arabic_reshaper"
  }
}
```

### POST /api/files

حفظ بيانات الملف في قاعدة البيانات

**Request:**
```json
{
  "name": "document.pdf",
  "location": "Cabinet A",
  "department": "Legal",
  "ocrText": "النص المستخرج...",
  "tags": ["contract", "legal"]
}
```

## الدعم والمساعدة

للمزيد من المساعدة:
1. راجع ملف `BACKEND_OVERVIEW.md`
2. شغل سكريبت الاختبار: `python scripts/test_ocr.py`
3. تحقق من logs في console

## الترخيص

هذا المشروع يستخدم:
- EasyOCR (Apache 2.0)
- Arabic Reshaper (MIT License)
- OpenCV (Apache 2.0)
