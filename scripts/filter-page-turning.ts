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

async function filter() {
  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));

  const profilesMap = new Map<string, any>();
  dbData.profiles?.forEach((p: any) => profilesMap.set(p.id, p));

  const submissionsMap = new Map<string, any>();
  dbData.submissions?.forEach((s: any) => {
    submissionsMap.set(s.id, s);
    if (s.file_url) {
      const filename = s.file_url.split('/api/videos/')[1]?.split('/stream')[0];
      if (filename) submissionsMap.set(filename, s);
    }
  });

  const { data: supaFiles } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });

  const pageTurningFiles: any[] = [];
  const otherFiles: any[] = [];

  for (const file of supaFiles || []) {
    const filename = file.name;
    let matchedSub = submissionsMap.get(filename);
    if (!matchedSub) {
      matchedSub = dbData.submissions?.find((s: any) => s.file_url?.includes(filename) || s.file_name?.includes(filename));
    }
    let creator = matchedSub ? profilesMap.get(matchedSub.creator_id) : null;

    if (!creator && (filename.startsWith('audition-') || filename.startsWith('prod-'))) {
      const parts = filename.split('-');
      const creatorId = parts[1];
      if (creatorId && profilesMap.has(creatorId)) {
        creator = profilesMap.get(creatorId);
      }
    }

    const category = matchedSub?.category || creator?.preferred_category || 'UNKNOWN';

    if (category === 'PAGE_TURNING') {
      pageTurningFiles.push({ filename, creator: creator?.display_name, category, size: file.metadata?.size });
    } else {
      otherFiles.push({ filename, creator: creator?.display_name, category });
    }
  }

  console.log('=== PAGE TURNING FILES TO MIGRATE TO STORJ ===');
  console.log(JSON.stringify(pageTurningFiles, null, 2));
  console.log(`\nTotal PAGE_TURNING files: ${pageTurningFiles.length}`);
  console.log(`Total non-PAGE_TURNING files (skipped): ${otherFiles.length}`);
}

filter();
