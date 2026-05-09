# 🔧 إصلاح اتصال MongoDB

## المشكلة: MongoDB: ❌ Not connected

---

## ✅ الحل السريع

### الخطوة 1: اختبار الاتصال

```bash
npm run test:mongodb
```

سيخبرك بالمشكلة بالضبط.

---

## 🔍 المشاكل الشائعة والحلول

### المشكلة 1: Authentication Failed

**السبب**: اسم المستخدم أو كلمة المرور خاطئة.

**الحل**:

1. اذهب إلى [MongoDB Atlas](https://cloud.mongodb.com)
2. اذهب إلى **Database Access**
3. تحقق من المستخدم: `amorhossam2005_db_user`
4. إذا لم يكن موجود، أنشئه:
   - اضغط **Add New Database User**
   - Username: `amorhossam2005_db_user`
   - Password: `omarmora2005` (أو أي كلمة مرور)
   - Role: **Read and write to any database**
   - اضغط **Add User**

5. حدث `backend/.env` بكلمة المرور الصحيحة:
```bash
MONGODB_URI=mongodb+srv://amorhossam2005_db_user:YOUR_PASSWORD@ocr.djbzpwc.mongodb.net/ocr?retryWrites=true&w=majority
```

---

### المشكلة 2: Network Timeout

**السبب**: IP الخاص بك غير مسموح في MongoDB Atlas.

**الحل**:

1. اذهب إلى [MongoDB Atlas](https://cloud.mongodb.com)
2. اذهب إلى **Network Access**
3. اضغط **Add IP Address**
4. اختر **Allow Access from Anywhere** (0.0.0.0/0)
5. اضغط **Confirm**

⚠️ **ملاحظة**: للتطوير فقط. في الإنتاج، حدد IP محدد.

---

### المشكلة 3: Cluster Not Running

**السبب**: الـ Cluster متوقف أو محذوف.

**الحل**:

1. اذهب إلى [MongoDB Atlas](https://cloud.mongodb.com)
2. اذهب إلى **Database**
3. تحقق من أن الـ Cluster يعمل (يجب أن يكون أخضر)
4. إذا كان متوقف، اضغط **Resume**

---

### المشكلة 4: Wrong Connection String

**السبب**: الـ Connection String خاطئ أو ناقص.

**الحل**:

1. اذهب إلى [MongoDB Atlas](https://cloud.mongodb.com)
2. اذهب إلى **Database**
3. اضغط **Connect** على الـ Cluster
4. اختر **Connect your application**
5. انسخ الـ Connection String الجديد
6. عدل `backend/.env`:

```bash
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE?retryWrites=true&w=majority
```

استبدل:
- `USERNAME`: اسم المستخدم
- `PASSWORD`: كلمة المرور
- `DATABASE`: اسم قاعدة البيانات (مثل `ocr`)

---

## 🧪 اختبار الاتصال

### الطريقة 1: سكريبت الاختبار

```bash
npm run test:mongodb
```

يجب أن ترى:
```
✅ Connected successfully!
✅ MongoDB is ready to use!
```

### الطريقة 2: Health Endpoint

```bash
# شغل Backend
npm run dev:backend

# في متصفح آخر أو terminal
curl http://localhost:4000/api/health
```

يجب أن ترى:
```json
{
  "status": "ok",
  "mongodb": true
}
```

---

## 📝 مثال على Connection String صحيح

```bash
# الصيغة الكاملة
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority

# مثال حقيقي
MONGODB_URI=mongodb+srv://amorhossam2005_db_user:omarmora2005@ocr.djbzpwc.mongodb.net/ocr?retryWrites=true&w=majority
```

**مهم**:
- ✅ يجب أن ينتهي بـ `/database_name?retryWrites=true&w=majority`
- ✅ استبدل `password` بكلمة المرور الفعلية
- ✅ لا تضع مسافات
- ✅ إذا كانت كلمة المرور تحتوي على رموز خاصة، استخدم URL encoding

---

## 🔐 رموز خاصة في كلمة المرور

إذا كانت كلمة المرور تحتوي على رموز خاصة، استخدم URL encoding:

| الرمز | URL Encoded |
|------|-------------|
| @ | %40 |
| : | %3A |
| / | %2F |
| ? | %3F |
| # | %23 |
| [ | %5B |
| ] | %5D |
| % | %25 |

**مثال**:
- كلمة المرور: `pass@word#123`
- URL Encoded: `pass%40word%23123`

---

## ✅ بعد الإصلاح

```bash
# أوقف التطبيق (Ctrl+C)

# اختبر الاتصال
npm run test:mongodb

# إذا نجح، شغل التطبيق
npm run dev
```

يجب أن ترى:
```
✅ Backend is ready!
   MongoDB: ✅ Connected
```

---

## 🆘 لا زالت المشكلة موجودة؟

### تحقق من:

1. **اسم المستخدم وكلمة المرور**:
   ```bash
   # في backend/.env
   # تأكد من صحتهما
   ```

2. **Network Access**:
   - اذهب إلى MongoDB Atlas
   - Network Access
   - تأكد من وجود 0.0.0.0/0 أو IP الخاص بك

3. **Database Access**:
   - اذهب إلى MongoDB Atlas
   - Database Access
   - تأكد من وجود المستخدم مع صلاحيات

4. **Cluster Status**:
   - اذهب إلى MongoDB Atlas
   - Database
   - تأكد من أن الـ Cluster يعمل (أخضر)

---

## 📞 الحصول على المساعدة

إذا لا زالت المشكلة:

1. شغل: `npm run test:mongodb`
2. انسخ الخطأ
3. راجع [SETUP_MONGODB.md](SETUP_MONGODB.md)

---

**ملاحظة**: معظم مشاكل MongoDB تُحل بإعداد Network Access و Database Access بشكل صحيح! 🚀
