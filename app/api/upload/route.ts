import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import { uploadToR2 } from '@/lib/r2';
import { encryptBuffer } from '@/lib/encryption';
import { invalidatePattern } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const repositoryId = formData.get('repositoryId') as string;
    const fileType = (formData.get('fileType') as string) || 'other';
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify repository ownership
    const repository = await Repository.findOne({
      _id: repositoryId,
      ownerId: user._id,
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Encrypt the file
    const encryptedBuffer = encryptBuffer(buffer);

    // Generate R2 key
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `repositories/${repository._id}/${timestamp}-${sanitizedFilename}`;

    // Upload to R2
    await uploadToR2(encryptedBuffer, r2Key, file.type, {
      originalName: file.name,
      userId: (user._id as any).toString(),
      repositoryId: (repository._id as any).toString(),
    });

    // Save file metadata to database
    const fileDoc = await File.create({
      name: file.name,
      originalName: file.name,
      r2Key,
      repositoryId: repository._id,
      ownerId: user._id,
      size: buffer.length,
      mimeType: file.type,
      fileType,
      description,
    });

    // Update repository stats
    repository.filesCount += 1;
    repository.totalSize += buffer.length;
    await repository.save();

    // Invalidate cache
    await invalidatePattern(`repositories:${user._id}`);

    return NextResponse.json({
      success: true,
      file: fileDoc,
    });
  } catch (error: any) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
