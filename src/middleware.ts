import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE_NAME = 'asmr_session_user';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

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
