import { auth0 } from '@/lib/auth0-client';
import { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    '/auth/:path*',
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/repositories/:path*',
  ],
};
