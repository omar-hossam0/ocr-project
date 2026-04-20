import { NextRequest, NextResponse } from "next/server";
import { getSettingsUsersFromAccounts } from "@/app/lib/firestore";

export async function GET() {
  try {
    const data = await getSettingsUsersFromAccounts();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Manual user creation is disabled. Users come from real auth accounts.",
    },
    { status: 405 },
  );
}
