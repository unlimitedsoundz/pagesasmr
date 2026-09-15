export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendTelegramSubmissionNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      submissionId,
      title,
      durationSeconds,
      fileUrl,
      fileKey,
      fileName,
      fileSizeBytes,
      notes,
      consentConfirmed,
      isSample,
      width,
      height,
      storageProvider = 'hostinger',
    } = body;

    const safeDuration = Number(durationSeconds) > 0 ? Number(durationSeconds) : (isSample ? 30 : 180);

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing required media details.' }, { status: 400 });
    }

    // Check if submission already finalized (idempotency)
    if (submissionId) {
      const existing = db.getSubmissionById(submissionId);
      if (existing && existing.upload_status === 'COMPLETED') {
        return NextResponse.json({ success: true, submission: existing, alreadyCompleted: true });
      }
    }

    let submission;

    if (isSample) {
      const sampleResult = await db.submitCreatorSampleAsync(user.id, {
        id: submissionId,
        file_url: fileUrl,
        file_name: fileName || `${user.display_name} - 30s Audition Sample.mp4`,
        file_size_bytes: fileSizeBytes || 0,
        duration_seconds: safeDuration,
        notes: notes?.trim(),
        storage_provider: storageProvider,
        storage_key: fileKey || fileUrl,
        upload_status: 'COMPLETED',
        processing_status: 'READY',
      });
      submission = sampleResult.submission;
    } else {
      if (!consentConfirmed) {
        return NextResponse.json(
          { error: 'You must confirm that this is your original recording and you have full rights.' },
          { status: 400 }
        );
      }

      submission = await db.createSubmissionAsync({
        id: submissionId,
        creator_id: user.id,
        creator_name: user.display_name,
        creator_email: user.email,
        title: (title || fileName || 'Page Turning Submission').trim(),
        category: 'PAGE_TURNING',
        duration_seconds: safeDuration,
        file_url: fileUrl,
        file_name: fileName || 'page_turning.mp4',
        file_size_bytes: fileSizeBytes || 0,
        notes: notes?.trim() || undefined,
        is_sample: false,
        storage_provider: storageProvider,
        storage_key: fileKey || fileUrl,
        upload_status: 'COMPLETED',
        processing_status: 'READY',
      });
    }

    if (submission.is_duplicate) {
      db.createNotification({
        user_id: 'admin-001',
        title: 'Duplicate Video Submission Flagged & Rejected',
        message: `${user.display_name} attempted to submit a duplicate file for "${submission.title}". It has been automatically flagged and rejected.`,
        type: 'REVIEW',
        link: '/admin/submissions',
      });

      return NextResponse.json(
        {
          error: 'Duplicate video detected: This exact recording was already submitted previously. Duplicate submissions are automatically rejected.',
          submission,
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    // Auto-send submission details & video link to Telegram
    try {
      await sendTelegramSubmissionNotification({
        type: isSample ? 'SAMPLE' : 'SUBMISSION',
        creatorName: user.display_name,
        creatorEmail: user.email,
        title: submission.title,
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

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error: any) {
    console.error('[Pages] complete-upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
