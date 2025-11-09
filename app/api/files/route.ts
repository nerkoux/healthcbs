import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import { r2Client } from '@/lib/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // List objects in user's folder
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${userId}/`,
    });

    const response = await r2Client.send(command);

    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      name: obj.Key?.split('/').pop()?.replace('.enc', '') || 'unknown',
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
