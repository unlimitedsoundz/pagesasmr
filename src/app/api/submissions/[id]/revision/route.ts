export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const submission = db.getSubmissionById(params.id);

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    if (submission.creator_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (submission.status !== 'REVISION_REQUESTED') {
      return NextResponse.json(
        { error: `Cannot submit revision for video in ${submission.status} status.` },
        { status: 400 }
      );
    }

    const { fileUrl, fileName, fileSizeBytes, durationSeconds, notes } = await req.json();

    if (!fileUrl || !durationSeconds) {
      return NextResponse.json({ error: 'Missing updated video file information.' }, { status: 400 });
    }

    const settings = db.getSettings();
    if (durationSeconds < settings.min_duration_seconds) {
      return NextResponse.json(
        { error: `Revised video must be at least ${settings.min_duration_seconds} seconds.` },
        { status: 422 }
      );
    }

    const updated = await db.createRevisionAsync(submission.id, {
      file_url: fileUrl,
      file_name: fileName || 'revised.mp4',
      file_size_bytes: fileSizeBytes || 0,
      duration_seconds: durationSeconds,
      notes,
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Revision upload failed' }, { status: 500 });
  }
}
