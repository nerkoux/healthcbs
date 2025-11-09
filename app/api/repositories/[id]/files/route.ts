import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import SharedAccess from '@/models/SharedAccess';
import { getCached, setCache } from '@/lib/redis';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/repositories/[id]/files - Get files in repository
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Check cache
    const cacheKey = `repository:${id}:files:${user._id}`;
    let files = await getCached<any>(cacheKey);

    if (!files) {
      // Check if user has access to repository
      const repository = await Repository.findById(id);

      if (!repository) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }

      const isOwner = repository.ownerId.toString() === (user._id as any).toString();
      
      if (!isOwner) {
        const access = await SharedAccess.findOne({
          repositoryId: repository._id,
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

      // Get files
      files = await File.find({ repositoryId: repository._id })
        .sort({ uploadedAt: -1 })
        .lean();

      // Cache for 5 minutes
      await setCache(cacheKey, files, 300);
    }

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error in GET /api/repositories/[id]/files:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
