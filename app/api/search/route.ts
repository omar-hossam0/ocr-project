import { NextRequest, NextResponse } from "next/server";
import {
  searchFilesWithPreview,
  getFilesByDepartment,
  SearchResultItem,
  clearFilesCache,
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
    const limit = Number(searchParams.get("limit") || "50");
    const previewLength = Number(searchParams.get("previewLength") || "120");
    const forceFresh = searchParams.get("fresh") === "true";

    if (forceFresh) {
      clearFilesCache();
    }

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

    let results: SearchResultItem[] = [];

    if (department) {
      const files = await getFilesByDepartment(department);
      results = files.slice(0, limit).map((file) => ({
        id: file.id || "",
        fileName: file.name || "",
        documentType: file.documentType || file.fileType || "Unknown",
        physicalLocation: file.physicalLocation || file.location || "Unknown",
        ocrPreview: (file.ocrText || "").slice(0, previewLength),
        matchField: "ocrText",
      }));
    } else if (keyword) {
      results = await searchFilesWithPreview(keyword, {
        limit,
        previewLength,
        forceFresh,
      });
    }

    return NextResponse.json({
      success: true,
      query: keyword || department,
      data: results,
      count: results.length || 0,
      searchableColumns: [
        "name",
        "ocrText",
        "documentType",
        "physicalLocation",
        "tags",
      ],
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
