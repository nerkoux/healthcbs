import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import File from '@/models/File';
import Repository from '@/models/Repository';
import SharedAccess from '@/models/SharedAccess';
import { downloadFromR2 } from '@/lib/r2';
import { decryptBuffer } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get file metadata
    const file = await File.findById(fileId);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access
    const isOwner = file.ownerId.toString() === (user._id as any).toString();
    
    if (!isOwner) {
      // Check if repository is shared with user
      const access = await SharedAccess.findOne({
        repositoryId: file.repositoryId,
        sharedWithUserId: user._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Download from R2
    const encryptedData = await downloadFromR2(file.r2Key);

    // Decrypt the file
    const decryptedData = decryptBuffer(encryptedData);

    // Return decrypted file
    return new NextResponse(new Uint8Array(decryptedData), {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Content-Length': decryptedData.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/download:', error);
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    );
  }
}
