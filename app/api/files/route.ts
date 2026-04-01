import { NextRequest, NextResponse } from "next/server";
import {
  getAllFiles,
  addFile,
  FileData,
} from "@/app/lib/firestore";

/**
 * GET /api/files
 * Fetch all files
 */
export async function GET() {
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

/**
 * POST /api/files
 * Save a scanned file metadata + OCR text
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<FileData> & {
      fileName?: string;
      physicalLocation?: string;
    };

    const name = body.name || body.fileName;
    const ocrText = body.ocrText || "";
    const location = body.physicalLocation || body.location;

    if (!name || !location) {
      return NextResponse.json(
        {
          success: false,
          error: "'name' (or 'fileName') and 'physicalLocation' are required",
        },
        { status: 400 },
      );
    }

    const filePayload: FileData = {
      name,
      originalName: body.originalName || name,
      location,
      physicalLocation: location,
      department: body.department || "General",
      fileType: body.fileType || "document",
      documentType: body.documentType || body.fileType || "document",
      uploadedBy: body.uploadedBy || "system",
      uploadedAt: new Date(),
      modifiedAt: new Date(),
      modifiedBy: body.modifiedBy || body.uploadedBy || "system",
      tags: Array.isArray(body.tags) ? body.tags : [],
      notes: body.notes || "",
      ocrText,
      storageUrl: body.storageUrl,
      fileSize: Number(body.fileSize || 0),
      status: body.status || "available",
    };

    const createdId = await addFile(filePayload);

    return NextResponse.json(
      {
        success: true,
        message: "File metadata saved successfully",
        data: {
          id: createdId,
          fileName: filePayload.name,
          documentType: filePayload.documentType,
          physicalLocation: filePayload.physicalLocation,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save file";
    console.error("Files POST API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
