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

async function findBySize() {
  console.log('Searching for files ~77MB or uploaded on 2026-09-13...');

  const { data: supaBuckets } = await supabaseAdmin.storage.listBuckets();

  for (const b of supaBuckets || []) {
    const { data: files } = await supabaseAdmin.storage.from(b.name).list('', { limit: 1000 });
    console.log(`\n=== Bucket: [${b.name}] (${files?.length} files) ===`);

    files?.forEach((f) => {
      const sizeMb = (((f.metadata?.size || 0)) / (1024 * 1024)).toFixed(2);
      if ((f.metadata?.size || 0) > 50000000 || f.name.includes('1789312') || f.metadata?.lastModified?.includes('2026-09-13')) {
        console.log(` - File: "${f.name}" | Size: ${sizeMb} MB (${f.metadata?.size} bytes) | Modified: ${f.metadata?.lastModified}`);
      }
    });
  }
}

findBySize();
