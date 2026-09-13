export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const allSubmissions = db.getSubmissions();
    const sampleSubmissions = allSubmissions.filter((s) => s.is_sample);

    return NextResponse.json({ samples: sampleSubmissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { creatorId, action, notes } = body;

    if (!creatorId || !action) {
      return NextResponse.json({ error: 'Creator ID and action are required.' }, { status: 400 });
    }

    let updatedProfile;
    if (action === 'APPROVE') {
      updatedProfile = db.approveCreatorSample(creatorId, user, notes);
    } else if (action === 'REVISION') {
      if (!notes) {
        return NextResponse.json(
          { error: 'Specific guidance notes are required when requesting revision.' },
          { status: 400 }
        );
      }
      updatedProfile = db.rejectCreatorSample(creatorId, user, notes, true);
    } else if (action === 'REJECT') {
      if (!notes) {
        return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
      }
      updatedProfile = db.rejectCreatorSample(creatorId, user, notes, false);
    } else {
      return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
    }

    // Broadcast real-time audition review event to creator dashboard & apps
    try {
      const channel = supabaseAdmin.channel('submission-updates');
      await channel.send({
        type: 'broadcast',
        event: 'submission_reviewed',
        payload: {
          type: 'AUDITION_REVIEWED',
          creatorId: updatedProfile.id,
          action,
          sampleStatus: updatedProfile.sample_status,
          notes: notes || updatedProfile.sample_review_notes || '',
          timestamp: Date.now(),
        },
      });
    } catch (realtimeErr) {
      console.warn('Realtime broadcast warning:', realtimeErr);
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Review failed.' }, { status: 500 });
  }
}
