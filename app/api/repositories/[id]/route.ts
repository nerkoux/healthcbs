import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import SharedAccess from '@/models/SharedAccess';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/repositories/[id] - Get repository details
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

    const repository = await Repository.findById(id);

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Check if user has access
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

    // Get files in repository
    const files = await File.find({ repositoryId: repository._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ repository, files, isOwner });
  } catch (error: any) {
    console.error('Error in GET /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/repositories/[id] - Update repository
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    const repository = await Repository.findOne({
      _id: id,
      ownerId: user._id,
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Update fields
    if (data.name) repository.name = data.name.trim();
    if (data.description !== undefined) repository.description = data.description?.trim();
    if (typeof data.isPrivate !== 'undefined') repository.isPrivate = data.isPrivate;

    await repository.save();

    return NextResponse.json({ repository });
  } catch (error: any) {
    console.error('Error in PATCH /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/repositories/[id] - Delete repository
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const repository = await Repository.findOne({
      _id: id,
      ownerId: user._id,
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Delete all files in repository
    await File.deleteMany({ repositoryId: repository._id });
    
    // Delete all shared access
    await SharedAccess.deleteMany({ repositoryId: repository._id });
    
    // Delete repository
    await repository.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
