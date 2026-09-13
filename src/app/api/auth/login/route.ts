export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    let profile = await db.getProfileByEmailAsync(trimmedEmail);

    if (!profile && trimmedEmail === ADMIN_EMAIL.toLowerCase()) {
      profile = await db.createProfileAsync({
        id: crypto.randomUUID(),
        email: trimmedEmail,
        display_name: 'Ophelia Adeleke',
        role: 'ADMIN',
        country: 'Nigeria',
        preferred_category: 'PAGE_TURNING',
        is_adult_confirmed: true,
        sample_status: 'APPROVED',
        created_at: new Date().toISOString(),
      });
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'No account found with this email. Please check your spelling or sign up.' },
        { status: 404 }
      );
    }

    if (trimmedEmail === ADMIN_EMAIL.toLowerCase() && profile.role !== 'ADMIN') {
      profile = await db.updateProfileAsync(profile.id, { role: 'ADMIN' });
    }

    if (profile.password && profile.password !== password) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    const membership = await db.getMembership(profile.id);

    const res = NextResponse.json({ success: true, user: profile, membership });
    res.cookies.set(SESSION_COOKIE_NAME, profile.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400 * 30,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed.' }, { status: 500 });
  }
}
