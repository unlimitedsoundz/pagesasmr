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

async function inspectSupabaseDb() {
  console.log('--- SUPABASE DB PROFILES ---');
  const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
  console.log(`Total Supabase Profiles: ${profiles?.length || 0}`);
  profiles?.forEach((p) => {
    console.log(`Profile: ${p.id} | Email: ${p.email} | Name: ${p.display_name} | PrefCategory: ${p.preferred_category} | Platform: ${p.platform_id}`);
  });

  console.log('\n--- SUPABASE DB SUBMISSIONS ---');
  const { data: subs } = await supabaseAdmin.from('submissions').select('*');
  console.log(`Total Supabase Submissions: ${subs?.length || 0}`);
  subs?.forEach((s) => {
    console.log(`Sub: ${s.id} | Title: "${s.title}" | Category: ${s.category} | FileUrl: ${s.file_url} | Creator: ${s.creator_id}`);
  });

  console.log('\n--- SUPABASE DB GUIDELINE SAMPLES ---');
  const { data: samples } = await supabaseAdmin.from('guideline_samples').select('*');
  console.log(`Total Guideline Samples: ${samples?.length || 0}`);
  samples?.forEach((g) => {
    console.log(`Sample: ${g.id} | Title: "${g.title}" | Category: ${g.category} | Platform: ${g.platform_id} | VideoUrl: ${g.video_url}`);
  });
}

inspectSupabaseDb();
