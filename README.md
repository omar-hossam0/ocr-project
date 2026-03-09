# DocuMind AI - OCR Smart Document Archiving System

A modern web application for intelligent document archiving with OCR capabilities, built with Next.js, React, Tailwind CSS, and Firebase.

## Features

✨ **Smart Document Management**

- Drag & drop file upload with OCR text extraction
- Searchable document archive with full-text search
- Physical location tracking (cabinet, drawer, room, shelf)
- Department and tag-based organization

📁 **File Management**

- Upload PDF, DOCX, images, and text files
- Automatic OCR text extraction
- View extracted text and document metadata
- Download and manage files

🔍 **Advanced Search**

- Full-text search across OCR extracted text
- Filter by file type, department, and date
- Quick access to recently added files

📊 **Tracking & Logs**

- Track file checkout/return history
- View user access logs
- Export tracking data as CSV

⚙️ **Admin Settings**

- Manage storage locations
- Configure departments
- User management and permissions
- System settings (expiration, notifications)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Icons**: Lucide React
- **Package Manager**: npm

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

The Firebase config is already set up in `app/lib/firebase.ts` with your project credentials.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ocr-project/
├── app/
│   ├── lib/
│   │   ├── firebase.ts           # Firebase initialization
│   │   ├── auth-context.tsx      # Authentication context
│   │   └── firestore.ts          # Firestore operations
│   ├── components/
│   │   ├── Navbar.tsx            # Top navigation
│   │   └── Sidebar.tsx           # Side navigation
│   ├── (app)/                    # Protected routes
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── search/
│   │   ├── files/[id]/
│   │   ├── tracking/
│   │   └── settings/
│   ├── login/                    # Authentication page
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── middleware.ts                 # Next.js middleware
├── package.json
├── tsconfig.json
└── README.md
```

## Page Routes

| Route         | Description                              |
| ------------- | ---------------------------------------- |
| `/`           | Landing page with features & demo        |
| `/login`      | User authentication (sign in/sign up)    |
| `/dashboard`  | Main dashboard with stats & quick access |
| `/upload`     | Upload files with OCR processing         |
| `/search`     | Search & filter documents                |
| `/files/[id]` | View file details & extracted text       |
| `/tracking`   | View file movement logs                  |
| `/settings`   | Admin settings & configuration           |

## Firebase Integration

### Authentication

- Firebase Authentication with email/password
- Persistent user sessions
- Protected routes via AuthProvider context

### Firestore Database

Collections:

- **files**: Stores file metadata, OCR text, and location info
- **tracking**: Logs file movements and access history

### Firebase Storage

- Stores uploaded files in `uploads/{userId}/{timestamp}_{filename}` path
- Generates secure download URLs

## Building for Production

```bash
npm run build
npm start
```

## Deployment

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Vercel

```bash
vercel
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

## Environment Variables

Firebase is pre-configured. For customization, create `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
```

## Key Features

### Login System

- Email/password authentication
- Sign up for new users
- Password reset (ready for implementation)
- Persistent sessions

### Dashboard

- Display file statistics
- Quick search bar
- Shortcuts to main features
- Recent files list

### Upload Page

- Drag & drop file upload
- OCR text extraction (simulation ready for real API)
- File metadata form
- Preview extracted text

### Search Page

- Full-text search functionality
- Filter by type, department, date
- Display search results with location info
- View file details

### File Details

- Complete file metadata
- Full OCR extracted text
- Tags and notes
- View, download, edit options

### Tracking

- File movement logs
- User activity tracking
- Filterable log table
- Export to CSV

### Settings

- Manage storage locations
- Configure departments
- User management
- System preferences

## API Integration Points

Ready to integrate with:

- **OCR Service**: Google Vision API, AWS Textract, or other OCR providers
- **Email Service**: Firebase Cloud Functions for notifications
- **Real-time Updates**: Firestore listeners for live data

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - feel free to use this project!

## Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ by DocuMind AI Team**
