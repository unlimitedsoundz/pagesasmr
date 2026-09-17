import { cookies } from 'next/headers';
import { db } from './db';
import { Profile, PlatformMembership } from '@/types';
import { isUserBlacklisted, isEmailBlacklisted } from './blacklist';

export const SESSION_COOKIE_NAME = 'asmr_session_user';
export const BANNED_DEVICE_COOKIE = 'pinkroom_banned_device';

export async function getCurrentUser(): Promise<Profile | null> {
  const cookieStore = cookies();
  let sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionUserId) {
    return null;
  }

  // Handle legacy cookie aliases
  if (sessionUserId === 'admin-001' || sessionUserId === 'admin-unlymitedsoundz-001') {
    sessionUserId = '694d15ea-ff2c-43ff-967d-80b7817534a8';
  } else if (sessionUserId === 'admin-ophelia') {
    sessionUserId = 'c0000000-0000-4000-8000-000000000001';
  }

  const profile = await db.getProfileByIdAsync(sessionUserId);
  if (!profile) return null;

  // Active ban enforcement: kick out banned or blacklisted sessions immediately
  if (profile.is_banned || isUserBlacklisted(profile.id) || isEmailBlacklisted(profile.email)) {
    try {
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.set(BANNED_DEVICE_COOKIE, '1', {
        path: '/',
        maxAge: 315360000,
        sameSite: 'lax',
      });
    } catch {
      // In read-only contexts
    }
    return null;
  }

  // Ensure opheliaadeleke@gmail.com is ADMIN
  if (profile.email.toLowerCase() === 'opheliaadeleke@gmail.com' && profile.role !== 'ADMIN') {
    profile.role = 'ADMIN';
  }

  return profile;
}

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user || user.is_banned || isUserBlacklisted(user.id) || isEmailBlacklisted(user.email)) {
    throw new Error('ACCESS_DENIED_BANNED');
  }
  return user;
}

export async function requireMembership(): Promise<{ user: Profile; membership: PlatformMembership }> {
  const user = await requireUser();
  const membership = await db.getMembership(user.id);
  if (!membership || !membership.terms_agreed) {
    throw new Error('MEMBERSHIP_REQUIRED');
  }
  return { user, membership };
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (
    user.role !== 'ADMIN' &&
    user.email.toLowerCase() !== 'opheliaadeleke@gmail.com' &&
    user.email.toLowerCase() !== 'unlymitedsoundz@gmail.com'
  ) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
