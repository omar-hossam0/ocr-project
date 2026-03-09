// Quick Firebase Auth Test
// Run with: node test-firebase-auth.js

const admin = require("firebase-admin");

// These are your Firebase config values from the client app
const firebaseConfig = {
  apiKey: "AIzaSyC1xDkNx8IomETXn3LJvAohvy4xQ",
  authDomain: "ocr-project-f91fc.firebaseapp.com",
  projectId: "ocr-project-f91fc",
  storageBucket: "ocr-project-f91fc.firebasestorage.app",
  messagingSenderId: "907042072904",
  appId: "1:907042072904:web:311073ee8fbf268b4c2b7d",
  databaseURL: "https://ocr-project-f91fc-default-rtdb.firebaseio.com",
};

console.log("✓ Firebase config loaded");
console.log("✓ Project ID:", firebaseConfig.projectId);
console.log("✓ Auth Domain:", firebaseConfig.authDomain);
console.log("\nNow manually verify in Firebase Console:");
console.log("1. Go to https://console.firebase.google.com");
console.log("2. Select 'ocr-project-f91fc'");
console.log("3. Go to Authentication → Providers");
console.log("4. Make sure 'Email/Password' is ENABLED");
console.log("\nIf it's disabled, click it and enable it.");
