# 📘 دليل الإعداد الكامل - نظام OCR مع MongoDB

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية إعداد النظام الكامل من الصفر:
- ✅ Frontend (Next.js)
- ✅ Backend (Express + MongoDB)
- ✅ OCR Model (EasyOCR + Arabic Reshaper)
- ✅ Database (MongoDB Atlas)

---

## 📋 المتطلبات

قبل البدء، تأكد من تثبيت:

- **Node.js** v18+ ([تحميل](https://nodejs.org/))
- **Python** v3.8+ ([تحميل](https://www.python.org/downloads/))
- **Git** ([تحميل](https://git-scm.com/downloads))
- **حساب MongoDB Atlas** (مجاني) ([تسجيل](https://www.mongodb.com/cloud/atlas/register))

---

## 🚀 الإعداد الكامل

### الخطوة 1: تحميل المشروع

```bash
# إذا كان لديك المشروع بالفعل
cd ocr-project

# أو استنساخ من Git
git clone <repository-url>
cd ocr-project
```

### الخطوة 2: تثبيت Node.js Dependencies

```bash
# تثبيت مكتبات Frontend
npm install

# تثبيت مكتبات Backend
cd backend
npm install
cd ..
```

### الخطوة 3: إعداد MongoDB

#### أ. إنشاء قاعدة بيانات

1. اذهب إلى [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. سجل حساب جديد (مجاني)
3. أنشئ Cluster جديد (Free Tier - M0)
4. انتظر حتى يكتمل الإعداد (2-3 دقائق)

#### ب. إنشاء مستخدم

1. اذهب إلى **Database Access**
2. اضغط **Add New Database User**
3. أدخل:
   - Username: `ocruser`
   - Password: اختر كلمة مرور قوية
4. اختر Role: **Read and write to any database**
5. اضغط **Add User**

#### ج. السماح بالاتصال

1. اذهب إلى **Network Access**
2. اضغط **Add IP Address**
3. اختر **Allow Access from Anywhere** (للتطوير)
4. اضغط **Confirm**

#### د. الحصول على Connection String

1. اذهب إلى **Database**
2. اضغط **Connect** على الـ cluster
3. اختر **Connect your application**
4. انسخ Connection String

سيكون شكله:
```
mongodb+srv://ocruser:<password>@cluster0.xxxxx.mongodb.net/
```

#### هـ. إنشاء ملف البيئة

```bash
# إنشاء backend/.env من المثال
copy backend\.env.example backend\.env

# أو على Linux/Mac
cp backend/.env.example backend/.env
```

افتح `backend/.env` وعدل:

```bash
# استبدل <password> بكلمة المرور الفعلية
MONGODB_URI=mongodb+srv://ocruser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/

# اسم قاعدة البيانات
MONGODB_DB=ocr_system

# JWT Secret (غيره!)
JWT_SECRET=your-super-secret-key-change-this

# Port
PORT=4000

# CORS
CORS_ORIGIN=http://localhost:3000

# Admin User (اختياري)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
ADMIN_ROLE=Admin
```

### الخطوة 4: إعداد OCR Model

#### أ. إنشاء Virtual Environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

#### ب. تثبيت مكتبات Python

```bash
# تثبيت تلقائي (موصى به)
npm run ocr:setup

# أو يدوياً
pip install -r requirements_ocr.txt
```

سيقوم بتثبيت:
- EasyOCR (محرك OCR)
- OpenCV (معالجة الصور)
- PyPDFium2 (معالجة PDF)
- PyTorch (Deep Learning)
- وغيرها...

#### ج. إنشاء ملف البيئة للـ OCR (اختياري)

```bash
# إنشاء .env.local من المثال
copy .env.ocr.example .env.local

# أو على Linux/Mac
cp .env.ocr.example .env.local
```

عدل `.env.local` إذا لزم الأمر:

```bash
# مسار Python (اختياري)
OCR_PYTHON_PATH=.venv/Scripts/python.exe  # Windows
# OCR_PYTHON_PATH=.venv/bin/python  # Linux/Mac

# Timeout
OCR_PROCESS_TIMEOUT_MS=300000

# Fallback options
OCR_LOCAL_FALLBACK=1
OCR_JS_FALLBACK=1
OCR_JS_LANGS=ara+eng
```

### الخطوة 5: اختبار النظام

#### أ. اختبار MongoDB

```bash
# تشغيل Backend فقط
npm run dev:backend
```

افتح: http://localhost:4000/api/health

يجب أن ترى:
```json
{
  "status": "ok",
  "mongodb": true
}
```

إذا كان `mongodb: true` ✅ الاتصال ناجح!

اضغط `Ctrl+C` لإيقاف Backend.

#### ب. اختبار OCR Model

```bash
# اختبار الموديل
npm run ocr:test

# اختبار التكامل الكامل
npm run ocr:integration
```

يجب أن ترى:
```
✓ All tests passed!
```

### الخطوة 6: تشغيل التطبيق الكامل

```bash
npm run dev
```

سيقوم بـ:
1. ✅ فحص إعدادات MongoDB
2. ✅ تشغيل Backend على Port 4000
3. ✅ تشغيل Frontend على Port 3000
4. ✅ التحقق من الاتصال بقاعدة البيانات
5. ✅ عرض روابط سريعة

يجب أن ترى:

```
============================================================
✅ All Services Started!
============================================================

📱 Frontend:  http://localhost:3000
🔧 Backend:   http://localhost:4000
📊 Health:    http://localhost:4000/api/health

🎯 Quick Links:
   • Upload:    http://localhost:3000/upload
   • Dashboard: http://localhost:3000/dashboard
   • Search:    http://localhost:3000/search

💡 OCR Model:
   • Model location: model/
   • OCR endpoint: POST /api/ocr
   • Test OCR: npm run ocr:test
```

---

## ✅ التحقق من التثبيت

### 1. اختبار Frontend

افتح: http://localhost:3000

يجب أن ترى الصفحة الرئيسية.

### 2. اختبار Backend

افتح: http://localhost:4000/api/health

يجب أن ترى:
```json
{
  "status": "ok",
  "mongodb": true,
  "timestamp": "..."
}
```

### 3. اختبار Upload + OCR

1. افتح: http://localhost:3000/upload
2. ارفع صورة أو استخدم الكاميرا
3. اضغط "Start OCR & Save"
4. يجب أن يظهر النص المستخرج

### 4. اختبار قاعدة البيانات

1. اذهب إلى MongoDB Atlas Dashboard
2. اضغط **Browse Collections**
3. يجب أن ترى:
   - Collection: `files`
   - Document مع `ocrText` من الموديل

---

## 🎯 استخدام النظام

### رفع ملف

1. افتح `/upload`
2. اسحب ملف أو اضغط "Browse Files"
3. املأ البيانات (الاسم، الموقع، القسم)
4. اضغط "Start OCR & Save"
5. انتظر حتى تكتمل المعالجة
6. سيظهر النص المستخرج
7. يمكنك تحميله كـ PDF, TXT, أو PNG

### استخدام الكاميرا

1. افتح `/upload`
2. اضغط "Scan"
3. امنح إذن الكاميرا
4. وجه الكاميرا نحو المستند
5. اضغط "Capture & Use"
6. سيتم معالجة OCR تلقائياً

### البحث في الملفات

1. افتح `/search`
2. اكتب كلمة أو جملة
3. اضغط Enter
4. ستظهر جميع الملفات التي تحتوي على النص

---

## 🔧 الأوامر المتاحة

### التطوير

```bash
# تشغيل كل شيء (Frontend + Backend + OCR)
npm run dev

# تشغيل Frontend فقط
npm run dev:web

# تشغيل Backend فقط
npm run dev:backend

# تشغيل بسيط (بدون فحوصات)
npm run dev:simple
```

### OCR

```bash
# إعداد البيئة
npm run ocr:setup

# اختبار الموديل
npm run ocr:test

# اختبار التكامل
npm run ocr:integration

# معالجة ملف محدد
npm run ocr:run path/to/file.jpg
```

### الإنتاج

```bash
# بناء التطبيق
npm run build

# تشغيل الإنتاج
npm start
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: "MONGODB_URI is required"

**الحل:**
1. تأكد من وجود `backend/.env`
2. تأكد من وجود `MONGODB_URI` في الملف
3. تأكد من صحة Connection String

### المشكلة: "mongodb: false"

**الحل:**
1. تحقق من Connection String
2. تحقق من كلمة المرور
3. تحقق من Network Access في MongoDB Atlas
4. تحقق من اتصال الإنترنت

### المشكلة: "Module not found" (Python)

**الحل:**
```bash
# تأكد من تفعيل Virtual Environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# أعد تثبيت المكتبات
pip install -r requirements_ocr.txt
```

### المشكلة: OCR بطيء جداً

**الحل:**
```bash
# ثبت PyTorch مع CUDA للـ GPU
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### المشكلة: الكاميرا لا تعمل

**الحل:**
1. امنح إذن الكاميرا في المتصفح
2. استخدم HTTPS أو localhost
3. تأكد من عدم استخدام الكاميرا من تطبيق آخر

---

## 📊 بنية المشروع

```
ocr-project/
├── model/                    # 🌟 الموديل المخصص
│   ├── arabic_reshaper.py
│   ├── letters.py
│   ├── ligatures.py
│   └── ocr_config.py
│
├── scripts/                  # سكريبتات Python
│   ├── ocr_runner.py        # 🌟 السكريبت الرئيسي
│   ├── setup_ocr.py
│   ├── test_ocr.py
│   └── dev-full-stack.mjs   # 🌟 سكريبت التشغيل
│
├── app/                      # Frontend (Next.js)
│   ├── (app)/upload/        # صفحة الرفع
│   ├── api/ocr/             # OCR API
│   └── ...
│
├── backend/                  # Backend (Express)
│   ├── src/
│   │   ├── server.js        # الخادم الرئيسي
│   │   ├── db.js            # 🌟 اتصال MongoDB
│   │   └── routes/          # API Routes
│   └── .env                 # 🌟 إعدادات MongoDB
│
├── requirements_ocr.txt      # مكتبات Python
├── package.json
└── README.md
```

---

## 📚 الوثائق الإضافية

- **[SETUP_MONGODB.md](SETUP_MONGODB.md)** - دليل MongoDB المفصل
- **[OCR_SETUP_GUIDE.md](OCR_SETUP_GUIDE.md)** - دليل OCR الكامل
- **[START_HERE.md](START_HERE.md)** - البدء السريع
- **[USER_GUIDE_AR.md](USER_GUIDE_AR.md)** - دليل المستخدم
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - توثيق API
- **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - ملخص التكامل

---

## 🎉 تم الإعداد!

الآن لديك نظام OCR كامل يعمل مع:
- ✅ Frontend حديث (Next.js)
- ✅ Backend قوي (Express + MongoDB)
- ✅ موديل OCR مخصص (EasyOCR + Arabic Reshaper)
- ✅ قاعدة بيانات سحابية (MongoDB Atlas)
- ✅ دعم الكاميرا
- ✅ تصدير متعدد الصيغ

**استمتع بالاستخدام! 🚀**

---

## 📞 الحصول على المساعدة

إذا واجهت أي مشاكل:

1. راجع قسم "استكشاف الأخطاء" أعلاه
2. شغل الاختبارات: `npm run ocr:integration`
3. تحقق من logs في console
4. راجع الوثائق الإضافية

---

**آخر تحديث:** 2024  
**الإصدار:** 1.0.0
