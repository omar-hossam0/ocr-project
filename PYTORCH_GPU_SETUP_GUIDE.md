# تعليمات تثبيت PyTorch مع GPU Support

## 🔍 الحالة الحالية:
- **Python**: 3.13.13 ✅
- **PyTorch**: 2.11.0+cpu ❌ (CPU فقط، ليس GPU)
- **CUDA**: غير متوفر حالياً
- **EasyOCR**: 1.7.0 ✅

## ⚠️ المشكلة:
PyTorch مثبت مع دعم CPU فقط. يجب تثبيت نسخة مع دعم CUDA.

---

## 🚀 الحل:

### الخطوة 1: حذف PyTorch الحالي
```bash
pip uninstall torch torchvision torchaudio -y
```

### الخطوة 2: التحقق من CUDA على النظام
```bash
nvidia-smi
```
إذا كان الأمر لا يعمل، قد تحتاج إلى تثبيت NVIDIA drivers.

### الخطوة 3: تثبيت PyTorch مع CUDA (اختر الإصدار المناسب):

#### للـ CUDA 12.1:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### للـ CUDA 11.8:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### للـ CUDA 11.7:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu117
```

### الخطوة 4: التحقق من التثبيت
```bash
python verify_gpu_setup.py
```

---

## 📌 ملاحظات مهمة:

1. **تحديد نسخة CUDA**:
   - اكتب `nvidia-smi` في Terminal
   - لاحظ رقم CUDA Capability (في أسفل اليسار)
   - اختر الإصدار المناسب من PyTorch

2. **متطلبات NVIDIA**:
   - GPU من NVIDIA متوفر
   - NVIDIA CUDA Toolkit مثبت
   - NVIDIA cuDNN مثبت (اختياري لكن موصى به)

3. **الحجم**:
   - PyTorch مع CUDA: ~2-3 GB
   - قد يستغرق التثبيت 5-10 دقائق

4. **التحقق من CUDA**:
   ```bash
   python -c "import torch; print(torch.cuda.is_available())"
   ```
   يجب أن يطبع: `True`

---

## 🎯 بعد التثبيت:

جميع ملفات OCR الآن مُحدثة وستعمل على GPU تلقائياً:
- ✅ `debug-ocr.py`
- ✅ `simple-test.py`
- ✅ `test-enhanced-ocr.py`
- ✅ `scripts/ocr_server.py`
- ✅ وجميع خدمات OCR الأخرى

---

## 💡 مثال على الفرق:

**بدون GPU (CPU فقط)**:
```
Processing 1 PDF page: 45 seconds
```

**مع GPU (CUDA)**:
```
Processing 1 PDF page: 5 seconds
```

**الفائدة: تسريع بـ 9x !** 🚀

---

## 🆘 في حالة المشاكل:

إذا واجهت مشاكل:
1. جرّب `pip install --upgrade torch` (للحصول على أحدث إصدار)
2. تأكد من تثبيت NVIDIA drivers (اكتب `nvidia-smi`)
3. جرّب إصدار CUDA مختلف إذا لم ينجح الأول
4. على Windows، قد تحتاج Visual C++ Build Tools

---

**آخر تحديث**: 2026-05-10
