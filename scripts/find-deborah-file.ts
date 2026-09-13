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

async function findFile() {
  const targetKey = 'video-1789312214181-g9d3cp.mp4';
  console.log(`Searching for Deborah's file: "${targetKey}"...`);

  const { data: supaPrivate } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  const foundInPrivate = (supaPrivate || []).find((f) => f.name === targetKey || f.name.includes(targetKey));
  console.log('Found in private-videos:', foundInPrivate);

  const { data: supaGuideline } = await supabaseAdmin.storage.from('guideline-samples').list('', { limit: 1000 });
  const foundInGuideline = (supaGuideline || []).find((f) => f.name === targetKey || f.name.includes(targetKey));
  console.log('Found in guideline-samples:', foundInGuideline);
}

findFile();
