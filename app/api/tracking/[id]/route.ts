import { NextRequest, NextResponse } from "next/server";
import { deleteFileTransaction } from "@/app/lib/firestore";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Tracking record id is required",
        },
        { status: 400 },
      );
    }

    await deleteFileTransaction(id);

    return NextResponse.json({
      success: true,
      message: "Tracking record deleted successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete tracking record";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}