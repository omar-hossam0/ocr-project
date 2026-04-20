import { NextRequest, NextResponse } from "next/server";
import {
  deleteSettingsDepartment,
  DepartmentSetting,
  updateSettingsDepartment,
} from "@/app/lib/firestore";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<DepartmentSetting>;
    await updateSettingsDepartment(id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update department";
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
    await deleteSettingsDepartment(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete department";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
