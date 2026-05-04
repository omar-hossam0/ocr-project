import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Use the backend API directly for user updates.",
    },
    { status: 405 },
  );
}

export async function DELETE(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Use the backend API directly for user deletion.",
    },
    { status: 405 },
  );
}
