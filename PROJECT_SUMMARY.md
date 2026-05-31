# OCR Document Management System - Project Summary

## 1. Project Concept and Objectives
The project is a comprehensive Document Management System (DMS) integrated with Optical Character Recognition (OCR) capabilities. The primary goal is to digitize physical and digital documents (images and multi-page PDFs), extract their text in both Arabic and English, and index this text in a cloud database to enable instant search and retrieval.

Key objectives include:
* Achieving high-accuracy text recognition (exceeding 95%) for complex bilingual documents.
* Fixing disjointed or reversed Arabic character rendering by applying text reshaping and bidirectional layout algorithms.
* Ensuring rapid document scanning by supporting direct live camera feeds from mobile and desktop browsers.
* Optimizing processing speed by utilizing NVIDIA GPU acceleration via CUDA, reducing processing time by up to 9 times.
* Providing a secure, authenticated, and searchable repository for files and extracted text metadata.

---

## 2. Frontend Architecture and Features
The frontend is built as a single-page application optimized for speed, responsive design, and user interaction.

### Tech Stack
* Core Framework: Next.js (React 19) with TypeScript.
* Styling: TailwindCSS (v4) for responsive utility-first layouts.
* Animations: GSAP and Motion for fluid page transitions and interactive micro-animations.
* Document Export: jspdf to generate printable PDF files directly from the UI.
* Browser-based OCR: tesseract.js integrated as a client-side backup engine.
* Theme Management: next-themes for dark and light mode persistence.

### Key Pages and Modules
* Dashboard: Displays recent activities, uploaded files, and upload statistics.
* Upload Section: Includes a drag-and-drop file interface for uploading images and PDF documents.
* Live Camera Scanner: Captures documents directly via device camera, offering real-time video feed and preview controls.
* Verification and Metadata Editor: Displays OCR results immediately for user correction. Allows assigning department categories, physical cabinet locations, and tags.
* Document Search: A dedicated search interface performing full-text search against the indexed OCR text in MongoDB.

---

## 3. Backend Architecture and API Endpoints
The backend is a Node.js web server that manages authentication, routes file uploads, processes database operations, and communicates with the Python OCR services.

### Tech Stack
* Web Server: Express (configured using ES Modules).
* Upload Handling: Multer to parse multipart/form-data and handle memory storage.
* Security: bcryptjs for password hashing and jsonwebtoken (JWT) for stateless session token generation and route protection.
* Rate Limiting: express-rate-limit to protect public routes from denial of service.

### OCR Execution Strategy
To guarantee uptime and resilience, the backend routes OCR requests through a prioritized pipeline:
1. Local OCR Server: An active HTTP Flask server running on port 5000. It keeps models preloaded in memory, resulting in response times under 3 seconds.
2. Remote OCR Server: An optional cloud endpoint config.
3. Standalone Python Runner: A backup that spawns a child process invoking the python script `ocr_runner.py` directly if the server is offline.
4. Javascript Engine: A local tesseract.js parser execution on images if python processes are unavailable.

---

## 4. Database Schema and MongoDB Integration
Data persistence is handled by a MongoDB Atlas database cluster connected via the official MongoDB native driver.

### Database Collections
* files: Stores metadata for each uploaded file.
  * Unique ID
  * Filename and original uploaded name
  * Storage path/URL
  * Extracted text (ocrText)
  * Metadata (department, physical storage cabinet/drawer, custom tags)
  * Audit details (uploaded by, upload date, status)
* users: Stores user login information.
  * Username/email
  * Salted password hash
  * User roles (Admin, User)
  * Timestamps
* tracking: Serves as an audit log trailing all actions (upload, search, modifications) containing:
  * File ID
  * Performed action
  * Username
  * Timestamp

---

## 5. OCR and AI Models
The extraction engine leverages deep learning models optimized for bilingual documents, specifically focusing on correcting Arabic OCR output.

### Tech Stack
* Core Engine: EasyOCR, a deep learning text recognition tool using PyTorch.
* Preprocessing: OpenCV (opencv-python-headless) and Pillow for contrast enhancement, noise reduction, and thresholding.
* Arabic Layout Corrector: arabic-reshaper and python-bidi.
* PDF Parsing: PyPDFium2 to render PDF pages into images at high resolution.
* Web Server: Flask on port 5000 to keep EasyOCR models preloaded.
* Generative AI (Optional): Ollama integration (qwen2.5:3b model) for summarizing text and querying documents.

---

## 6. Unified Web System Integration
The system integrates all layers into a unified full-stack application managed by a single process.

### Service Orchestration
The orchestration script `dev-complete-stack.mjs` runs the entire stack simultaneously:
1. Detects GPU capabilities and checks if CUDA is available for PyTorch.
2. Confirms MongoDB Atlas credentials and tests connectivity.
3. Starts the Express backend on port 4000.
4. Starts the Flask OCR model server on port 5000.
5. Starts the Next.js frontend on port 3000.
6. Polls health check endpoints to ensure services are fully initialized.

### End-to-End Data Flow
1. Document Input: A user uploads a PDF or takes a picture via the Next.js frontend camera interface.
2. API Request: The file is sent as a POST request to `/api/ocr` (or `/api/camera-ocr-v2/capture`).
3. OCR Processing: The Express backend forwards the file to the Flask OCR server. The Flask server runs pre-processing via OpenCV, extracts text page-by-page via EasyOCR on the GPU (or CPU fallback), reshapes the Arabic characters, and returns JSON.
4. Editing and Metadata: The user reviews the extracted text on the frontend, enters metadata, and clicks Save.
5. Data Archiving: The frontend sends the structured document package to `/api/files`. The Express backend saves the document metadata and OCR text inside MongoDB.
6. Retrieval: The document and its text are immediately indexable and searchable via the search page.
