import { supabaseAdmin, STORAGE_BUCKET } from '../src/lib/supabase';

async function checkBucket() {
  console.log(`Checking bucket "${STORAGE_BUCKET}" on Supabase...`);
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    console.error('List buckets error:', error);
    return;
  }

  const exists = buckets.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    console.log(`Bucket "${STORAGE_BUCKET}" does not exist, creating private bucket...`);
    const { data, error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: 524288000,
    });
    if (createError) {
      console.error('Create bucket error:', createError);
    } else {
      console.log(`Bucket "${STORAGE_BUCKET}" created successfully!`);
    }
  } else {
    console.log(`Bucket "${STORAGE_BUCKET}" already exists and is private.`);
  }
}

checkBucket().catch(console.error);
