import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Backend URL is not configured. Set BACKEND_URL.",
        },
        { status: 503 },
      );
    }

    if (process.env.NODE_ENV === "production" && isLocalhostUrl(BACKEND_URL)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Backend URL points to localhost in production. Set BACKEND_URL to the deployed backend service.",
        },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "File is required" },
        { status: 400 },
      );
    }

    const forwardData = new FormData();
    forwardData.append("file", file, file.name || "avatar.jpg");

    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: forwardData,
      cache: "no-store",
    });

    const responseText = await response.text();
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    return new NextResponse(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile photo upload failed";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 503 },
    );
  }
}
