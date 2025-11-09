// Simple Auth0 helper
import { auth0 } from './auth0-client';

export async function getCurrentUser() {
  const session = await auth0.getSession();
  return session?.user || null;
}

export async function requireAuth() {
  const session = await auth0.getSession();
  
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session.user;
}
