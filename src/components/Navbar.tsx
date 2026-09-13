'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import {
  Menu,
  X,
  UploadCloud,
  LayoutDashboard,
  ShieldCheck,
  DollarSign,
  FileText,
  LogOut,
  ChevronRight,
  Bell,
  UserCog,
  Settings,
  MessageSquare,
  Check,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import {
  sendBrowserPushNotification,
  requestBrowserNotificationPermission,
  getBrowserNotificationPermission,
  playNotificationChime,
} from '@/lib/notifications';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);

  useEffect(() => {
    setBrowserPermission(getBrowserNotificationPermission());
  }, []);

  const handleRequestPushPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      playNotificationChime('success');
      sendBrowserPushNotification('Push Alerts Enabled! 🎉', {
        body: 'You will now receive instant desktop notifications for reviews, revisions, and payouts.',
        url: '/creator/notifications',
      });
    }
  };

  const fetchNotifications = () => {
    fetch('/api/notifications', { cache: 'no-store' })
      .then((r) => r.json())
      .then((nData) => {
        const list: any[] = nData.notifications || [];
        setNotifications(list);
        const count = list.filter((n: any) => !n.is_read).length;
        setUnreadNotifs(count);

        if (isInitialFetchRef.current) {
          list.forEach((n: any) => knownNotifIdsRef.current.add(n.id));
          isInitialFetchRef.current = false;
        } else {
          // Check for newly arrived unread notifications
          const newNotifs = list.filter(
            (n: any) => !n.is_read && !knownNotifIdsRef.current.has(n.id)
          );
          if (newNotifs.length > 0) {
            newNotifs.forEach((n: any) => knownNotifIdsRef.current.add(n.id));
            playNotificationChime('alert');
            const newest = newNotifs[0];
            sendBrowserPushNotification(newest.title, {
              body: newest.message,
              url: newest.link || '/creator/notifications',
            });
          }
        }
      })
      .catch(() => { });
  };

  const fetchSubmissionCount = () => {
    fetch('/api/submissions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((sData) => {
        if (Array.isArray(sData.submissions)) {
          setSubmissionCount(sData.submissions.length);
        }
      })
      .catch(() => { });
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setUnreadNotifs(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inDesktop = notifRef.current && notifRef.current.contains(e.target as Node);
      const inMobile = mobileNotifRef.current && mobileNotifRef.current.contains(e.target as Node);
      if (!inDesktop && !inMobile) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchMe = () => {
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
          if (data.user) {
            fetchNotifications();
            fetchSubmissionCount();
          }
        })
        .catch(() => { });
    };

    fetchMe();

    // 1. In-tab custom event
    const handleProfileUpdate = (e: any) => {
      if (e?.detail?.avatarUrl !== undefined) {
        setUser((prev: any) => (prev ? { ...prev, avatar_url: e.detail.avatarUrl } : prev));
      }
      fetchMe();
    };
    window.addEventListener('profile-updated', handleProfileUpdate);

    // 2. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    let bcReviews: BroadcastChannel | null = null;
    let bcNotifs: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('asmr_profile_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.avatarUrl !== undefined) {
          setUser((prev: any) => (prev ? { ...prev, avatar_url: msg.data.avatarUrl } : prev));
        }
        fetchMe();
      };

      bcReviews = new BroadcastChannel('asmr_submissions_sync');
      bcReviews.onmessage = () => {
        fetchNotifications();
        fetchSubmissionCount();
      };

      bcNotifs = new BroadcastChannel('asmr_notifications_sync');
      bcNotifs.onmessage = () => {
        fetchNotifications();
      };
    } catch { }

    const handleNotifUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('notification-updated', handleNotifUpdate);

    // Refresh notifications when tab regains focus or every 20s
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);
    const notifTimer = setInterval(() => {
      fetchNotifications();
    }, 20000);

    // 3. Storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'asmr_avatar_url') {
        setUser((prev: any) => (prev ? { ...prev, avatar_url: e.newValue || '' } : prev));
        fetchMe();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('notification-updated', handleNotifUpdate);
      window.removeEventListener('focus', handleFocus);
      clearInterval(notifTimer);
      window.removeEventListener('storage', handleStorage);
      try {
        bc?.close();
        bcReviews?.close();
        bcNotifs?.close();
      } catch { }
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifDropdownOpen(false);
  }, [pathname]);

  const closeMenu = () => setMobileMenuOpen(false);

  const publicLinks = [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/guidelines', label: 'Recording Guidelines' },
    { href: '/earnings-and-payments', label: 'Earnings & Payments' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/submissions', label: 'Submissions' },
    { href: '/admin/payouts', label: 'Payouts' },
    { href: '/admin/creators', label: 'Creators' },
    { href: '/admin/chat', label: 'Live Chat' },
    { href: '/admin/notifications', label: 'Push Alerts' },
    { href: '/admin/ledger', label: 'Ledger' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/audit', label: 'Audit' },
    { href: '/guidelines', label: 'Guidelines' },
  ];

  const creatorLinks = [
    { href: '/creator', label: 'Dashboard' },
    { href: '/creator/upload', label: 'Upload' },
    { href: '/creator/videos', label: 'Submissions' },
    { href: '/creator/payouts', label: 'Payouts' },
    { href: '/creator/agreement', label: 'Agreement' },
    { href: '/guidelines', label: 'Guidelines' },
    { href: '/creator/settings', label: 'Settings' },
  ];

  const isAdminView = pathname.startsWith('/admin') || (user?.role === 'ADMIN' && !pathname.startsWith('/creator'));
  const isCreatorView = pathname.startsWith('/creator') || (user?.role === 'CREATOR' && !pathname.startsWith('/admin'));

  const activeNavLinks = isAdminView ? adminLinks : isCreatorView ? creatorLinks : publicLinks;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  if (isCreatorView) {
    return (
      <header className="sticky top-0 z-40 bg-white dark:bg-[#120F15] border-b border-neutral-200/80 dark:border-neutral-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Brand, Preview, Theme, Notifs, Profile */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <NextLink href="/creator" className="flex items-center group py-1 shrink-0">
                <img
                  src="/the-pink-room-logo.png"
                  alt="The Pink Room"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </NextLink>
              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
              <span className="text-[10px] tracking-[0.2em] font-bold text-neutral-400 dark:text-neutral-500 uppercase hidden sm:inline-block">
                CREATOR STUDIO
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeToggle />

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen((prev) => !prev)}
                  className="relative p-2 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </button>

                {/* Dropdown menu */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-80 max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden text-neutral-900 dark:text-white">
                    <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm">Notifications</span>
                        {browserPermission === 'default' && (
                          <button
                            type="button"
                            onClick={handleRequestPushPermission}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 hover:bg-pink-200 transition-colors"
                            title="Enable desktop browser push notifications"
                          >
                            🔔 Enable Push
                          </button>
                        )}
                        {browserPermission === 'granted' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Push Active
                          </span>
                        )}
                      </div>
                      {unreadNotifs > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-500 font-medium">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <NextLink
                            key={n.id}
                            href="/creator/notifications"
                            onClick={() => setNotifDropdownOpen(false)}
                            className={`p-3 block hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-xs space-y-1 ${!n.is_read ? 'bg-neutral-50/80 dark:bg-neutral-800/80 border-l-2 border-l-[#BE185D]' : ''
                              }`}
                          >
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
                              <span className="truncate pr-2">{n.title}</span>
                              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2">{n.message}</p>
                          </NextLink>
                        ))
                      )}
                    </div>
                    <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-center">
                      <NextLink
                        href="/creator/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline"
                      >
                        View all notifications &rarr;
                      </NextLink>
                    </div>
                  </div>
                )}
              </div>

              {/* Creator Profile Link & Avatar Badge */}
              <NextLink
                href="/creator/settings"
                className="flex items-center gap-2 pl-1 group text-xs font-semibold text-neutral-900 dark:text-white hover:opacity-85 transition-opacity"
              >
                <div className="w-7 h-7 rounded-full bg-[#FCE7F0] text-[#9D174D] border border-[#FBCFE8] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user?.display_name
                    ? user.display_name.split(/\s+/).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'AW'}
                </div>
                <span className="hidden sm:inline-block max-w-[130px] truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {user?.display_name || 'Ada Wunor'}
                </span>
              </NextLink>

              {/* Desktop Log Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-[#FDF2F4] hover:bg-[#F8E2EC] text-[#7B1E4B] text-xs font-bold transition-colors border-0 shadow-xs ml-1"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 mr-1 text-[#7B1E4B]" />
                <span>Log Out</span>
              </button>

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Subnav Row (Desktop Only - hidden on mobile) */}
          <div className="border-t border-neutral-100 dark:border-neutral-800/80 hidden md:flex items-center justify-between">
            <nav className="flex items-center space-x-6 text-xs font-medium">
              {creatorLinks.map((link) => {
                const isExact = link.href === '/creator';
                const isActive = isExact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <NextLink
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 py-3 transition-colors shrink-0 ${isActive
                        ? 'border-b-2 border-[#BE185D] text-neutral-900 dark:text-white font-bold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                  >
                    <span>{link.label}</span>
                    {link.label === 'Submissions' && submissionCount !== null && submissionCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                        {submissionCount}
                      </span>
                    )}
                  </NextLink>
                );
              })}
            </nav>

            <div className="text-[9px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500 font-semibold hidden md:block shrink-0">
              YOUR SPACE TO CREATE.
            </div>
          </div>
        </div>

        {/* Mobile Creator Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#120F15] px-4 py-3 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-1">
              {creatorLinks.map((link) => {
                const isExact = link.href === '/creator';
                const isActive = isExact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <NextLink
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                        ? 'bg-[#BE185D]/10 text-[#BE185D] dark:text-[#F472B6]'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                  >
                    <span>{link.label}</span>
                    {link.label === 'Submissions' ? (
                      submissionCount !== null && submissionCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                          {submissionCount}
                        </span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      )
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </NextLink>
                );
              })}
            </nav>

            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 space-y-1">
              <NextLink
                href="/creator/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span>Account Settings</span>
                <Settings className="w-3.5 h-3.5 opacity-50" />
              </NextLink>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left"
              >
                <span>Log Out</span>
                <LogOut className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#161619] border-b border-neutral-200 dark:border-[#2E2E38] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <NextLink href="/" className="flex items-center group py-1 shrink-0">
            <img
              src="/the-pink-room-logo.png"
              alt="The Pink Room"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </NextLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs lg:text-sm font-bold text-black dark:text-[#F0F0F6]">
            {activeNavLinks.map((link) => {
              const isExact = link.href === '/admin' || link.href === '/creator' || link.href === '/';
              const isActive = isExact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  className={`transition-all py-1 border-b-2 text-black dark:text-[#F0F0F6] ${isActive
                      ? 'border-black dark:border-[#F0F0F6] font-extrabold'
                      : 'border-transparent font-bold hover:border-black/40 dark:hover:border-white/40'
                    }`}
                >
                  {link.label}
                </NextLink>
              );
            })}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center space-x-2.5">
                {/* Real-time Notification Bell Popover */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifDropdownOpen((prev) => !prev)}
                    className="relative p-2 rounded-lg text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 transition-colors"
                    title="Notifications"
                    aria-label="View notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifs > 0 && (
                      <span
                        data-badge
                        className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center leading-none shadow-sm animate-pulse"
                      >
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 overflow-hidden text-black dark:text-[#F0F0F6]">
                      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm">Notifications</span>
                          {unreadNotifs > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold">
                              {unreadNotifs} new
                            </span>
                          )}
                        </div>
                        {unreadNotifs > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-neutral-500 font-medium">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 6).map((n) => (
                            <NextLink
                              key={n.id}
                              href={n.link || (user.role === 'ADMIN' ? '/admin/submissions' : '/creator/notifications')}
                              onClick={() => setNotifDropdownOpen(false)}
                              className={`p-3 block hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs space-y-1 ${!n.is_read ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-l-black dark:border-l-white' : 'bg-white dark:bg-neutral-900'
                                }`}
                            >
                              <div className="font-bold text-black dark:text-white flex items-center justify-between">
                                <span className="truncate pr-2">{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-neutral-400 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </NextLink>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-center">
                        <NextLink
                          href={user.role === 'ADMIN' ? '/admin/submissions' : '/creator/notifications'}
                          onClick={() => setNotifDropdownOpen(false)}
                          className="text-xs font-bold text-black dark:text-white hover:underline"
                        >
                          View all notifications &rarr;
                        </NextLink>
                      </div>
                    </div>
                  )}
                </div>

                {user.role === 'ADMIN' ? (
                  <>
                    <NextLink
                      href="/admin/chat"
                      className="p-2 rounded-lg text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-300 dark:border-neutral-700"
                      title="Admin Live Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </NextLink>

                    <NextLink
                      href="/admin/settings"
                      className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-all group"
                      title="Admin Settings & Avatar"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center text-white ring-1 ring-neutral-300 group-hover:ring-black transition-all shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold font-serif">
                            {user.display_name ? user.display_name.substring(0, 2).toUpperCase() : 'AD'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black dark:text-[#F0F0F6] max-w-[100px] truncate">
                        {user.display_name || 'Admin'}
                      </span>
                    </NextLink>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <NextLink
                      href="/creator/settings"
                      className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-all group"
                      title="Edit Profile & Avatar"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white ring-1 ring-neutral-300 group-hover:ring-black transition-all shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold font-serif">
                            {user.display_name ? user.display_name.substring(0, 2).toUpperCase() : 'CR'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black dark:text-[#F0F0F6] max-w-[100px] truncate">
                        {user.display_name || 'Creator'}
                      </span>
                    </NextLink>

                    <NextLink
                      href="/creator/upload"
                      className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" />
                      Upload
                    </NextLink>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Log Out"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1 text-red-500" />
                      <span>Log Out</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <NextLink
                  href="/auth/login"
                  className="px-3.5 py-2 text-sm font-bold text-black dark:text-[#F0F0F6] hover:underline transition-colors"
                >
                  Sign In
                </NextLink>
                <NextLink
                  href="/auth/register"
                  className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Become a Creator
                  <ChevronRight className="w-4 h-4 ml-1" />
                </NextLink>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Bell + Avatar + ThemeToggle + Hamburger */}
          <div className="flex md:hidden items-center space-x-1.5">
            <ThemeToggle />
            {user && (
              <>
                <div className="relative" ref={mobileNotifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifDropdownOpen((prev) => !prev)}
                    className="relative p-2 rounded-lg text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifs > 0 && (
                      <span
                        data-badge
                        className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center leading-none shadow-sm animate-pulse"
                      >
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="fixed left-4 right-4 top-[65px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 overflow-hidden text-black dark:text-[#F0F0F6]">
                      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm">Notifications</span>
                          {unreadNotifs > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold">
                              {unreadNotifs} new
                            </span>
                          )}
                        </div>
                        {unreadNotifs > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-neutral-500 font-medium">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <NextLink
                              key={n.id}
                              href={n.link || (user.role === 'ADMIN' ? '/admin/submissions' : '/creator/notifications')}
                              onClick={() => { setNotifDropdownOpen(false); setMobileMenuOpen(false); }}
                              className={`p-3 block hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs space-y-1 ${!n.is_read ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-l-black dark:border-l-white' : 'bg-white dark:bg-neutral-900'
                                }`}
                            >
                              <div className="font-bold text-black dark:text-white flex items-center justify-between">
                                <span className="truncate pr-2">{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-neutral-400 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </NextLink>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-center">
                        <NextLink
                          href={user.role === 'ADMIN' ? '/admin/submissions' : '/creator/notifications'}
                          onClick={() => { setNotifDropdownOpen(false); setMobileMenuOpen(false); }}
                          className="text-xs font-bold text-black dark:text-white hover:underline"
                        >
                          View all &rarr;
                        </NextLink>
                      </div>
                    </div>
                  )}
                </div>

                <NextLink
                  href={user.role === 'ADMIN' ? '/admin' : '/creator/settings'}
                  className="p-0.5 rounded-full ring-1 ring-neutral-300 dark:ring-neutral-700 hover:ring-neutral-900 transition-all shrink-0"
                  title="Edit Profile & Avatar"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold font-serif">
                        {user.display_name ? user.display_name.substring(0, 2).toUpperCase() : 'CR'}
                      </span>
                    )}
                  </div>
                </NextLink>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-black dark:text-[#F0F0F6] hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#161619] border-b border-neutral-200 dark:border-[#2E2E38] px-4 pt-3 pb-6 space-y-4 shadow-md">
          {user ? (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl space-y-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <NextLink
                  href={user.role === 'ADMIN' ? '/admin' : '/creator/settings'}
                  onClick={closeMenu}
                  className="shrink-0 group"
                  title="Manage Avatar & Settings"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-black flex items-center justify-center text-white ring-1 ring-neutral-300 group-hover:ring-black transition-all">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold font-serif">
                        {user.display_name ? user.display_name.substring(0, 2).toUpperCase() : 'CR'}
                      </span>
                    )}
                  </div>
                </NextLink>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-black dark:text-[#F0F0F6] text-sm truncate">{user.display_name}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">{user.email} • {user.role}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-black dark:text-[#F0F0F6] border border-neutral-300 dark:border-neutral-600">
                    {user.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                    className="p-1 rounded text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <NextLink
                  href={user.role === 'ADMIN' ? '/admin' : '/creator'}
                  onClick={closeMenu}
                  className="text-center text-xs font-bold text-black dark:text-[#F0F0F6] bg-white dark:bg-neutral-700 py-2 px-2.5 rounded shadow-sm border border-neutral-300 dark:border-neutral-600"
                >
                  Dashboard →
                </NextLink>
                {user.role === 'CREATOR' ? (
                  <NextLink
                    href="/creator/settings"
                    onClick={closeMenu}
                    className="text-center text-xs font-bold text-white bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 py-2 px-2.5 rounded shadow-sm hover:bg-neutral-800 transition-colors"
                  >
                    Edit Profile
                  </NextLink>
                ) : (
                  <NextLink
                    href="/admin/submissions"
                    onClick={closeMenu}
                    className="text-center text-xs font-bold text-black dark:text-[#F0F0F6] bg-neutral-200 dark:bg-neutral-700 py-2 px-2.5 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    Reviews
                  </NextLink>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 dark:text-[#F0F0F6]">
              <NextLink
                href="/auth/login"
                onClick={closeMenu}
                className="w-full text-center py-2.5 px-3 rounded-md text-sm font-bold border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-black dark:text-[#F0F0F6] shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Sign In
              </NextLink>
              <NextLink
                href="/auth/register"
                onClick={closeMenu}
                className="w-full text-center py-2.5 px-3 rounded-md text-sm font-bold bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                Apply as Creator
              </NextLink>
            </div>
          )}

          {/* Navigation Links */}
          <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
            <div className="py-2 space-y-1">
              {publicLinks.map((link) => (
                <NextLink
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold transition-colors ${pathname === link.href
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-[#F0F0F6]'
                      : 'text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
              ))}
            </div>

            {user && user.role === 'CREATOR' && (
              <div className="py-2 space-y-1">
                <div className="text-[11px] font-bold text-black dark:text-[#F0F0F6] uppercase tracking-wider px-2 pb-1">
                  Creator Workspaces
                </div>
                <NextLink
                  href="/creator/notifications"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black hover:bg-neutral-100 dark:text-[#F0F0F6] dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Notifications
                  </span>
                  {unreadNotifs > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                      {unreadNotifs}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                  )}
                </NextLink>
                <NextLink
                  href="/creator/settings"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Edit Profile & Avatar
                  </span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
                <NextLink
                  href="/creator"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Dashboard Overview
                  </span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
                <NextLink
                  href="/creator/upload"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Upload Video
                  </span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
                <NextLink
                  href="/creator/videos"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span>My Videos & Versions</span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
                <NextLink
                  href="/creator/payouts"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Payouts & Ledger
                  </span>
                  <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                </NextLink>
              </div>
            )}

            {user && user.role === 'ADMIN' && (
              <div className="py-2 space-y-1">
                <div className="text-[11px] font-bold text-black dark:text-[#F0F0F6] uppercase tracking-wider px-2 pb-1">
                  Admin Management
                </div>
                <NextLink
                  href="/admin/audit"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold text-black hover:bg-neutral-100 dark:text-[#F0F0F6] dark:hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                    Notifications & Audit
                  </span>
                  {unreadNotifs > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                      {unreadNotifs}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                  )}
                </NextLink>
                {adminLinks.map((link) => (
                  <NextLink
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-bold transition-colors ${pathname === link.href
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-[#F0F0F6]'
                        : 'text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-black dark:text-[#F0F0F6]" />
                  </NextLink>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-[#F0F0F6] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-bold transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
