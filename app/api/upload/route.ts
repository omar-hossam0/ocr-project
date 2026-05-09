import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

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

export async function POST(request: Request) {
  try {
    // Check if S3 is configured
    if (!isS3Configured || !s3Client) {
      return NextResponse.json({ 
        error: 'S3 storage not configured. File metadata will be saved without storage URL.',
        storageUrl: null 
      }, { status: 200 }); // Return 200 to allow continuing without S3
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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
  } catch (error) {
    console.error('S3 Upload Error:', error);
    // Return success with null storageUrl instead of error
    return NextResponse.json({ 
      storageUrl: null,
      warning: 'File uploaded but S3 storage failed. Metadata saved without storage URL.'
    }, { status: 200 });
  }
}
