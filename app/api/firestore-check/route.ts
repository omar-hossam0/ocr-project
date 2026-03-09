import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

export async function GET() {
  const result = {
    firestoreExists: false,
    canRead: false,
    canWrite: false,
    error: undefined as string | undefined,
    message: "Checking Firestore...",
  };

  try {
    // Test 1: Try to read from a test collection
    console.log("🔍 Testing Firestore read...");
    try {
      await getDocs(collection(db, "test_collection"));
      result.canRead = true;
      result.firestoreExists = true;
    } catch (readError: unknown) {
      const err = readError as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        result.error = "Permission denied - check Security Rules";
      } else if (
        err.code === "not-found" ||
        err.message?.includes("not-found")
      ) {
        result.firestoreExists = false;
        result.error = "Firestore database not created yet";
      } else {
        result.error = err.message || String(readError);
      }
    }

    // Test 2: Try to write to Firestore
    if (result.canRead) {
      console.log("🔍 Testing Firestore write...");
      try {
        const docRef = await addDoc(collection(db, "test_collection"), {
          test: true,
          timestamp: new Date().toISOString(),
          message: "This is a test document",
        });

        // Immediately delete it
        await deleteDoc(doc(db, "test_collection", docRef.id));
        result.canWrite = true;
      } catch (writeError: unknown) {
        const err = writeError as { code?: string; message?: string };
        if (err.code === "permission-denied") {
          result.error = "Write permission denied - check Security Rules";
        } else {
          result.error = err.message || String(writeError);
        }
      }
    }

    // Set appropriate message
    if (result.firestoreExists && result.canRead && result.canWrite) {
      result.message = "✅ Firestore is properly configured and ready to use!";
    } else if (result.firestoreExists && result.canRead) {
      result.message =
        "⚠️ Firestore exists with read access, but write permission is missing";
    } else if (!result.firestoreExists) {
      result.message =
        "❌ Firestore database not created. Please follow the setup guide at /firebase-setup";
    } else {
      result.message =
        "❌ Cannot connect to Firestore. Check your configuration and Security Rules.";
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    result.error = err.message || String(error);
    result.message = "❌ Error checking Firestore status";
  }

  return NextResponse.json(result);
}
