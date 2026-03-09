import { NextRequest, NextResponse } from "next/server";
import { getDailyStats, getAllTimeStats } from "@/app/lib/firestore";

/**
 * GET /api/stats
 * Fetch statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "daily"; // daily | all-time
    const date = searchParams.get("date"); // YYYY-MM-DD format for daily stats

    let stats;

    if (type === "all-time") {
      stats = await getAllTimeStats();
    } else {
      stats = await getDailyStats(date || undefined);
    }

    return NextResponse.json({
      success: true,
      type,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch statistics";
    console.error("Stats API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
