import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

// Check if S3 is configured
const isS3Configured = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET
);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// Local storage directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum allowed size is 50MB.' },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Try S3 first if configured
    if (isS3Configured && s3Client) {
      try {
        // Create unique filename
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `uploads/${uniqueSuffix}-${filename}`;

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
        console.error('S3 Upload Error:', s3Error);
        // Fall through to local storage
      }
    }

    // Local storage fallback
    await ensureUploadDir();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localFileName = `${uniqueSuffix}-${filename}`;
    const localPath = path.join(UPLOAD_DIR, localFileName);

    await fs.writeFile(localPath, buffer);
    
    // Return local file URL that OCR can access
    const storageUrl = `file://${localPath}`;
    
    return NextResponse.json({ 
      storageUrl,
      localPath: localPath,
      storageType: 'local'
    });
  } catch (error) {
    console.error('Upload Error:', error);
    // Return success with null storageUrl instead of error
    return NextResponse.json({ 
      storageUrl: null,
      warning: 'File upload failed. Metadata saved without storage URL.'
    }, { status: 200 });
  }
}
