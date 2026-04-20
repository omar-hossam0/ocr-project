import { NextRequest, NextResponse } from "next/server";
import {
  deleteSettingsLocation,
  StorageLocationSetting,
  updateSettingsLocation,
} from "@/app/lib/firestore";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<StorageLocationSetting>;
    await updateSettingsLocation(id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update location";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteSettingsLocation(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete location";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
