# 🚀 نصائح لتسريع OCR

## المشكلة: OCR بطيء (3+ دقائق)

إذا كان OCR يأخذ وقت طويل، إليك الحلول:

---

## ✅ الحل 1: تحميل مسبق للموديل (Warmup)

### للمرة الأولى فقط

```bash
# تحميل ملفات اللغة مسبقاً
npm run ocr:warmup-tess
```

هذا سيحمل ملفات اللغة العربية والإنجليزية مرة واحدة.  
بعدها، OCR سيكون أسرع بكثير (10-20 ثانية بدلاً من 3 دقائق).

---

## ✅ الحل 2: استخدام Python OCR (أسرع)

### إعداد Python OCR

```bash
# 1. تثبيت المكتبات
npm run ocr:setup

# 2. تفعيل Virtual Environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# 3. اختبار
npm run ocr:test
```

### تفعيل Python OCR

عدل `.env.local`:

```bash
# تفعيل Python OCR
OCR_LOCAL_FALLBACK=1

# مسار Python
OCR_PYTHON_PATH=.venv/Scripts/python.exe  # Windows
# OCR_PYTHON_PATH=.venv/bin/python  # Linux/Mac
```

**النتيجة**: OCR سيستخدم Python (أسرع 5-10x من المتصفح)

---

## ✅ الحل 3: استخدام GPU (الأسرع)

### تثبيت PyTorch مع CUDA

```bash
# تفعيل Virtual Environment
.venv\Scripts\activate

# تثبيت PyTorch مع GPU
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**النتيجة**: OCR سيستخدم GPU (أسرع 5-7x من CPU)

**متطلبات**:
- كرت شاشة NVIDIA
- CUDA مثبت

---

## ✅ الحل 4: تقليل حجم الصور

### قبل الرفع

- استخدم صور أصغر (< 2 MB)
- دقة 300 DPI كافية
- تجنب الصور الضخمة (> 5 MB)

### في الكود

الكود الحالي يدعم تقليل الحجم تلقائياً.

---

## ✅ الحل 5: استخدام OCR Service منفصل

### للإنتاج (Production)

شغل OCR كـ service منفصل:

```bash
# في terminal منفصل
python scripts/ocr_service.py
```

ثم عدل `.env.local`:

```bash
OCR_SERVICE_URL=http://localhost:8088
OCR_SERVICE_ENDPOINT=/ocr
```

**النتيجة**: OCR service يبقى شغال ومحمل الموديل، فيكون أسرع.

---

## 📊 مقارنة الأداء

| الطريقة | أول مرة | المرات التالية | الدقة |
|---------|---------|----------------|-------|
| Browser OCR (tesseract.js) | 3-5 دقائق | 15-20 ثانية | 85% |
| Browser OCR + Warmup | 15-20 ثانية | 10-15 ثانية | 85% |
| Python OCR (CPU) | 30-40 ثانية | 10-15 ثانية | 95% |
| Python OCR (GPU) | 10-15 ثانية | 2-3 ثواني | 95% |
| OCR Service | 2-3 ثواني | 2-3 ثواني | 95% |

---

## 🎯 التوصيات

### للتطوير (Development)

```bash
# 1. شغل warmup مرة واحدة
npm run ocr:warmup-tess

# 2. استخدم Browser OCR (بسيط)
# لا تحتاج Python
```

### للإنتاج (Production)

```bash
# 1. ثبت Python OCR
npm run ocr:setup

# 2. فعّل GPU إذا متاح
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# 3. شغل OCR Service
python scripts/ocr_service.py
```

---

## 🔍 تشخيص المشكلة

### تحقق من السرعة الحالية

```bash
# اختبر OCR على صورة
npm run ocr:run path/to/test.jpg
```

سيطبع الوقت المستغرق.

### تحقق من استخدام GPU

```bash
# في Python
python -c "import torch; print('GPU:', torch.cuda.is_available())"
```

إذا كان `GPU: True` ✅ GPU متاح  
إذا كان `GPU: False` ❌ يستخدم CPU

---

## 💡 نصائح إضافية

### 1. Cache الموديل

الكود الحالي يحفظ الموديل في cache تلقائياً.  
المرة الأولى بطيئة، المرات التالية أسرع.

### 2. استخدم صور واضحة

- دقة عالية (300 DPI)
- إضاءة جيدة
- نص واضح

صور أفضل = OCR أسرع ودقة أعلى.

### 3. تجنب PDF الضخمة

- PDF كبير (> 50 صفحة) سيأخذ وقت طويل
- قسم PDF إلى ملفات أصغر

### 4. استخدم Progress Bar

الكود الحالي يعرض progress bar.  
المستخدم يرى التقدم ولا يظن أن النظام معلق.

---

## 🚀 الحل السريع (الآن)

إذا تريد حل فوري:

```bash
# شغل هذا الأمر مرة واحدة
npm run ocr:warmup-tess
```

انتظر حتى يكتمل (2-3 دقائق).  
بعدها، OCR سيكون أسرع بكثير!

---

## 📞 المساعدة

إذا لا زال OCR بطيء:

1. تحقق من logs في console (F12)
2. شغل `npm run ocr:test`
3. راجع هذا الملف مرة أخرى

---

**ملاحظة**: المرة الأولى دائماً بطيئة (تحميل الموديل).  
المرات التالية أسرع بكثير! ⚡
