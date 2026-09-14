export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { SubmissionStatus } from '@/types';
import { sendTelegramSubmissionNotification } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as SubmissionStatus) || undefined;
  const search = searchParams.get('search') || undefined;

  let creatorId = searchParams.get('creatorId') || undefined;
  if (user.role !== 'ADMIN') {
    creatorId = user.id;
  }

  // Live sync with Supabase for admins
  if (user.role === 'ADMIN') {
    await db.syncFromSupabase().catch((e) => console.warn('[Pages] Supabase sync warning on submissions GET:', e));
  }

  const submissions = db.getSubmissions({
    creatorId,
    status,
    search,
  });

  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, durationSeconds, fileUrl, fileName, fileSizeBytes, notes, consentConfirmed, width, height } = body;

    if (!title || !durationSeconds || !fileUrl) {
      return NextResponse.json({ error: 'Missing required submission fields.' }, { status: 400 });
    }

    if (!consentConfirmed) {
      return NextResponse.json(
        { error: 'You must confirm that this is your original recording and you have full rights.' },
        { status: 400 }
      );
    }

    const settings = db.getSettings();
    if (durationSeconds < settings.min_duration_seconds) {
      return NextResponse.json(
        { error: `Video must be at least ${settings.min_duration_seconds} seconds (3 minutes) long.` },
        { status: 400 }
      );
    }

    const submission = await db.createSubmissionAsync({
      creator_id: user.id,
      creator_name: user.display_name,
      creator_email: user.email,
      title: title.trim(),
      category: 'PAGE_TURNING',
      duration_seconds: durationSeconds,
      file_url: fileUrl,
      file_name: fileName || 'recording.mp4',
      file_size_bytes: fileSizeBytes || 0,
      notes: notes?.trim() || undefined,
      is_sample: false,
    });

    // Auto-send submission details & video link to Telegram
    try {
      await sendTelegramSubmissionNotification({
        type: 'SUBMISSION',
        creatorName: user.display_name,
        creatorEmail: user.email,
        title: title.trim(),
        category: 'Page Turning',
        durationSeconds,
        fileSizeMb: fileSizeBytes ? fileSizeBytes / (1024 * 1024) : undefined,
        fileUrl,
        notes: notes?.trim(),
        submissionId: submission.id,
        width: typeof width === 'number' ? width : undefined,
        height: typeof height === 'number' ? height : undefined,
      });
    } catch (err) {
      console.error('[Pages] Telegram notification error:', err);
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
