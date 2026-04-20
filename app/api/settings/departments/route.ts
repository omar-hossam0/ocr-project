import { NextRequest, NextResponse } from "next/server";
import {
  addSettingsDepartment,
  DepartmentSetting,
  getSettingsDepartments,
} from "@/app/lib/firestore";

export async function GET() {
  try {
    const data = await getSettingsDepartments();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch departments";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DepartmentSetting>;
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 },
      );
    }

    const id = await addSettingsDepartment({
      name: body.name,
      filesCount: Number(body.filesCount || 0),
    });

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create department";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
