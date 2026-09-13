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

async function checkDeborah() {
  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));

  console.log('=== DEBORAH ADEYINKA IN DATABASE.JSON ===');
  const deborahLocal = dbData.profiles?.find((p: any) =>
    p.email?.includes('deborah') || p.display_name?.toLowerCase().includes('deborah')
  );
  console.log('Local Profile:', deborahLocal);

  const localSubs = dbData.submissions?.filter((s: any) => s.creator_id === deborahLocal?.id || s.title?.includes('Deborah'));
  console.log('Local Submissions:', localSubs);

  console.log('\n=== DEBORAH ADEYINKA IN SUPABASE DB ===');
  const { data: supaProfiles } = await supabaseAdmin.from('profiles').select('*').ilike('display_name', '%deborah%');
  console.log('Supa Profiles:', supaProfiles);

  const deborahId = supaProfiles?.[0]?.id || deborahLocal?.id;
  if (deborahId) {
    const { data: supaSubs } = await supabaseAdmin.from('submissions').select('*').eq('creator_id', deborahId);
    console.log(`Supabase Submissions for Creator ${deborahId}:`, supaSubs);
  }

  // Also search all submissions for Deborah
  const { data: allDeborahSubs } = await supabaseAdmin.from('submissions').select('*').ilike('title', '%deborah%');
  console.log('All Submissions titled Deborah:', allDeborahSubs);
}

checkDeborah();
