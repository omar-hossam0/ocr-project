import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/**
 * GET /api/health
 * Check backend connection status
 */
export async function GET() {
  try {
    // Test backend connection
    let backendStatus = "❌";
    let backendMessage = "Not connected";
    try {
      const res = await fetch(`${BACKEND}/api/health`, { cache: "no-store" });
      if (res.ok) {
        backendStatus = "✅";
        backendMessage = "Connected";
      } else {
        backendMessage = `HTTP ${res.status}`;
      }
    } catch {
      backendMessage = "Connection failed";
    }

    const checks = {
      backend: backendStatus,
      timestamp: new Date().toISOString(),
    };

    const allHealthy = backendStatus === "✅";

    return NextResponse.json({
      success: allHealthy,
      status: allHealthy ? "healthy" : "degraded",
      checks: {
        "Backend API": checks.backend,
        "Backend Status": backendMessage,
        "Last Check": checks.timestamp,
      },
      message: allHealthy
        ? "✅ Backend is connected and running"
        : "⚠️ Backend may not be available",
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
