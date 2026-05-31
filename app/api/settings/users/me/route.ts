import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

async function proxyMeRequest(request: NextRequest) {
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

  const targetUrl = new URL(`${BACKEND_URL}/api/settings/users/me`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
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
}

export async function GET(request: NextRequest) {
  return proxyMeRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyMeRequest(request);
}
