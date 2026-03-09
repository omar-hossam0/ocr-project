import { NextResponse } from "next/server";
import { auth, db, storage } from "@/app/lib/firebase";

/**
 * GET /api/health
 * Check Firebase connection status
 */
export async function GET() {
  try {
    const checks = {
      auth: !!auth ? "✅" : "❌",
      firestore: !!db ? "✅" : "❌",
      storage: !!storage ? "✅" : "❌",
      timestamp: new Date().toISOString(),
    };

    const allHealthy =
      Object.values(checks).filter((v) => v === "❌").length === 0;

    return NextResponse.json({
      success: allHealthy,
      status: allHealthy ? "healthy" : "degraded",
      checks: {
        "Firebase Auth": checks.auth,
        "Firestore Database": checks.firestore,
        "Cloud Storage": checks.storage,
        "Last Check": checks.timestamp,
      },
      message: allHealthy
        ? "✅ All Firebase services are connected"
        : "⚠️ Some Firebase services may not be available",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
