import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;
    const targetUrl = new URL(`${BACKEND_URL}/api/storage/${id}`);
    targetUrl.search = request.nextUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Storage proxy failed";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 503 },
    );
  }
}
