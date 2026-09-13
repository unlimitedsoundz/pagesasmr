export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminUser = await requireAdmin();
    const { action, feedback } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Review action is required (APPROVE, REJECT, REQUEST_REVISION).' }, { status: 400 });
    }

    let updatedSubmission;

    switch (action) {
      case 'APPROVE':
        updatedSubmission = db.approveSubmission(params.id, adminUser);
        break;

      case 'REJECT':
        if (!feedback || feedback.trim().length === 0) {
          return NextResponse.json({ error: 'Specific guideline violation reason is required to reject.' }, { status: 400 });
        }
        updatedSubmission = db.rejectSubmission(params.id, feedback, adminUser);
        break;

      case 'REQUEST_REVISION':
        if (!feedback || feedback.trim().length === 0) {
          return NextResponse.json({ error: 'Revision guidance notes are required to request changes.' }, { status: 400 });
        }
        updatedSubmission = db.requestRevision(params.id, feedback, adminUser);
        break;

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    try {
      const channel = supabaseAdmin.channel('submission-updates');
      await channel.send({
        type: 'broadcast',
        event: 'submission_reviewed',
        payload: {
          type: 'SUBMISSION_REVIEWED',
          submissionId: updatedSubmission.id,
          creatorId: updatedSubmission.creator_id,
          action,
          status: updatedSubmission.status,
          title: updatedSubmission.title,
          feedback: feedback?.trim() || '',
          timestamp: Date.now(),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, submission: updatedSubmission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Review failed' }, { status: 400 });
  }
}
