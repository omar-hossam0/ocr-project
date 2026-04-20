import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Manual user update is disabled. Users are synced from real auth accounts.",
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
        "Manual user deletion is disabled. Delete accounts from Firebase Auth Admin.",
    },
    { status: 405 },
  );
}
