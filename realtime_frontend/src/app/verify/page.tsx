'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();

  useEffect(() => {
    // Verification is no longer required - redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-familia-500 to-heart-500 animate-pulse" />
        <p className="text-muted">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
