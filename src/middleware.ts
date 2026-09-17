import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isUserBlacklisted } from '@/lib/blacklist';

export const SESSION_COOKIE_NAME = 'asmr_session_user';
export const BANNED_DEVICE_COOKIE = 'pinkroom_banned_device';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isDeviceFlaggedBanned = request.cookies.get(BANNED_DEVICE_COOKIE)?.value === '1';

  if (pathname === '/banned') {
    return NextResponse.next();
  }

  // Blacklist check
  if ((sessionCookie && isUserBlacklisted(sessionCookie)) || isDeviceFlaggedBanned) {
    const isApi = pathname.startsWith('/api/');
    const response = isApi
      ? NextResponse.json(
          { error: 'Access denied: Your account is permanently banned.' },
          { status: 403 }
        )
      : NextResponse.redirect(new URL('/banned', request.url));

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.set(BANNED_DEVICE_COOKIE, '1', {
      path: '/',
      httpOnly: false,
      maxAge: 315360000,
      sameSite: 'lax',
    });
    return response;
  }

  // Protect /creator routes
  if (pathname.startsWith('/creator')) {
    if (!sessionCookie) {
      const registerUrl = new URL('/auth/login', request.url);
      registerUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(registerUrl);
    }
  }

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/creator/:path*', '/admin/:path*'],
};
