export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { ADMIN_EMAIL, ADMIN_NOTIFICATION_EMAILS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      displayName,
      email,
      password,
      country,
      dateOfBirth,
      isAdultConfirmed,
      termsAgreed,
    } = body;

    const resolvedName = (fullName || displayName || '').trim();

    if (!resolvedName) {
      return NextResponse.json({ error: 'Full legal or creator name is required.' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (!country || !country.trim()) {
      return NextResponse.json({ error: 'Country of residence is required.' }, { status: 400 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date of birth is required.' }, { status: 400 });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: 'Please provide a valid date of birth.' }, { status: 400 });
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json(
        { error: `You must be at least 18 years old to register as a creator (calculated age: ${age}).` },
        { status: 400 }
      );
    }

    if (!isAdultConfirmed) {
      return NextResponse.json(
        { error: 'You must explicitly certify that you are 18 years of age or older.' },
        { status: 400 }
      );
    }

    if (!termsAgreed) {
      return NextResponse.json(
        { error: 'You must review and agree to the Creator Production Guidelines & Terms.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = await db.getProfileByEmailAsync(trimmedEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const isAdmin =
      ADMIN_NOTIFICATION_EMAILS.includes(trimmedEmail) || trimmedEmail === ADMIN_EMAIL.toLowerCase();

    const profile = await db.createProfileAsync({
      id: crypto.randomUUID(),
      email: trimmedEmail,
      display_name: resolvedName,
      role: isAdmin ? 'ADMIN' : 'CREATOR',
      country: country.trim(),
      date_of_birth: dateOfBirth,
      preferred_category: 'PAGE_TURNING',
      is_adult_confirmed: true,
      sample_status: isAdmin ? 'APPROVED' : 'NOT_SUBMITTED',
      password,
      created_at: new Date().toISOString(),
    });

    // 1. In-app welcome notification for creator
    try {
      db.createNotification(
        {
          user_id: profile.id,
          type: 'SYSTEM',
          title: 'Welcome to The Pink Room — Page Turning!',
          message:
            'Your creator account is active. Submit your 30-second audition sample to unlock full video uploads.',
          link: '/creator/upload',
        },
        { skipEmail: true }
      );
    } catch (notifErr) {
      console.warn('[Pages Register] Creator in-app notification error:', notifErr);
    }

    // 2. Dispatch official Welcome Email to the creator
    try {
      await sendWelcomeEmail({
        to: trimmedEmail,
        recipientName: resolvedName,
        role: isAdmin ? 'ADMIN' : 'CREATOR',
      });
    } catch (emailErr) {
      console.error('[Pages Register] Welcome Email error:', emailErr);
    }

    // 3. Dispatch admin alert email & in-app notification when a new creator joins
    if (!isAdmin) {
      try {
        db.notifyAdmins({
          title: `New Creator Registered: ${resolvedName}`,
          message: `A new creator, ${resolvedName} (${trimmedEmail}) from ${country.trim()}, has registered on The Pink Room — Page Turning.`,
          type: 'GENERAL',
          link: '/admin/submissions',
        });
      } catch (adminErr) {
        console.error('[Pages Register] Admin notification error:', adminErr);
      }
    }

    const res = NextResponse.json({ success: true, user: profile }, { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, profile.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400 * 30,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}
