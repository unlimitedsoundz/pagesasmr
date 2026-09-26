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
      .then((res) => {
        if (res.status === 403) {
          try {
            localStorage.setItem('pinkroom_banned_device', '1');
            document.cookie = 'pinkroom_banned_device=1; path=/; max-age=315360000; SameSite=Lax';
          } catch {}
          window.location.replace('/banned');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.user?.role === 'ADMIN' || data.user?.email === 'unlymitedsoundz@gmail.com' || data.user?.email === 'admin@asmrcreator.com') {
          try {
            localStorage.removeItem('pinkroom_banned_device');
            document.cookie = 'pinkroom_banned_device=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
          } catch {}
          setUser(data.user);
          setLoading(false);
          return;
        }
        if (data.isBanned || data.user?.is_banned) {
          try {
            localStorage.setItem('pinkroom_banned_device', '1');
            document.cookie = 'pinkroom_banned_device=1; path=/; max-age=315360000; SameSite=Lax';
          } catch {}
          window.location.replace('/banned');
          return;
        }
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 px-4 bg-[#FDFBFD] dark:bg-[#120F15]">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">Verifying creator credentials...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      {children}
    </div>
  );
}
