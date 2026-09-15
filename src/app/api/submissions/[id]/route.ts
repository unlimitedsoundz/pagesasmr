export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.syncFromSupabase().catch((error) => {
    console.warn('[Pages] Supabase sync warning on submission detail GET:', error);
  });

  const submission = db.getSubmissionById(params.id);
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (user.role !== 'ADMIN' && submission.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const versions = db.getSubmissionVersions(submission.id);

  return NextResponse.json({ submission, versions });
}
