import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { updateFile } from "@/app/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QueueBody = {
  fileId?: string;
  storageUrl?: string;
  fileType?: string;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QueueBody;

    if (!body.fileId || !body.storageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "fileId and storageUrl are required",
        },
        { status: 400 },
      );
    }

    await withTimeout(
      updateFile(body.fileId, {
        status: "processing",
        notes: "OCR processing in background",
      }),
      15000,
      "Queue status update",
    );

    const workerScript = path.join(
      process.cwd(),
      "scripts",
      "ocr-queue-worker.mjs",
    );
    const worker = spawn(
      process.execPath,
      [workerScript, body.fileId, body.storageUrl, body.fileType || ""],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          OCR_APP_BASE_URL:
            process.env.OCR_APP_BASE_URL ||
            `${request.nextUrl.protocol}//${request.nextUrl.host}`,
        },
      },
    );

    worker.unref();

    return NextResponse.json(
      {
        success: true,
        message: "OCR started in background",
        fileId: body.fileId,
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to queue OCR";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
