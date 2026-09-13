export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { sendTelegramSubmissionNotification } from '@/lib/telegram';

export async function GET() {
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const hasChatId = Boolean(process.env.TELEGRAM_CHAT_ID);
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const tokenPrefix = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 8) + '...' : null;

  try {
    const result = await sendTelegramSubmissionNotification({
      type: 'SAMPLE',
      creatorName: 'Test Creator Pages',
      creatorEmail: 'creator@pages.pinkroom.online',
      title: '30s Page Turning Audition Sample Test',
      category: 'Audition Sample',
      durationSeconds: 35,
      fileSizeMb: 12.5,
      fileUrl: '/api/videos/sample.mp4',
      notes: 'Testing Telegram integration directly from Pinkroom Pages server',
      submissionId: 'test-sample-id-pages',
    });

    return NextResponse.json({
      envCheck: { hasToken, hasChatId, chatId, tokenPrefix },
      result,
    });
  } catch (err: any) {
    return NextResponse.json({
      envCheck: { hasToken, hasChatId, chatId, tokenPrefix },
      error: err?.message || err,
    }, { status: 500 });
  }
}
