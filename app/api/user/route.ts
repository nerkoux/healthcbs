import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/user - Get or create current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth0Id = session.user.sub;
    
    await connectDB();
    
    let user = await User.findOne({ auth0Id });
    
    // If user doesn't exist, create one
    if (!user) {
      const username = session.user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 
        `user${Date.now()}`;
      
      user = await User.create({
        auth0Id,
        email: session.user.email,
        name: session.user.name || session.user.email,
        username: username.substring(0, 20),
        picture: session.user.picture,
        profileCompleted: false,
        onboardingCompleted: false,
      });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error in GET /api/user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/user - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth0Id = session.user.sub;
    const data = await request.json();

    await connectDB();
    
    // Find and update user
    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        $set: {
          ...(data.username && { username: data.username }),
          ...(data.age && { age: data.age }),
          ...(data.bloodGroup && { bloodGroup: data.bloodGroup }),
          ...(data.height && { height: data.height }),
          ...(data.weight && { weight: data.weight }),
          ...(data.gender && { gender: data.gender }),
          ...(data.name && { name: data.name }),
          ...(typeof data.profileCompleted !== 'undefined' && { profileCompleted: data.profileCompleted }),
          ...(typeof data.onboardingCompleted !== 'undefined' && { onboardingCompleted: data.onboardingCompleted }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error in PATCH /api/user:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
