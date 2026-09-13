import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      process.env[key.trim()] = vals.join('=').trim();
    }
  }
}

import { supabaseAdmin } from '../src/lib/supabase';

async function check() {
  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));

  console.log('=== PAGE_TURNING CREATORS ===');
  const ptCreators = dbData.profiles.filter(
    (p: any) => p.preferred_category === 'PAGE_TURNING' || p.preferred_category === 'BOTH'
  );
  ptCreators.forEach((p: any) => {
    console.log(`Creator: ${p.display_name} (${p.id}) | Category: ${p.preferred_category}`);
  });

  const ptCreatorIds = new Set(ptCreators.map((p: any) => p.id));

  console.log('\n=== PAGE_TURNING SUBMISSIONS (database.json) ===');
  const ptSubs = dbData.submissions.filter(
    (s: any) => s.category === 'PAGE_TURNING' || ptCreatorIds.has(s.creator_id)
  );
  ptSubs.forEach((s: any) => {
    console.log(`Sub: ${s.id} | Title: "${s.title}" | CreatorId: ${s.creator_id} | file_url: ${s.file_url}`);
  });

  console.log('\n=== SUPABASE DB SUBMISSIONS (PAGE_TURNING) ===');
  const { data: supaSubs } = await supabaseAdmin.from('submissions').select('*');
  const supaPtSubs = (supaSubs || []).filter(
    (s: any) => s.category === 'PAGE_TURNING' || ptCreatorIds.has(s.creator_id)
  );
  supaPtSubs.forEach((s: any) => {
    console.log(`SupaSub: ${s.id} | Title: "${s.title}" | CreatorId: ${s.creator_id} | file_url: ${s.file_url}`);
  });

  console.log('\n=== GUIDELINE SAMPLES FOR PAGE_TURNING ===');
  const ptSamples = (dbData.guideline_samples || []).filter(
    (g: any) => g.category === 'PAGE_TURNING' || g.platform_id === 'pinkroom_pages'
  );
  ptSamples.forEach((g: any) => {
    console.log(`Sample: ${g.id} | Title: "${g.title}" | video_url: ${g.video_url}`);
  });
}

check();
