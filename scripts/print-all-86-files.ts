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

async function printAll() {
  const { data: files } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  console.log(`Total files in private-videos: ${files?.length || 0}`);
  files?.forEach((f, idx) => {
    console.log(`[${idx + 1}] "${f.name}" | Size: ${f.metadata?.size} | Modified: ${f.metadata?.lastModified}`);
  });
}

printAll();
