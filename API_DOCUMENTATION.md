# توثيق API - نظام OCR

## نظرة عامة

يوفر النظام مجموعة من API endpoints للتعامل مع معالجة OCR وإدارة الملفات.

## Authentication

جميع الطلبات تتطلب مصادقة المستخدم من خلال Firebase Authentication.

---

## OCR Endpoints

### POST /api/ocr

معالجة ملف باستخدام OCR (التعرف الضوئي على الحروف)

#### Request

**Headers:**
```
Content-Type: multipart/form-data
x-ocr-js-fallback: 1  (optional - enables JavaScript fallback)
```

**Body:**
```typescript
FormData {
  file: File  // الملف المراد معالجته (صورة أو PDF)
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "text": "النص المستخرج من الملف...",
    "engine": "easyocr",
    "device": "cuda",
    "languages": ["ar", "en"],
    "model": "custom_arabic_reshaper",
    "pages_processed": 5,  // للـ PDF فقط
    "total_pages": 5,      // للـ PDF فقط
    "transport": "python_easyocr",
    "config": {
      "languages": ["ar", "en"],
      "gpu_enabled": true,
      "gpu_used": true
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "وصف الخطأ",
  "hint": "نصيحة لحل المشكلة",
  "attempts": [
    {
      "command": "python",
      "code": 1,
      "stderr": "تفاصيل الخطأ"
    }
  ]
}
```

#### مثال استخدام

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/ocr', {
  method: 'POST',
  headers: {
    'x-ocr-js-fallback': '1'
  },
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Extracted text:', result.data.text);
  console.log('Used engine:', result.data.engine);
  console.log('Device:', result.data.device);
}
```

---

## File Management Endpoints

### POST /api/files

حفظ بيانات ملف جديد في قاعدة البيانات

#### Request

```json
{
  "name": "document.pdf",
  "originalName": "original_document.pdf",
  "location": "Cabinet A - Drawer 1",
  "physicalLocation": "Cabinet A - Drawer 1",
  "department": "Legal",
  "fileType": "application/pdf",
  "documentType": "application/pdf",
  "uploadedBy": "user@example.com",
  "modifiedBy": "user@example.com",
  "tags": ["contract", "legal", "urgent"],
  "notes": "ملاحظات إضافية",
  "ocrText": "النص المستخرج من OCR",
  "fileSize": 1024000,
  "storageUrl": "https://s3.amazonaws.com/bucket/file.pdf",
  "uploadedAt": "2024-01-01T12:00:00.000Z",
  "modifiedAt": "2024-01-01T12:00:00.000Z",
  "status": "available"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "file_id_123"
  }
}
```

### GET /api/files

الحصول على قائمة الملفات

#### Query Parameters

- `limit` (optional): عدد النتائج (افتراضي: 50)
- `offset` (optional): تخطي عدد من النتائج (افتراضي: 0)
- `department` (optional): تصفية حسب القسم
- `status` (optional): تصفية حسب الحالة

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "file_id_123",
      "name": "document.pdf",
      "location": "Cabinet A",
      "department": "Legal",
      "ocrText": "النص المستخرج...",
      "uploadedAt": "2024-01-01T12:00:00.000Z",
      "status": "available"
    }
  ],
  "total": 100
}
```

### GET /api/files/[id]

الحصول على تفاصيل ملف محدد

#### Response

```json
{
  "success": true,
  "data": {
    "id": "file_id_123",
    "name": "document.pdf",
    "originalName": "original_document.pdf",
    "location": "Cabinet A - Drawer 1",
    "department": "Legal",
    "tags": ["contract", "legal"],
    "notes": "ملاحظات",
    "ocrText": "النص المستخرج...",
    "fileSize": 1024000,
    "storageUrl": "https://...",
    "uploadedBy": "user@example.com",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "status": "available"
  }
}
```

### PATCH /api/files/[id]

تحديث بيانات ملف

#### Request

```json
{
  "ocrText": "نص محدث",
  "status": "available",
  "notes": "ملاحظات جديدة"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "file_id_123",
    "updated": true
  }
}
```

### DELETE /api/files/[id]

حذف ملف

#### Response

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Search Endpoint

### GET /api/search

البحث في النصوص المستخرجة من OCR

#### Query Parameters

- `q` (required): نص البحث
- `department` (optional): تصفية حسب القسم
- `limit` (optional): عدد النتائج (افتراضي: 20)

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "file_id_123",
      "name": "document.pdf",
      "ocrText": "...النص الذي يحتوي على كلمة البحث...",
      "department": "Legal",
      "uploadedAt": "2024-01-01T12:00:00.000Z",
      "relevance": 0.95
    }
  ],
  "query": "كلمة البحث",
  "total": 5
}
```

---

## Upload Endpoint

### POST /api/upload

رفع ملف إلى S3

#### Request

```typescript
FormData {
  file: File
}
```

#### Response

```json
{
  "storageUrl": "https://bucket.s3.region.amazonaws.com/uploads/file.pdf"
}
```

---

## Stats Endpoint

### GET /api/stats

الحصول على إحصائيات النظام

#### Response

```json
{
  "success": true,
  "data": {
    "totalFiles": 1250,
    "totalSize": 5368709120,
    "filesByDepartment": {
      "Legal": 450,
      "HR": 300,
      "Finance": 500
    },
    "filesByStatus": {
      "available": 1100,
      "processing": 50,
      "failed": 100
    },
    "recentUploads": 45,
    "ocrProcessed": 1200
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - طلب غير صحيح |
| 401 | Unauthorized - غير مصرح |
| 403 | Forbidden - ممنوع |
| 404 | Not Found - غير موجود |
| 415 | Unsupported Media Type - نوع ملف غير مدعوم |
| 500 | Internal Server Error - خطأ في الخادم |
| 503 | Service Unavailable - الخدمة غير متاحة |

---

## Rate Limiting

- OCR Processing: 10 requests per minute per user
- File Operations: 100 requests per minute per user
- Search: 30 requests per minute per user

---

## Best Practices

### 1. معالجة OCR

```typescript
// استخدم timeout مناسب
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

try {
  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: formData,
    signal: controller.signal
  });
  // معالجة النتيجة
} finally {
  clearTimeout(timeoutId);
}
```

### 2. التعامل مع الأخطاء

```typescript
async function processOCR(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (!result.success) {
      // معالجة الخطأ
      console.error('OCR failed:', result.error);
      
      // عرض نصيحة للمستخدم
      if (result.hint) {
        console.log('Hint:', result.hint);
      }
      
      return null;
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

### 3. تحسين الأداء

```typescript
// استخدم JavaScript fallback للصور الصغيرة
const isSmallImage = file.size < 2 * 1024 * 1024; // < 2MB

const response = await fetch('/api/ocr', {
  method: 'POST',
  headers: {
    'x-ocr-js-fallback': isSmallImage ? '1' : '0'
  },
  body: formData
});
```

---

## Examples

### مثال كامل: رفع ملف ومعالجة OCR

```typescript
async function uploadAndProcessFile(file: File) {
  try {
    // 1. معالجة OCR أولاً
    console.log('Processing OCR...');
    const formData = new FormData();
    formData.append('file', file);
    
    const ocrResponse = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'x-ocr-js-fallback': '1' },
      body: formData
    });
    
    const ocrResult = await ocrResponse.json();
    
    if (!ocrResult.success) {
      throw new Error(ocrResult.error);
    }
    
    const extractedText = ocrResult.data.text;
    console.log('OCR completed:', extractedText.length, 'characters');
    
    // 2. رفع الملف إلى S3
    console.log('Uploading to S3...');
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData
    });
    
    const uploadResult = await uploadResponse.json();
    const storageUrl = uploadResult.storageUrl;
    
    // 3. حفظ البيانات في قاعدة البيانات
    console.log('Saving metadata...');
    const metadata = {
      name: file.name,
      originalName: file.name,
      location: 'Cabinet A - Drawer 1',
      department: 'Legal',
      fileType: file.type,
      ocrText: extractedText,
      fileSize: file.size,
      storageUrl: storageUrl,
      uploadedBy: 'user@example.com',
      uploadedAt: new Date(),
      status: 'available',
      tags: ['document'],
      notes: `OCR processed with ${ocrResult.data.engine}`
    };
    
    const saveResponse = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    
    const saveResult = await saveResponse.json();
    
    if (!saveResult.success) {
      throw new Error(saveResult.error);
    }
    
    console.log('File saved successfully:', saveResult.data.id);
    
    return {
      fileId: saveResult.data.id,
      ocrText: extractedText,
      storageUrl: storageUrl
    };
    
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// استخدام
const result = await uploadAndProcessFile(myFile);
console.log('Upload complete:', result);
```

---

## Webhooks (قريباً)

سيتم إضافة دعم webhooks للإشعارات عند:
- اكتمال معالجة OCR
- فشل معالجة OCR
- رفع ملف جديد
- تحديث حالة ملف
