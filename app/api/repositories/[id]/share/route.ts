import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import SharedAccess from '@/models/SharedAccess';
import { invalidatePattern } from '@/lib/redis';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/repositories/[id]/share - Get shared access list
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

    const repository = await Repository.findOne({
      _id: id,
      ownerId: user._id,
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    const sharedAccess = await SharedAccess.find({
      repositoryId: repository._id,
      isActive: true,
    })
      .populate('sharedWithUserId', 'username name email picture')
      .populate('sharedBy', 'username name')
      .sort({ sharedAt: -1 })
      .lean();

    return NextResponse.json({ sharedAccess });
  } catch (error: any) {
    console.error('Error in GET /api/repositories/[id]/share:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/repositories/[id]/share - Share repository with user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, accessLevel = 'read', expiresInDays } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Find user to share with
    const shareWithUser = await User.findOne({ username: username.toLowerCase() });

    if (!shareWithUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow sharing with self
    if ((shareWithUser._id as any).toString() === (user._id as any).toString()) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    // Check if already shared
    const existingAccess = await SharedAccess.findOne({
      repositoryId: repository._id,
      sharedWithUserId: shareWithUser._id,
    });

    let expiresAt;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    if (existingAccess) {
      // Update existing access
      existingAccess.accessLevel = accessLevel;
      existingAccess.isActive = true;
      existingAccess.expiresAt = expiresAt;
      existingAccess.revokedAt = undefined;
      await existingAccess.save();

      return NextResponse.json({ sharedAccess: existingAccess });
    }

    // Create new shared access
    const sharedAccess = await SharedAccess.create({
      repositoryId: repository._id,
      ownerId: user._id,
      sharedWithUserId: shareWithUser._id,
      sharedWithUsername: shareWithUser.username,
      accessLevel,
      sharedBy: user._id,
      expiresAt,
    });

    // Invalidate cache
    await invalidatePattern(`repositories:${shareWithUser._id}`);

    return NextResponse.json({ sharedAccess }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/repositories/[id]/share:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/repositories/[id]/share - Revoke shared access
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sharedAccessId = searchParams.get('accessId');

    if (!sharedAccessId) {
      return NextResponse.json({ error: 'Access ID required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    const sharedAccess = await SharedAccess.findOne({
      _id: sharedAccessId,
      repositoryId: id,
      ownerId: user._id,
    });

    if (!sharedAccess) {
      return NextResponse.json({ error: 'Shared access not found' }, { status: 404 });
    }

    sharedAccess.isActive = false;
    sharedAccess.revokedAt = new Date();
    await sharedAccess.save();

    // Invalidate cache
    await invalidatePattern(`repositories:${sharedAccess.sharedWithUserId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/repositories/[id]/share:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
