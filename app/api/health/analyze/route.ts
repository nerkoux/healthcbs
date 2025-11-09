import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import SharedAccess from '@/models/SharedAccess';
import { analyzeHealthProfile, analyzeReportSummary, type HealthProfile } from '@/lib/gemini';

// POST /api/health/analyze - Analyze user's health profile
export async function POST(request: NextRequest) {
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

    if (!user.age || !user.height || !user.weight || !user.bloodGroup) {
      return NextResponse.json(
        { error: 'Please complete your health profile first' },
        { status: 400 }
      );
    }

    const healthProfile: HealthProfile = {
      age: user.age,
      height: user.height,
      weight: user.weight,
      bloodGroup: user.bloodGroup,
      gender: user.gender,
    };

    // Get user's reports for context
    const files = await File.find({ ownerId: user._id })
      .select('name fileType createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const reports = files.map(f => ({
      name: f.name,
      type: f.fileType,
      date: f.createdAt.toISOString(),
    }));

    const analysis = await analyzeHealthProfile(healthProfile, reports);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('Error in POST /api/health/analyze:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
