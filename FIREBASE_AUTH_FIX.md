# 🔴 Firebase: Error (auth/configuration-not-found) - الحل الكامل

## ❌ المشكلة

عند محاولة التسجيل أو الدخول تظهر رسالة:

```
Firebase: Error (auth/configuration-not-found).
```

هذا يعني أن **Firebase Authentication API** غير مفعّل أو **API Key محدود**.

---

## ✅ الحل - خطوات دقيقة

### الخطوة 1️⃣: تفعيل Authentication Methods

**انسخ والصق الرابط:**

```
https://console.firebase.google.com/project/ocr-project-f91fc/authentication
```

**الخطوات:**

1. افتح الرابط أعلاه
2. انقر على تبويب **"Sign-in method"** أو **"Authentication"**
3. ابحث عن **"Email/Password"** في القائمة
4. إذا كانت **"Disabled"** → انقر عليها
5. اختر **"Enable"** للـ **Email/Password**
6. اضغط **"Save"**
7. يجب أن ترى: **✅ Email/Password - Enabled**

---

### الخطوة 2️⃣: تحقق من API Keys

**انسخ والصق الرابط:**

```
https://console.firebase.google.com/project/ocr-project-f91fc/settings/apikeys
```

**الخطوات:**

1. افتح الرابط أعلاه
2. ابحث عن مفتاح بـ تسمية **"Browser key"** أو **"Web API Key"**
3. إذا كان عنوانه **"Restricted"** يجب توسيع القيود:
   - اضغط على المفتاح
   - اذهب إلى **"Restrict usage to Android apps, iOS apps, and websites"**
   - في قسم **"Application restrictions"** اختر **"None"** أو **"HTTP referrers"**
   - في قسم **"API restrictions"** اختر **"All APIs"** (أو أضف Firebase Auth)
   - اضغط **"Save"**

---

### الخطوة 3️⃣: تأكد من أن Authentication APIs مفعّلة

**انسخ والصق الرابط:**

```
https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=ocr-project-f91fc
```

**الخطوات:**

1. افتح الرابط أعلاه
2. يجب أن ترى **"✓ ENABLED"** باللون الأزرق
3. إذا كانت معطلة اضغط **"ENABLE"**

---

### الخطوة 4️⃣: اختبر الاتصال

**افتح صفحة الاختبار:**

```
http://localhost:3000/firebase-debug
```

يجب أن تظهر رسالة خضراء:

```
✅ Firebase Auth initialized
```

---

## 🧪 بعد التفعيل - جرّب التسجيل

**صفحة التسجيل:**

```
http://localhost:3000/login
```

**بيانات الاختبار:**

```
Full Name: Test User
Email: test@example.com
Password: Test123456
```

**النتيجة المتوقعة:**

1. ✅ رسالة خضراء: "Account created!"
2. ✅ Redirect إلى dashboard
3. ✅ المستخدم يظهر في Firebase Console

---

## 📋 Checklist - تأكد من وجود كل شيء

- [ ] Email/Password Authentication **Enabled** ✅
- [ ] API Key **غير محدود** أو بـ قيود مناسبة ✅
- [ ] Identity Toolkit API **ENABLED** ✅
- [ ] صفحة firebase-debug تظهر **✅ Firebase Auth initialized** ✅
- [ ] محاولة التسجيل تنجح بدون خطأ 400 ✅

---

## 🆘 إذا استمرت المشكلة

**اتبع الخطوات التالية:**

1. **امسح cache المتصفح:**
   - اضغط Ctrl+Shift+Delete
   - امسح كل البيانات
   - أغلق وافتح المتصفح من جديد

2. **أعد تحميل الصفحة:**
   - اضغط Ctrl+F5

3. **تحقق من Console في Developer Tools:**
   - اضغط F12
   - اذهب إلى تبويب "Console"
   - ابحث عن رسائل خطأ مفصلة
   - أرسل لي الرسالة الكاملة

4. **جرّب في متصفح مختلف:**
   - Chrome / Edge / Firefox
   - الحل قد يكون في cache المتصفح

---

## 📞 معلومات المشروع

- **Project ID:** ocr-project-f91fc
- **Auth Domain:** ocr-project-f91fc.firebaseapp.com
- **API Key:** AIzaSyC1xDkNx8IomETXn3LJvBXkBJvAohvy4xQ
- **Firestore:** ocr-project-f91fc

---

## 🔗 الروابط المهمة

| الخدمة             | الرابط                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Firebase Console   | https://console.firebase.google.com/project/ocr-project-f91fc                                          |
| Authentication     | https://console.firebase.google.com/project/ocr-project-f91fc/authentication                           |
| API Keys           | https://console.firebase.google.com/project/ocr-project-f91fc/settings/apikeys                         |
| Identity Toolkit   | https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=ocr-project-f91fc |
| Debug Page (Local) | http://localhost:3000/firebase-debug                                                                   |

---

**تاريخ:** مارس 9، 2026
**حالة:** مستعد للاختبار بعد التفعيل
