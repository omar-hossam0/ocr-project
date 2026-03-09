## ✅ Firebase Setup Guide - DocuMind AI

### 🔐 1. Enable Email/Password Authentication

**CRITICAL: هذه الخطوة مطلوبة لكي يعمل التسجيل والدخول**

**الخطوات:**

1. اذهب إلى: https://console.firebase.google.com/project/ocr-project-f91fc/authentication/providers

2. ابحث عن **"Email/Password"** في القائمة

3. إذا كانت **معطلة (Disabled)**:
   - اضغط عليها
   - اختر **"Enable"**
   - تأكد من أن **"Email/Password"** مختارة
   - اضغط **"Save"**

4. يجب أن ترى: **"✓ Email/Password is enabled"** بـ checkmark أخضر

---

### 🌐 2. Firebase Project Details

**Project ID:** `ocr-project-f91fc`

**Services Enabled:**

- ✅ Firebase Authentication (Email/Password)
- ✅ Cloud Firestore (Document Database)
- ✅ Cloud Storage (File Upload)
- ✅ Realtime Database (Statistics/Analytics)

**API Key:** AIzaSyC1xDkNx8IomETXn3LJvBXkBJvAohvy4xQ

**Auth Domain:** ocr-project-f91fc.firebaseapp.com

---

### 📝 3. Test Firebase Connection

**URL:** http://localhost:3000/app/firebase-test

This page tests all Firebase services:

- ✅ Auth initialization
- ✅ Firestore connection
- ✅ Storage connection
- ✅ Realtime DB connection

---

### 🧪 4. Test User Authentication

**Login Page:** http://localhost:3000/login

**Test Credentials:**

```
Email: test@example.com
Password: Test123456
```

**Expected Result:**

- ✅ Green success message appears
- ✅ Redirects to /dashboard after 2 seconds
- ✅ User appears in Firebase Console → Authentication

---

### 📤 5. Test File Upload

**Upload Page:** http://localhost:3000/app/upload

**Expected Result:**

- ✅ File metadata saved to Firestore "files" collection
- ✅ File uploaded to Cloud Storage
- ✅ Success message displays with file details

---

### 🔍 6. Verify in Firebase Console

**Check Firestore Data:**

1. Go to: https://console.firebase.google.com/project/ocr-project-f91fc/firestore/data
2. Look for "files" collection
3. Should see documents with metadata after upload

**Check Uploaded Files:**

1. Go to: https://console.firebase.google.com/project/ocr-project-f91fc/storage
2. Should see files uploaded to /users/{uid}/ folders

**Check Auth Users:**

1. Go to: https://console.firebase.google.com/project/ocr-project-f91fc/authentication/users
2. Should see test@example.com registered

---

### ⚠️ Common Errors & Fixes

**Error: `400 (Bad Request)` on signup/login**

- ❌ **Cause:** Email/Password authentication is NOT enabled
- ✅ **Fix:** Follow step 1 above to enable it

**Error: "This email is already registered"**

- ℹ️ **Reason:** Account already exists
- ✅ **Solution:** Use different email or reset in Firebase Console

**Error: "Password must be at least 6 characters"**

- ℹ️ **Reason:** Password too short
- ✅ **Solution:** Use longer password (min 6 chars)

**Error: "Invalid email address"**

- ℹ️ **Reason:** Email format incorrect
- ✅ **Solution:** Use valid email format (user@domain.com)

---

### 🔗 Firebase Project Links

- **Console:** https://console.firebase.google.com/project/ocr-project-f91fc
- **Authentication:** https://console.firebase.google.com/project/ocr-project-f91fc/authentication
- **Firestore:** https://console.firebase.google.com/project/ocr-project-f91fc/firestore
- **Storage:** https://console.firebase.google.com/project/ocr-project-f91fc/storage
- **Realtime DB:** https://ocr-project-f91fc-default-rtdb.firebaseio.com/

---

### 📊 Code Structure

**Auth Context:** `app/lib/auth-context.tsx`

- Handles login, signup, logout
- Manages user session persistence
- Error handling for common Firebase errors

**Firebase Config:** `app/lib/firebase.ts`

- Initializes all Firebase services
- Exports: auth, db, storage, realtimeDb

**Firestore Functions:** `app/lib/firestore.ts`

- `addFile()` - Save file metadata
- `uploadFileToStorage()` - Upload to Cloud Storage
- `getAllFiles()`, `searchFiles()` - Query operations

**Pages:**

- `/login` - Login & Signup
- `/app/upload` - File upload
- `/app/dashboard` - User dashboard
- `/app/firebase-test` - Connection test

---

### ✅ Success Indicators

When everything is configured:

1. ✅ Server starts without errors
2. ✅ Firebase test page shows all green checkmarks
3. ✅ User can signup with email
4. ✅ Success message appears
5. ✅ User redirects to dashboard
6. ✅ User appears in Firebase Console

---

**Date:** March 9, 2026
**Project:** DocuMind AI OCR Platform
**Status:** Ready for integration testing
