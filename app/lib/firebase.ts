import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// ✅ Verified with Console - March 9, 2026
const firebaseConfig = {
  apiKey: "AIzaSyC1xDkNx8IomETXn3LJvBXkBJvAohvy4xQ",
  authDomain: "ocr-project-f91fc.firebaseapp.com",
  projectId: "ocr-project-f91fc",
  storageBucket: "ocr-project-f91fc.firebasestorage.app",
  messagingSenderId: "907042072904",
  appId: "1:907042072904:web:311073ee8fbf268b4c2b7d",
  measurementId: "G-2DV4PRH9KZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore (Main Database)
export const db = getFirestore(app);

// Initialize Cloud Storage (File Upload)
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch (error) {
    console.log("Analytics not available in this environment");
  }
}

// ✅ Verification logging (remove in production)
if (typeof window !== "undefined") {
  console.log("✅ Firebase initialized successfully");
  console.log("📊 Project ID:", firebaseConfig.projectId);
  console.log("🔐 Auth Domain:", firebaseConfig.authDomain);
  console.log("💾 Using Firestore only (no Realtime DB)");
}

export default app;
