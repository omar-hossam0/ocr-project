import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "crypto";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

// Check if S3 is configured
const isS3Configured = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET,
);

let s3Client: S3Client | null = null;
let s3DisabledReason: string | null = null;
let s3DisabledLogged = false;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function shouldUseS3() {
  return Boolean(isS3Configured && s3Client && !s3DisabledReason);
}

function disableS3(reason: string) {
  s3DisabledReason = reason;
  if (!s3DisabledLogged) {
    console.warn(`S3 uploads disabled for this process: ${reason}`);
    s3DisabledLogged = true;
  }
}

// Local storage directory
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 50MB." },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try S3 first if configured
    if (shouldUseS3()) {
      try {
        // Create unique filename
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = `uploads/${uniqueSuffix}-${filename}`;

        if (!s3Client) {
          throw new Error("S3 client not initialized");
        }

        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        });

        await s3Client.send(command);

        const storageUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        return NextResponse.json({ storageUrl });
      } catch (s3Error) {
        const errorInfo = s3Error as {
          name?: string;
          Code?: string;
          code?: string;
        };
        const errorCode =
          errorInfo?.Code ||
          errorInfo?.code ||
          errorInfo?.name ||
          "UnknownError";
        const disableCodes = new Set([
          "InvalidAccessKeyId",
          "AccessDenied",
          "SignatureDoesNotMatch",
          "CredentialsError",
          "ExpiredToken",
        ]);

        if (disableCodes.has(String(errorCode))) {
          disableS3(String(errorCode));
          console.warn(
            "S3 upload failed due to credentials. Falling back to local.",
          );
        } else {
          console.error("S3 Upload Error:", s3Error);
        }
        // Fall through to local storage
      }
    }

    // Local storage fallback
    await ensureUploadDir();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const localFileName = `${uniqueSuffix}-${filename}`;
    const localPath = path.join(UPLOAD_DIR, localFileName);

    await fs.writeFile(localPath, buffer);

    // Return local file URL that OCR can access
    const storageUrl = `file://${localPath}`;

    return NextResponse.json({
      storageUrl,
      localPath: localPath,
      storageType: "local",
    });
  } catch (error) {
    console.error("Upload Error:", error);
    // Return success with null storageUrl instead of error
    return NextResponse.json(
      {
        storageUrl: null,
        warning: "File upload failed. Metadata saved without storage URL.",
      },
      { status: 200 },
    );
  }
}
