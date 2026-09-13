export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';
import { ADMIN_NOTIFICATION_EMAILS } from '@/lib/constants';

/**
 * POST /api/admin/test-notifications
 * Triggers a test push alert (in-app bell) and sends a diagnostic transactional email to admin emails.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const testTitle = '🔔 Diagnostics: Push & Email System Operational';
    const testMessage = `This is a diagnostic notification sent by ${admin.display_name} (${admin.email}) on ${new Date().toLocaleString()}. If you receive this, both in-app push alerts and Resend email delivery are fully configured and functional.`;

    // 1. Create in-app bell notification for admin
    const bellNotif = db.createNotification(
      {
        user_id: admin.id,
        title: testTitle,
        message: testMessage,
        type: 'SYSTEM',
        link: '/admin/notifications',
      },
      { skipEmail: true }
    );

    // 2. Dispatch transactional test email
    const emailResult = await sendNotificationEmail({
      to: ADMIN_NOTIFICATION_EMAILS,
      recipientName: admin.display_name || 'Admin',
      type: 'SYSTEM',
      title: testTitle,
      message: testMessage,
      link: '/admin/notifications',
    });

    return NextResponse.json({
      success: true,
      message: 'Test push alert and email dispatched successfully!',
      bellNotification: bellNotif,
      recipients: ADMIN_NOTIFICATION_EMAILS,
      emailResult,
    });
  } catch (error: any) {
    console.error('[Test Notifications Diagnostic Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch test notification.' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
