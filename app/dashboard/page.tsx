'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DashboardContent = dynamic(() => import('@/components/dashboard/DashboardContent'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#121212]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03DAC6] mx-auto mb-4"></div>
        <p className="text-white">Loading dashboard...</p>
      </div>
    </div>
  ),
  ssr: false,
});

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const res = await fetch('/api/user', {
        cache: 'no-store', // Prevent browser caching
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.user.onboardingCompleted) {
          router.push('/onboarding');
          return;
        }
        setUser(data.user);
      } else {
        // Clear any stale data and redirect to login
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  if (loading || !user) {
    return null;
  }

  return <DashboardContent user={user} />;
}
