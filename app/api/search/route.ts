import { NextRequest, NextResponse } from "next/server";
import {
  searchFiles,
  getFilesByDepartment,
  FileData,
} from "@/app/lib/firestore";

/**
 * GET /api/search
 * Search files by keyword or department
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("q");
    const department = searchParams.get("department");

    if (!keyword && !department) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide 'q' (search keyword) or 'department' parameter",
        },
        { status: 400 },
      );
    }

    let results: FileData[] = [];

    if (department) {
      results = await getFilesByDepartment(department);
    } else if (keyword) {
      results = await searchFiles(keyword);
    }

    return NextResponse.json({
      success: true,
      query: keyword || department,
      data: results,
      count: results.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Search failed";
    console.error("Search API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
