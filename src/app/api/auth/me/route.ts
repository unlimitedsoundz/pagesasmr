export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, SESSION_COOKIE_NAME, BANNED_DEVICE_COOKIE } from '@/lib/auth';
import { db } from '@/lib/db';
import { isUserBlacklisted, isEmailBlacklisted } from '@/lib/blacklist';

export async function GET() {
  const cookieStore = cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUser();

  if (sessionUserId) {
    const rawProfile = await db.getProfileByIdAsync(sessionUserId);
    if (rawProfile?.is_banned || isUserBlacklisted(sessionUserId) || isEmailBlacklisted(rawProfile?.email)) {
      const res = NextResponse.json(
        { user: null, error: 'Access denied: Your account is permanently banned.', isBanned: true },
        { status: 403 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      res.cookies.set(BANNED_DEVICE_COOKIE, '1', {
        path: '/',
        maxAge: 315360000,
        sameSite: 'lax',
      });
      return res;
    }
  }

  const profiles = db.getProfiles();
  return NextResponse.json(
    {
      user,
      availablePersonas: profiles.map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: p.role,
        country: p.country,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
