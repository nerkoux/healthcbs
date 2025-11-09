import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import SharedAccess from '@/models/SharedAccess';

// GET /api/repositories - Get user's repositories and shared repositories
export async function GET(request: NextRequest) {
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

    // Get owned repositories
    const ownedRepos = await Repository.find({ ownerId: user._id })
      .sort({ updatedAt: -1 })
      .lean();

    // Get shared repositories
    const sharedAccess = await SharedAccess.find({
      sharedWithUserId: user._id,
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .lean();

    // Get repository IDs
    const sharedRepoIds = sharedAccess.map(access => access.repositoryId);

    // Fetch the actual repositories
    const sharedRepos = await Repository.find({
      _id: { $in: sharedRepoIds }
    })
      .sort({ updatedAt: -1 })
      .lean();

    const data = {
      owned: ownedRepos,
      shared: sharedRepos,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/repositories:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/repositories - Create a new repository
export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, isPrivate = true } = await request.json();

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Repository name must be at least 3 characters' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if repository with same name already exists for this user
    const existingRepo = await Repository.findOne({
      ownerId: user._id,
      name: name.trim(),
    });

    if (existingRepo) {
      return NextResponse.json(
        { error: 'You already have a repository with this name' },
        { status: 400 }
      );
    }

    const repository = await Repository.create({
      name: name.trim(),
      description: description?.trim(),
      ownerId: user._id,
      ownerUsername: user.username,
      isPrivate,
    });

    return NextResponse.json({ repository }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/repositories:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
