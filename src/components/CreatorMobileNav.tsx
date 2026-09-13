'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  UploadCloud,
  DollarSign,
  User,
  Home,
  ShieldCheck,
} from 'lucide-react';

export default function CreatorMobileNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isHiddenRoute = pathname.startsWith('/admin') || pathname.startsWith('/auth');

  useEffect(() => {
    if (isHiddenRoute) return;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(!!data.user);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [pathname, isHiddenRoute]);

  // Suppress bottom nav on admin routes and auth login/register flows
  if (isHiddenRoute) {
    return null;
  }

  const isCreatorRoute = pathname.startsWith('/creator');

  // Links for Creator dashboard views
  const creatorLinks = [
    { href: '/creator', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/creator/videos', label: 'Videos', icon: Film },
    { href: '/creator/upload', label: 'Upload', icon: UploadCloud, isPrimary: true },
    { href: '/creator/payouts', label: 'Payouts', icon: DollarSign },
    { href: '/creator/settings', label: 'Profile', icon: User },
  ];

  // Links for Public / Guest views
  const publicLinks = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/guidelines', label: 'Guidelines', icon: ShieldCheck },
    { href: '/creator/upload', label: 'Upload', icon: UploadCloud, isPrimary: true },
    { href: '/earnings-and-payments', label: 'Earnings', icon: DollarSign },
    {
      href: isAuthenticated ? '/creator' : '/auth/login',
      label: isAuthenticated ? 'Creator' : 'Login',
      icon: User,
    },
  ];

  const links = isCreatorRoute ? creatorLinks : publicLinks;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#161619]/95 backdrop-blur-md border-t border-neutral-200 dark:border-[#2E2E38] safe-bottom transition-colors"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group relative"
                aria-label="Upload Video"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center group-active:scale-95 transition-all border-2 ${
                    isActive
                      ? 'bg-[#7b1e4b] text-white border-white dark:border-[#161619] ring-2 ring-[#7b1e4b]/30'
                      : 'bg-[#7b1e4b] hover:bg-[#68173e] text-white border-white dark:border-[#161619]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive
                      ? 'font-bold text-black dark:text-white'
                      : 'font-semibold text-neutral-800 dark:text-[#F0F0F6]'
                  }`}
                >
                  Upload
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                isActive
                  ? 'text-black dark:text-white font-extrabold scale-105'
                  : 'text-neutral-500 dark:text-[#A0A0B0] font-medium hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-black dark:bg-white absolute bottom-1.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
