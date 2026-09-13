'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.replace(`/auth/register?redirect=${encodeURIComponent(pathname)}`);
        } else {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        router.replace(`/auth/register?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 px-4">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-black font-medium">Verifying creator credentials...</div>
      </div>
    );
  }

  return <>{children}</>;
}
