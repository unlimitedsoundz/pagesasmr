export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = db.getProfileById(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let submission = null;
    if (profile.sample_submission_id) {
      submission = db.getSubmissionById(profile.sample_submission_id);
    }

    return NextResponse.json({
      sample_status: profile.sample_status || 'NOT_SUBMITTED',
      sample_review_notes: profile.sample_review_notes || null,
      sample_submission_id: profile.sample_submission_id || null,
      submission,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl, fileName, fileSizeBytes, durationSeconds, notes } = body;

    if (!fileUrl || !durationSeconds) {
      return NextResponse.json({ error: 'Missing required media details.' }, { status: 400 });
    }

    // Must be at least 30 seconds (allow 28s+ to handle video container timestamp rounding)
    if (durationSeconds < 28) {
      return NextResponse.json(
        { error: `Audition sample must be at least 30 seconds long (received ${Math.round(durationSeconds)}s).` },
        { status: 422 }
      );
    }

    const result = await db.submitCreatorSampleAsync(user.id, {
      file_url: fileUrl,
      file_name: fileName || 'page_turning_audition_30s.mp4',
      file_size_bytes: fileSizeBytes || 0,
      duration_seconds: durationSeconds,
      notes: notes?.trim(),
    });

    return NextResponse.json({
      success: true,
      profile: result.profile,
      submission: result.submission,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}
