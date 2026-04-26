# Firebase Integration Guide

## Setup Overview

This OCR application uses Firebase for:

- **Authentication**: Email/password user login
- **Firestore**: Document metadata and tracking logs storage
- **Storage**: File upload and retrieval
- **Analytics**: User behavior tracking (optional)

## Configuration

### Firebase Project Details

- **Project ID**: ocr-project-f91fc
- **Authentication Domain**: ocr-project-f91fc.firebaseapp.com
- **Storage Bucket**: ocr-project-f91fc.firebasestorage.app (override via NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)

### Configuration File

Location: `app/lib/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC1xDkNx8IomETXn3LJvBXkBJvAohvy4xQ",
  authDomain: "ocr-project-f91fc.firebaseapp.com",
  projectId: "ocr-project-f91fc",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ocr-project-f91fc.firebasestorage.app",
  messagingSenderId: "907042072904",
  appId: "1:907042072904:web:311073ee8fbf268b4c2b7d",
  measurementId: "G-2DV4PRH9KZ",
};
```

## Database Structure

### Firestore Collections

#### 1. files Collection

Stores document metadata and OCR results

```
documents/
  {documentId}
    - name: string (stored file name)
    - originalName: string (original uploaded name)
    - location: string ("Cabinet A - Drawer 1")
    - department: string ("Legal", "HR", etc.)
    - fileType: string ("PDF", "DOCX", "Image")
    - uploadedBy: string (user email)
    - uploadedAt: timestamp
    - modifiedAt: timestamp
    - modifiedBy: string
    - tags: array (["contract", "legal"])
    - notes: string
    - ocrText: string (extracted text)
    - storageUrl: string (Firebase Storage URL)
    - fileSize: number (in bytes)
```

#### 2. tracking Collection

Logs file movements and access history

```
tracking/
  {logId}
    - fileId: string (reference to files document)
    - fileName: string
    - action: string ("checked_out", "returned", "updated", "deleted")
    - user: string (user email)
    - userDepartment: string
    - timestamp: timestamp
```

## Firebase Storage

### Directory Structure

```
uploads/
  ├── {userId}/
  │   ├── {timestamp}_document1.pdf
  │   ├── {timestamp}_invoice.docx
  │   └── {timestamp}_photo.jpg
```

### Security Rules

Recommended rules in `firebase.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId &&
                      request.resource.size < 50 * 1024 * 1024; // 50MB max
      allow delete: if request.auth.uid == userId;
    }
  }
}
```

## Authentication

### Implementation

Location: `app/lib/auth-context.tsx`

Features:

- Email/password sign in
- Email/password sign up
- Session persistence
- Provider context for app-wide access

### Usage Example

```typescript
import { useAuth } from "@/app/lib/auth-context";

export default function MyComponent() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <>
          <p>Welcome {user.email}</p>
          <button onClick={signOut}>Logout</button>
        </>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

## Firestore Operations

### Location: `app/lib/firestore.ts`

#### Available Functions

**Files Operations**

- `addFile(fileData)` - Create new file entry
- `getAllFiles()` - Fetch all files
- `getFilteredFiles(constraints)` - Query with filters
- `searchFiles(keyword)` - Full-text search
- `getFile(id)` - Get single file
- `updateFile(id, updates)` - Update file metadata
- `deleteFile(id, storagePath)` - Delete file and storage
- `uploadFileToStorage(file, userId, fileName)` - Upload to Storage

**Tracking Operations**

- `addTrackingLog(log)` - Create tracking entry
- `getTrackingLogs(fileId?, limit)` - Fetch tracking history

### Usage Examples

```typescript
import {
  addFile,
  searchFiles,
  addTrackingLog,
  uploadFileToStorage,
} from "@/app/lib/firestore";

// Upload and save file
const { url, path } = await uploadFileToStorage(file, userId, "Contract_2026");

await addFile({
  name: "Contract_2026",
  originalName: file.name,
  location: "Cabinet A - Drawer 1",
  department: "Legal",
  fileType: "PDF",
  uploadedBy: user.email,
  modifiedBy: user.email,
  tags: ["contract", "legal"],
  notes: "Important contract",
  ocrText: extractedText,
  storageUrl: url,
  fileSize: file.size,
});

// Search documents
const results = await searchFiles("contract 2026");

// Track file access
await addTrackingLog({
  fileId: "doc123",
  fileName: "Contract_2026.pdf",
  action: "checked_out",
  user: "user@company.com",
  userDepartment: "Legal",
  timestamp: new Date(),
});
```

## Security Best Practices

1. **Never commit credentials** - Keep API keys in environment variables
2. **Validate data** - Always validate on both client and server
3. **Set Firestore rules** - Restrict access to user's own data
4. **Use HTTPS** - Always use secure connections
5. **Regular backups** - Enable Firestore backups in console

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Files collection
    match /files/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       request.resource.data.uploadedBy == request.auth.token.email;
      allow update, delete: if request.auth != null &&
                               request.resource.data.uploadedBy == request.auth.token.email;
    }

    // Tracking collection
    match /tracking/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## Monitoring & Analytics

### Firebase Console

- Monitor authentication usage
- View Firestore data
- Check Storage usage
- View crash reports (if enabled)

### Enable Analytics

```bash
# In Firebase Console:
1. Go to Project Settings
2. Enable Google Analytics
3. Check analytics events in console
```

## Testing

### Local Testing

```bash
npm run dev
# Navigate to http://localhost:3000
# Test sign in/up with test@test.com / password123
```

### Production Testing

After deploying to Firebase Hosting:

```bash
firebase deploy
firebase open hosting:site
```

## Troubleshooting

### Auth Issues

- Check Firebase Console > Authentication > Settings
- Verify email/password provider is enabled
- Check CORS settings if API calls fail

### Firestore Issues

- Verify collection names match exactly
- Check security rules in Firebase Console
- Monitor Firestore usage in console

### Storage Issues

- Check storage bucket in Firebase Console
- Verify security rules allow uploads
- Monitor quota usage

## Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy

# View logs
firebase functions:log --limit 50
```

### Environment Setup

Create `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1xDkNx8IomETXn3LJvBXkBJvAohvy4xQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ocr-project-f91fc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ocr-project-f91fc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ocr-project-f91fc.firebasestorage.app
```

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Firebase Guide](https://nextjs.org/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Support

For Firebase specific issues:

1. Check [Firebase Status Page](https://status.firebase.google.com/)
2. Review [Firebase Documentation](https://firebase.google.com/docs)
3. Contact Firebase Support through Console

---

**Last Updated**: March 9, 2026
**Firebase SDK Version**: Latest
