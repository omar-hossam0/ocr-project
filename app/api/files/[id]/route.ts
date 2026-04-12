import { NextRequest, NextResponse } from "next/server";
import { getFile, updateFile, FileData } from "@/app/lib/firestore";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "File id is required",
        },
        { status: 400 },
      );
    }

    const file = await getFile(id);
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: file,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch file";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "File id is required",
        },
        { status: 400 },
      );
    }

    const updates = (await request.json()) as Partial<FileData>;
    await updateFile(id, updates);

    const updated = await getFile(id);
    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update file";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
