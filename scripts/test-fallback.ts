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

import { getSignedVideoUrl } from '../src/lib/supabase';

async function testFallback() {
  const key = 'video-1789304487150-p14l08.mp4';
  console.log('Testing signed URL for Pinkroom Main video:', key);
  const url = await getSignedVideoUrl(key, 3600);
  console.log('\nResult URL:', url);

  if (url && (url.includes('supabase') || url.includes('token='))) {
    console.log('\n✅ SUCCESS! Successfully fell back to Supabase Storage signed URL for Pinkroom Main video.');
  } else if (url && url.includes('storjshare')) {
    console.log('\nFetched from Storj S3.');
  } else {
    console.log('\n❌ Failed to resolve URL.');
  }
}

testFallback().catch((err) => console.error(err));
