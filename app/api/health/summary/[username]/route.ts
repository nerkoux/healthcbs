import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import SharedAccess from '@/models/SharedAccess';
import { analyzeReportSummary, type HealthProfile } from '@/lib/gemini';

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

// POST /api/health/summary/[username] - Generate comprehensive health summary for shared access
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repositoryIds } = await request.json();
    const { username } = await params;

    await connectDB();
    
    const currentUser = await User.findOne({ auth0Id: session.user.sub });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the target user
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the current user has access to the repositories
    let repoQuery: any = {};
    
    if (repositoryIds && repositoryIds.length > 0) {
      repoQuery._id = { $in: repositoryIds };
    }

    // Check if current user is viewing their own summary or someone else's
    const isOwnProfile = (currentUser._id as any).toString() === (targetUser._id as any).toString();

    if (isOwnProfile) {
      // Own profile - get all repositories
      repoQuery.ownerId = currentUser._id;
    } else {
      // Someone else's profile - only get shared repositories
      const sharedAccess = await SharedAccess.find({
        sharedWithUserId: currentUser._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      const accessibleRepoIds = sharedAccess.map(a => a.repositoryId);
      
      if (repositoryIds && repositoryIds.length > 0) {
        repoQuery._id = {
          $in: repositoryIds.filter((id: string) =>
            accessibleRepoIds.some(repoId => repoId.toString() === id)
          ),
        };
      } else {
        repoQuery._id = { $in: accessibleRepoIds };
      }
    }

    const repositories = await Repository.find(repoQuery);

    if (repositories.length === 0) {
      return NextResponse.json(
        { error: 'No accessible repositories found' },
        { status: 404 }
      );
    }

    // Get all files from these repositories
    const files = await File.find({
      repositoryId: { $in: repositories.map(r => r._id) },
    })
      .populate('repositoryId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (!targetUser.age || !targetUser.height || !targetUser.weight || !targetUser.bloodGroup) {
      return NextResponse.json(
        { error: 'Target user health profile is incomplete' },
        { status: 400 }
      );
    }

    const healthProfile: HealthProfile = {
      age: targetUser.age,
      height: targetUser.height,
      weight: targetUser.weight,
      bloodGroup: targetUser.bloodGroup,
      gender: targetUser.gender,
    };

    const reports = files.map(f => ({
      name: f.name,
      type: f.fileType,
      uploadDate: f.createdAt.toISOString(),
      repoName: (f.repositoryId as any).name,
    }));

    const summary = await analyzeReportSummary(healthProfile, reports);

    return NextResponse.json({
      summary,
      profile: {
        name: targetUser.name,
        username: targetUser.username,
        age: targetUser.age,
        bloodGroup: targetUser.bloodGroup,
        height: targetUser.height,
        weight: targetUser.weight,
        gender: targetUser.gender,
      },
      repositories: repositories.map(r => ({
        id: r._id,
        name: r.name,
        filesCount: files.filter(
          f => ((f.repositoryId as any)._id || f.repositoryId).toString() === (r._id as any).toString()
        ).length,
      })),
      totalReports: files.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/health/summary/[username]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
