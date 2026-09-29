export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { db } from '@/lib/db';
import { PLATFORM_ID } from '@/lib/constants';

/**
 * DELETE /api/creator/account
 * Allows a creator to permanently delete their own account and all associated data.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();

    // Prevent deleting admin accounts via creator endpoint
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted from the creator settings.' },
        { status: 400 }
      );
    }

    const removed = await db.removeCreatorById(user.id);
    if (!removed) {
      return NextResponse.json({ error: 'Failed to delete account or account not found.' }, { status: 500 });
    }

    db.recordAuditEvent({
      platform_id: PLATFORM_ID,
      actor_id: user.id,
      actor_name: user.display_name,
      action: 'CREATOR_SELF_DELETE_ACCOUNT',
      target_type: 'CREATOR',
      target_id: user.id,
      details: { email: user.email, display_name: user.display_name },
    });

    const res = NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted.',
    });

    // Clear session cookies completely
    res.cookies.delete(SESSION_COOKIE_NAME);
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}
