export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { PLATFORM_ID } from '@/lib/constants';

export async function GET() {
  try {
    // 1. Fetch from Supabase guideline_samples
    const { data: supaSamples, error: supaErr } = await supabaseAdmin
      .from('guideline_samples')
      .select('*')
      .order('created_at', { ascending: false });

    let formattedSupa: any[] = [];
    if (!supaErr && supaSamples) {
      const pageSamples = supaSamples.filter(
        (gs: any) =>
          (gs.platform_id === PLATFORM_ID || gs.category === 'PAGE_TURNING') &&
          gs.category !== 'THIGH_FLAPPING_AND_GUM_CHEWING' &&
          gs.platform_id !== 'pinkroom_main' &&
          gs.id !== 'b0000000-0000-4000-8000-000000000001' &&
          !gs.video_url?.includes('ForBiggerBlazes.mp4')
      );

      formattedSupa = pageSamples.map((gs: any) => ({
        id: gs.id,
        title: gs.title || 'Page Turning Sample',
        description: gs.description || 'Master reference recording for audio quality, camera framing, and pacing.',
        video_url: gs.video_url,
        file_name: gs.file_name || 'admin_guideline_reference.mp4',
        duration_seconds: Number(gs.duration_seconds) || 180,
        category: 'PAGE_TURNING',
        uploaded_by: gs.uploaded_by,
        created_at: gs.created_at,
        platform_id: PLATFORM_ID,
      }));
    }

    // Merge with local db samples to include any recently uploaded admin sample
    const localSamples = db.getGuidelineSamples().filter(
      (loc) => loc.id !== 'b0000000-0000-4000-8000-000000000001' && !loc.video_url?.includes('ForBiggerBlazes.mp4')
    );
    const combined: any[] = [...formattedSupa];
    for (const loc of localSamples) {
      if (!combined.some((s) => s.id === loc.id || s.video_url === loc.video_url)) {
        combined.push({
          ...loc,
          title: loc.title || 'Page Turning Sample',
        });
      }
    }

    // Sort by newest created_at so the latest admin upload is always first
    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({ samples: combined });
  } catch (e) {
    console.error('Failed to query Supabase guideline_samples:', e);
  }

  const samples = db.getGuidelineSamples();
  return NextResponse.json({ samples: samples || [] });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can upload guideline samples.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, video_url, file_name, duration_seconds } = body;

    if (!title || !video_url) {
      return NextResponse.json({ error: 'Title and video URL are required.' }, { status: 400 });
    }

    const sample = db.createGuidelineSample({
      title: title.trim(),
      description: description?.trim() || '',
      video_url,
      file_name: file_name || 'admin_guideline_reference.mp4',
      duration_seconds: duration_seconds || 180,
      category: 'PAGE_TURNING',
      uploaded_by: user.id || user.display_name,
    });

    // Also persist into Supabase guideline_samples table with explicit platform_id
    try {
      await supabaseAdmin.from('guideline_samples').insert({
        id: sample.id,
        title: sample.title,
        description: sample.description,
        video_url: sample.video_url,
        file_name: sample.file_name,
        duration_seconds: sample.duration_seconds,
        category: sample.category,
        uploaded_by: sample.uploaded_by,
        created_at: sample.created_at,
      });
    } catch (supaErr) {
      console.warn('Supabase guideline_samples insert note:', supaErr);
    }

    return NextResponse.json({ success: true, sample });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save sample.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can remove guideline samples.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Sample ID is required.' }, { status: 400 });
    }

    const deleted = db.deleteGuidelineSample(id, user);

    try {
      await supabaseAdmin.from('guideline_samples').delete().eq('id', id);
    } catch { }

    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete sample.' }, { status: 500 });
  }
}
