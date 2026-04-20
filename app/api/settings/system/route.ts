import { NextRequest, NextResponse } from "next/server";
import {
  getSystemSettings,
  SystemSettings,
  updateSystemSettings,
} from "@/app/lib/firestore";

export async function GET() {
  try {
    const data = await getSystemSettings();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch system settings";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SystemSettings>;
    await updateSystemSettings(body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update system settings";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
