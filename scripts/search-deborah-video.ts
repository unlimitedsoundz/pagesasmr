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

async function searchDeborahVideo() {
  const { data: supaPrivate } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  console.log('--- SEARCHING SUPABASE PRIVATE-VIDEOS ---');
  supaPrivate?.forEach((f) => {
    if (f.name.includes('1789312') || f.name.includes('g9d3cp') || f.metadata?.lastModified?.includes('2026-09-13T15')) {
      console.log('Private-videos match:', f.name, f.metadata);
    }
  });

  const { data: supaGuideline } = await supabaseAdmin.storage.from('guideline-samples').list('', { limit: 1000 });
  console.log('--- SEARCHING SUPABASE GUIDELINE-SAMPLES ---');
  supaGuideline?.forEach((f) => {
    if (f.name.includes('1789312') || f.name.includes('g9d3cp') || f.metadata?.lastModified?.includes('2026-09-13T15')) {
      console.log('Guideline-samples match:', f.name, f.metadata);
    }
  });

  if (fs.existsSync('uploads')) {
    console.log('Local uploads folder files:', fs.readdirSync('uploads'));
  }
  if (fs.existsSync('apps/pinkroom-pages/uploads')) {
    console.log('Local pinkroom-pages/uploads folder files:', fs.readdirSync('apps/pinkroom-pages/uploads'));
  }
}

searchDeborahVideo();
