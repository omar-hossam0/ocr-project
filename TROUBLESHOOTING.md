# 🔧 حل المشاكل الشائعة

## ❌ المشكلة: "attempted relative import with no known parent package"

### السبب
Python لا يستطيع استيراد الموديل من مجلد `model/`.

### الحل

#### الحل 1: استخدام Browser OCR (موصى به للتطوير)

لا تحتاج Python! النظام سيستخدم tesseract.js في المتصفح.

```bash
# فقط شغل التطبيق
npm run dev
```

**ملاحظة**: المرة الأولى ستأخذ 2-3 دقائق لتحميل الموديل.  
شغل warmup لتسريعها:

```bash
npm run ocr:warmup-tess
```

#### الحل 2: إصلاح Python OCR

```bash
# 1. تأكد من تثبيت المكتبات
npm run ocr:setup

# 2. اختبر
npm run ocr:test

# 3. إذا فشل، أعد تثبيت
.venv\Scripts\activate
pip install -r requirements_ocr.txt
```

---

## ❌ المشكلة: "Failed to upload to S3"

### السبب
AWS S3 غير مُعد أو الإعدادات خاطئة.

### الحل

**S3 اختياري!** النظام يعمل بدونه.

#### الخيار 1: تجاهل S3 (موصى به للتطوير)

لا تفعل شيء! الملفات ستُحفظ في MongoDB فقط.

#### الخيار 2: إعداد S3

إذا تريد استخدام S3:

1. أنشئ حساب AWS
2. أنشئ S3 Bucket
3. احصل على Access Keys
4. أضف في `.env.local`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=your_bucket_name
```

---

## ❌ المشكلة: OCR بطيء جداً (3+ دقائق)

### الحل السريع

```bash
# شغل هذا الأمر مرة واحدة
npm run ocr:warmup-tess
```

انتظر 2-3 دقائق. بعدها OCR سيكون أسرع (10-20 ثانية).

### حلول إضافية

راجع: **[OCR_PERFORMANCE_TIPS.md](OCR_PERFORMANCE_TIPS.md)**

---

## ❌ المشكلة: "MONGODB_URI is required"

### الحل

```bash
# 1. أنشئ backend/.env
copy backend\.env.example backend\.env

# 2. عدل backend/.env وضع:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

راجع: **[SETUP_MONGODB.md](SETUP_MONGODB.md)**

---

## ❌ المشكلة: "Cannot find module"

### الحل

```bash
# أعد تثبيت المكتبات
npm install

# Backend
cd backend
npm install
cd ..

# Python
npm run ocr:setup
```

---

## ❌ المشكلة: الكاميرا لا تعمل

### الحل

1. **امنح إذن الكاميرا** في المتصفح
2. **استخدم HTTPS أو localhost**
3. **تأكد من عدم استخدام الكاميرا** من تطبيق آخر
4. **جرب متصفح آخر** (Chrome موصى به)

---

## ❌ المشكلة: "mongodb: false" في health check

### الحل

```bash
# 1. تحقق من Connection String في backend/.env
# 2. تحقق من Network Access في MongoDB Atlas
# 3. تحقق من اتصال الإنترنت
```

راجع: **[SETUP_MONGODB.md](SETUP_MONGODB.md)**

---

## ❌ المشكلة: النص العربي يظهر بشكل خاطئ

### الحل

النظام يستخدم `arabic_reshaper` تلقائياً.

إذا لا زال خاطئ:

```bash
# اختبر Arabic Reshaper
python -c "from model.arabic_reshaper import reshape; print(reshape('مرحبا'))"
```

---

## ❌ المشكلة: "Port already in use"

### الحل

```bash
# إيقاف العملية على Port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

## 🔍 تشخيص عام

### 1. تحقق من Logs

افتح Console في المتصفح (F12) وشوف الأخطاء.

### 2. اختبر Backend

```bash
npm run dev:backend
```

افتح: http://localhost:4000/api/health

### 3. اختبر OCR

```bash
npm run ocr:test
```

### 4. اختبر MongoDB

```bash
# في backend/.env تأكد من MONGODB_URI
# ثم شغل Backend واختبر health endpoint
```

---

## 📞 الحصول على المساعدة

إذا لا زالت المشكلة موجودة:

1. راجع الوثائق:
   - [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)
   - [SETUP_MONGODB.md](SETUP_MONGODB.md)
   - [OCR_PERFORMANCE_TIPS.md](OCR_PERFORMANCE_TIPS.md)

2. شغل الاختبارات:
   ```bash
   npm run ocr:integration
   ```

3. تحقق من logs في console

---

## ✅ الإعداد الموصى به للتطوير

```bash
# 1. إعداد MongoDB (مرة واحدة)
# راجع: SETUP_MONGODB.md

# 2. تثبيت المكتبات
npm install

# 3. Warmup OCR (مرة واحدة)
npm run ocr:warmup-tess

# 4. تشغيل
npm run dev
```

**لا تحتاج**:
- ❌ Python OCR (Browser OCR كافي)
- ❌ AWS S3 (MongoDB كافي)
- ❌ GPU (CPU كافي للتطوير)

---

**ملاحظة**: معظم المشاكل تُحل بإعادة تثبيت المكتبات أو تشغيل warmup! 🚀
