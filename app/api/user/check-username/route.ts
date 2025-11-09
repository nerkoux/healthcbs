import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/user/check-username?username=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    // Validate username format
    if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
      return NextResponse.json(
        { available: false, error: 'Username must be 3-20 characters (lowercase letters, numbers, - and _ only)' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    return NextResponse.json({ 
      available: !existingUser,
      username: username.toLowerCase() 
    });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
