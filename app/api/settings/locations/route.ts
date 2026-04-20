import { NextRequest, NextResponse } from "next/server";
import {
  addSettingsLocation,
  getSettingsLocations,
  StorageLocationSetting,
} from "@/app/lib/firestore";

export async function GET() {
  try {
    const data = await getSettingsLocations();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch locations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<StorageLocationSetting>;
    if (!body.name || !body.type) {
      return NextResponse.json(
        { success: false, error: "name and type are required" },
        { status: 400 },
      );
    }

    const id = await addSettingsLocation({
      name: body.name,
      type: body.type,
    });

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create location";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
