# 🚀 نظام OCR - التعرف الضوئي على النصوص

## مرحباً! 👋

نظام متكامل للتعرف على النصوص العربية والإنجليزية من الصور والمستندات.

---

## ⚡ البدء السريع

### الخطوة 1: إعداد MongoDB

```bash
# 1. أنشئ حساب مجاني على MongoDB Atlas
# 2. احصل على Connection String
# 3. أنشئ backend/.env

copy backend\.env.example backend\.env

# 4. عدل backend/.env وضع:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

📚 **دليل مفصل**: [SETUP_MONGODB.md](SETUP_MONGODB.md)

### الخطوة 2: تثبيت المكتبات

```bash
# Node.js
npm install

# Python OCR
npm run ocr:setup
```

### الخطوة 3: اختبار

```bash
# اختبار MongoDB
npm run dev:backend
# افتح: http://localhost:4000/api/health

# اختبار OCR
npm run ocr:integration
```

### الخطوة 4: تشغيل

```bash
npm run dev
```

سيفتح على:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

---

## 🎯 الميزات

- ✅ **موديل OCR مخصص** من مجلد `model/`
- ✅ **دعم الكاميرا** للالتقاط المباشر
- ✅ **قاعدة بيانات MongoDB** لحفظ الملفات
- ✅ **تصدير متعدد** (PDF, TXT, PNG)
- ✅ **بحث في النصوص** المستخرجة
- ✅ **واجهة عربية** سهلة الاستخدام

---

## 📚 الوثائق

| الملف | الوصف |
|------|-------|
| [START_HERE.md](START_HERE.md) | ابدأ من هنا |
| [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) | دليل الإعداد الكامل |
| [SETUP_MONGODB.md](SETUP_MONGODB.md) | إعداد MongoDB |
| [USER_GUIDE_AR.md](USER_GUIDE_AR.md) | دليل المستخدم |
| [FINAL_SUMMARY.md](FINAL_SUMMARY.md) | الملخص النهائي |

---

## 🔧 الأوامر

```bash
# تشغيل كل شيء
npm run dev

# تشغيل Frontend فقط
npm run dev:web

# تشغيل Backend فقط
npm run dev:backend

# اختبار OCR
npm run ocr:test
npm run ocr:integration
```

---

## 🎉 جاهز!

الآن لديك نظام OCR كامل يعمل مع:
- Frontend (Next.js)
- Backend (Express)
- OCR Model (EasyOCR + Arabic Reshaper)
- Database (MongoDB)

**استمتع! 🚀**
