import { NextRequest, NextResponse } from "next/server";
import {
  getAllFiles,
  getDailyStats,
  getAllTimeStats,
} from "@/app/lib/firestore";

/**
 * GET /api/files
 * Fetch all files
 */
export async function GET(request: NextRequest) {
  try {
    const files = await getAllFiles();

    return NextResponse.json({
      success: true,
      data: files,
      count: files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch files";
    console.error("Files API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
