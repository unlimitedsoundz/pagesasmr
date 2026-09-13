export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        creatorId: '',
        creatorName: '',
        messages: [],
        unreadCount: 0,
        unauthorized: true,
      });
    }

    const { searchParams } = new URL(req.url);

    // If asking for unread count only
    if (searchParams.get('unreadOnly') === 'true') {
      const unreadCount = user.role === 'ADMIN'
        ? db.getAdminUnreadChatCount()
        : db.getCreatorUnreadChatCount(user.id);
      return NextResponse.json({ unreadCount });
    }

    // If admin asking for conversation list
    if (user.role === 'ADMIN' && searchParams.get('conversations') === 'true') {
      const conversations = db.getChatConversations();
      const totalUnread = db.getAdminUnreadChatCount();
      return NextResponse.json({ conversations, totalUnread });
    }

    // Determine target creator conversation
    let targetCreatorId = user.id;
    if (user.role === 'ADMIN') {
      const requestedId = searchParams.get('creatorId');
      if (requestedId) {
        targetCreatorId = requestedId;
      } else {
        // Return latest creator conversation
        const conversations = db.getChatConversations();
        targetCreatorId = conversations[0]?.creator.id || '';
      }
    }

    // Mark messages as read by current role ONLY when explicitly requested (e.g. drawer opened or conv selected)
    const shouldMarkRead = searchParams.get('markRead') === 'true';
    if (shouldMarkRead && targetCreatorId) {
      db.markChatRead(targetCreatorId, user.role);
    }

    const messages = targetCreatorId ? db.getChatMessages(targetCreatorId) : [];
    const creator = targetCreatorId ? db.getProfileById(targetCreatorId) : null;
    const unreadCount = user.role === 'ADMIN'
      ? db.getAdminUnreadChatCount()
      : db.getCreatorUnreadChatCount(user.id);

    return NextResponse.json({
      creatorId: targetCreatorId,
      creatorName: creator?.display_name || 'Creator',
      messages,
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

// Fire-and-forget: send admin email notification via Resend when a creator messages
async function notifyAdminOfCreatorMessage(creatorName: string, messageText: string) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'opheliaadeleke@gmail.com';
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'The Pink Room Pages <notifications@pages.pinkroom.online>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pages.pinkroom.online';

  if (!adminEmail || !resendKey) return;

  const preview = messageText.length > 120 ? messageText.slice(0, 120) + '…' : messageText;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:36px 16px;background-color:#FDF0F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1C1520;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;padding:36px 32px;">
        <div style="padding-bottom:20px;margin-bottom:20px;">
          <img src="https://ydymhzdoptmpblmejcjs.supabase.co/storage/v1/object/public/avatars/brand/logo.png" alt="The Pink Room" width="130" style="display:block;max-width:130px;height:auto;" />
        </div>
        <h3 style="margin-top:0;font-size:18px;color:#1C1520;">💬 New message from ${creatorName}</h3>
        <p style="font-size:14px;line-height:1.6;color:#2E2533;background:#F5F5F5;padding:14px 18px;border-radius:12px;border-left:4px solid #1C1520;">
          "${preview}"
        </p>
        <div style="margin-top:24px;">
          <a href="${appUrl}/admin/chat" style="display:inline-block;background:#1C1520;color:#ffffff;padding:12px 24px;font-size:13px;font-weight:700;text-decoration:none;border-radius:9999px;">
            Reply in Live Chat →
          </a>
        </div>
        <div style="margin-top:32px;padding-top:16px;font-size:11px;color:#8B7892;">
          The Pink Room Pages • <a href="${appUrl}" style="color:#8B7892;text-decoration:none;">pages.pinkroom.online</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `💬 ${creatorName} sent you a message — The Pink Room Pages`,
        html,
      }),
    });

    // Domain not yet verified fallback
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.message?.includes('not verified') || data?.message?.includes('domain')) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Pink Room Pages <onboarding@resend.dev>',
            to: [adminEmail],
            subject: `💬 ${creatorName} sent you a message — The Pink Room Pages`,
            html,
          }),
        });
      }
    }
  } catch (e) {
    console.error('[Pages Chat] Failed to send admin email notification:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { message, creatorId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    let targetCreatorId = user.id;
    if (user.role === 'ADMIN') {
      if (!creatorId) {
        return NextResponse.json({ error: 'creatorId is required when admin sends a message.' }, { status: 400 });
      }
      targetCreatorId = creatorId;
    }

    const newMsg = db.sendChatMessage(targetCreatorId, user, message);

    // Notify admin by email when a creator sends a message (fire-and-forget)
    if (user.role === 'CREATOR') {
      notifyAdminOfCreatorMessage(user.display_name || user.email || 'A creator', message.trim()).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
      chatMessage: newMsg,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 });
  }
}
