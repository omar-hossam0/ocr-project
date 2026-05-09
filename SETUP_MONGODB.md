# إعداد MongoDB - دليل سريع

## 🎯 الهدف

ربط التطبيق بقاعدة بيانات MongoDB لحفظ الملفات والنصوص المستخرجة من OCR.

---

## 📋 الخطوات

### 1. إنشاء حساب MongoDB Atlas (مجاني)

1. اذهب إلى: https://www.mongodb.com/cloud/atlas/register
2. سجل حساب جديد (مجاني)
3. اختر **Free Tier** (M0 Sandbox)
4. اختر المنطقة الأقرب لك

### 2. إنشاء Cluster

1. بعد التسجيل، سيتم إنشاء cluster تلقائياً
2. انتظر حتى يكتمل الإعداد (2-3 دقائق)

### 3. إنشاء مستخدم قاعدة البيانات

1. اذهب إلى **Database Access** من القائمة الجانبية
2. اضغط **Add New Database User**
3. اختر **Password** authentication
4. أدخل:
   - Username: `ocruser` (أو أي اسم تريده)
   - Password: اختر كلمة مرور قوية (احفظها!)
5. اختر **Built-in Role**: `Read and write to any database`
6. اضغط **Add User**

### 4. السماح بالاتصال من أي مكان

1. اذهب إلى **Network Access** من القائمة الجانبية
2. اضغط **Add IP Address**
3. اضغط **Allow Access from Anywhere** (للتطوير فقط)
4. اضغط **Confirm**

⚠️ **ملاحظة**: في الإنتاج، حدد IP محدد لأمان أفضل.

### 5. الحصول على Connection String

1. اذهب إلى **Database** من القائمة الرئيسية
2. اضغط **Connect** على الـ cluster الخاص بك
3. اختر **Connect your application**
4. اختر **Driver**: Node.js
5. انسخ الـ **Connection String**

سيكون شكله:
```
mongodb+srv://ocruser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 6. إعداد ملف البيئة

#### أ. إنشاء `backend/.env`

```bash
# في مجلد المشروع
cd backend
copy .env.example .env
```

أو يدوياً:
```bash
# Windows
copy backend\.env.example backend\.env

# Linux/Mac
cp backend/.env.example backend/.env
```

#### ب. تعديل `backend/.env`

افتح `backend/.env` وعدل:

```bash
# استبدل <password> بكلمة المرور الخاصة بك
# استبدل cluster0.xxxxx بالـ cluster الخاص بك
MONGODB_URI=mongodb+srv://ocruser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# اسم قاعدة البيانات
MONGODB_DB=ocr_system

# JWT Secret (غيره لأي نص عشوائي)
JWT_SECRET=your-super-secret-key-change-this-in-production

# JWT Expiration
JWT_EXPIRES_IN=7d

# JWT Required (0 = optional, 1 = required)
JWT_REQUIRED=0

# Port
PORT=4000

# CORS Origin
CORS_ORIGIN=http://localhost:3000

# Admin User (اختياري - سيتم إنشاؤه تلقائياً)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
ADMIN_ROLE=Admin
```

⚠️ **مهم**: استبدل `YOUR_PASSWORD` بكلمة المرور الفعلية!

---

## ✅ التحقق من الاتصال

### 1. تشغيل Backend فقط

```bash
npm run dev:backend
```

يجب أن ترى:
```
Backend running on http://localhost:4000
```

### 2. اختبار الاتصال

افتح المتصفح: http://localhost:4000/api/health

يجب أن ترى:
```json
{
  "status": "ok",
  "mongodb": true,
  "timestamp": "2024-..."
}
```

إذا كان `mongodb: true` ✅ الاتصال ناجح!

إذا كان `mongodb: false` ❌ راجع الخطوات أعلاه.

---

## 🚀 تشغيل التطبيق الكامل

بعد التأكد من الاتصال:

```bash
npm run dev
```

سيقوم بـ:
- ✅ فحص إعدادات MongoDB
- ✅ تشغيل Backend (Port 4000)
- ✅ تشغيل Frontend (Port 3000)
- ✅ التحقق من الاتصال بقاعدة البيانات
- ✅ عرض روابط سريعة

---

## 🗄️ بنية قاعدة البيانات

سيتم إنشاء Collections تلقائياً:

### `files` Collection
يحفظ معلومات الملفات:
```javascript
{
  _id: ObjectId,
  name: "document.pdf",
  originalName: "original_document.pdf",
  location: "Cabinet A - Drawer 1",
  department: "Legal",
  ocrText: "النص المستخرج من OCR...",  // ⭐ من الموديل
  tags: ["contract", "legal"],
  uploadedBy: "user@example.com",
  uploadedAt: ISODate,
  status: "available",
  fileSize: 1024000,
  storageUrl: "https://..."
}
```

### `users` Collection
يحفظ معلومات المستخدمين:
```javascript
{
  _id: ObjectId,
  name: "Admin User",
  email: "admin@example.com",
  role: "Admin",
  passwordHash: "...",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### `tracking` Collection
يحفظ سجل الحركات:
```javascript
{
  _id: ObjectId,
  fileId: ObjectId,
  action: "uploaded",
  user: "user@example.com",
  timestamp: ISODate,
  details: {}
}
```

---

## 🔍 استكشاف الأخطاء

### الخطأ: "MONGODB_URI is required"

**الحل**: تأكد من وجود `backend/.env` وأنه يحتوي على `MONGODB_URI`

### الخطأ: "Authentication failed"

**الحل**: 
1. تأكد من كلمة المرور صحيحة
2. تأكد من إنشاء المستخدم في MongoDB Atlas
3. تأكد من عدم وجود رموز خاصة في كلمة المرور (استخدم URL encoding)

### الخطأ: "Connection timeout"

**الحل**:
1. تأكد من إضافة IP في Network Access
2. تأكد من اتصال الإنترنت
3. جرب "Allow Access from Anywhere"

### الخطأ: "mongodb: false" في health check

**الحل**:
1. تحقق من `MONGODB_URI` في `backend/.env`
2. تحقق من اتصال الإنترنت
3. تحقق من صلاحيات المستخدم في MongoDB Atlas

---

## 💡 نصائح

### للتطوير

- استخدم **Free Tier** (M0) - كافي للتطوير
- فعّل **Allow Access from Anywhere** للسهولة
- استخدم كلمة مرور بسيطة للتطوير

### للإنتاج

- استخدم **Dedicated Cluster** للأداء الأفضل
- حدد **IP محدد** في Network Access
- استخدم **كلمة مرور قوية**
- فعّل **Backup** التلقائي
- استخدم **Environment Variables** للـ secrets

---

## 📊 مراقبة قاعدة البيانات

### MongoDB Atlas Dashboard

1. اذهب إلى https://cloud.mongodb.com
2. اختر الـ cluster الخاص بك
3. يمكنك:
   - عرض البيانات: **Browse Collections**
   - مراقبة الأداء: **Metrics**
   - عرض Logs: **Logs**

### من التطبيق

```bash
# عرض إحصائيات
curl http://localhost:4000/api/stats

# عرض الملفات
curl http://localhost:4000/api/files

# البحث
curl http://localhost:4000/api/search?q=عقد
```

---

## 🎯 الخطوات التالية

بعد إعداد MongoDB:

1. ✅ شغل التطبيق: `npm run dev`
2. ✅ افتح: http://localhost:3000/upload
3. ✅ ارفع ملف واختبر OCR
4. ✅ تحقق من حفظ البيانات في MongoDB Atlas

---

## 📞 الحصول على المساعدة

إذا واجهت مشاكل:

1. تحقق من logs في console
2. اختبر health endpoint: http://localhost:4000/api/health
3. راجع MongoDB Atlas logs
4. تأكد من صحة Connection String

---

**تم! الآن لديك قاعدة بيانات MongoDB جاهزة! 🎉**
