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

async function listAllFiles() {
  console.log('--- ALL FILES IN SUPABASE PRIVATE-VIDEOS BUCKET ---');
  const { data: supaPrivate } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  console.log(supaPrivate?.map(f => ({ name: f.name, size: f.metadata?.size, lastModified: f.metadata?.lastModified })));

  console.log('\n--- ALL FILES IN SUPABASE GUIDELINE-SAMPLES BUCKET ---');
  const { data: supaGuideline } = await supabaseAdmin.storage.from('guideline-samples').list('', { limit: 1000 });
  console.log(supaGuideline?.map(f => ({ name: f.name, size: f.metadata?.size, lastModified: f.metadata?.lastModified })));
}

listAllFiles();
