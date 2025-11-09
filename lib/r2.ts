import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
  throw new Error('Please add your Cloudflare R2 credentials to .env.local');
}

// Cloudflare R2 S3 API endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' as the region (also accepts empty string or 'us-east-1')
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Force path-style addressing for R2 compatibility
  forcePathStyle: false,
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      // R2 supports custom metadata
      Metadata: metadata,
      // Use STANDARD storage class (R2 also supports STANDARD_IA for infrequent access)
      StorageClass: 'STANDARD',
    });

    await r2Client.send(command);

    // Return the object key - use signed URLs for secure access
    return key;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to R2');
  }
}

export async function getSignedUrlFromR2(key: string, expiresIn = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate a presigned URL that expires after the specified time
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL from R2:', error);
    throw new Error('Failed to generate signed URL');
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw new Error('Failed to delete file from R2');
  }
}

// Helper to convert readable stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    
    if (!response.Body) {
      throw new Error('File not found in R2');
    }

    // Convert stream to buffer
    const buffer = await streamToBuffer(response.Body);
    return buffer;
  } catch (error) {
    console.error('Error downloading from R2:', error);
    throw new Error('Failed to download file from R2');
  }
}

export function generateFileKey(
  type: 'report' | 'prescription',
  patientId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}s/${patientId}/${timestamp}-${sanitizedFilename}`;
}
