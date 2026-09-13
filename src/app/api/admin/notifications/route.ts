export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/notifications
 * Returns recent platform notifications for admin overview
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const notifications = db.getAllNotifications(100);
    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

/**
 * POST /api/admin/notifications
 * Pushes a custom notification to:
 * - 'ALL': every active creator profile on the platform
 * - 'SINGLE': a specific creator by creatorId
 * 
 * Automatically updates:
 * 1. Bell notification drawer / in-app notifications
 * 2. Transactional email to creator's inbox (unless sendEmail is explicitly false)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const {
      target, // 'ALL' | 'SINGLE'
      creatorId,
      title,
      message,
      type = 'SYSTEM', // 'REVIEW' | 'PAYOUT' | 'SYSTEM' | 'GENERAL'
      link = '/creator',
      sendEmail = true,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Notification title is required.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Notification message body is required.' }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const cleanLink = link?.trim() || '/creator';

    let dispatchedCount = 0;
    const recipientNames: string[] = [];

    if (target === 'ALL') {
      const creators = db.getPlatformCreators();
      if (creators.length === 0) {
        return NextResponse.json(
          { error: 'No active creators found on the platform to notify.' },
          { status: 400 }
        );
      }

      for (const creator of creators) {
        db.createNotification(
          {
            user_id: creator.id,
            title: cleanTitle,
            message: cleanMessage,
            type: type as any,
            link: cleanLink,
          },
          { skipEmail: !sendEmail }
        );
        dispatchedCount++;
        recipientNames.push(creator.display_name || creator.email);
      }
    } else if (target === 'SINGLE') {
      if (!creatorId) {
        return NextResponse.json(
          { error: 'Please select a specific creator to notify.' },
          { status: 400 }
        );
      }

      const creator = db.getProfileById(creatorId);
      if (!creator) {
        return NextResponse.json(
          { error: 'Specified creator profile was not found.' },
          { status: 404 }
        );
      }

      db.createNotification(
        {
          user_id: creator.id,
          title: cleanTitle,
          message: cleanMessage,
          type: type as any,
          link: cleanLink,
        },
        { skipEmail: !sendEmail }
      );
      dispatchedCount = 1;
      recipientNames.push(creator.display_name || creator.email);
    } else {
      return NextResponse.json(
        { error: 'Invalid notification target. Must be "ALL" or "SINGLE".' },
        { status: 400 }
      );
    }

    // Log admin audit event
    db.createAuditEvent({
      platform_id: 'the_pink_room',
      actor_id: admin.id,
      actor_name: admin.display_name || 'Admin',
      action: 'ADMIN_CUSTOM_NOTIFICATION_PUSH',
      target_type: target === 'ALL' ? 'ALL_CREATORS' : 'CREATOR',
      target_id: target === 'ALL' ? 'all' : (creatorId || ''),
      details: {
        title: cleanTitle,
        type,
        count: dispatchedCount,
        sendEmail,
        recipients: recipientNames.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      count: dispatchedCount,
      message: `Successfully pushed custom notification to ${dispatchedCount} creator${dispatchedCount === 1 ? '' : 's'}. In-app bell updated${sendEmail ? ' & transactional emails dispatched.' : '.'}`,
    });
  } catch (error: any) {
    console.error('[Admin Notifications API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch custom notification.' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
