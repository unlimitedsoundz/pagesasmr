const projectRef = 'ydymhzdoptmpblmejcjs';
const accessToken = 'sbp_fccf0a010ac4bee3c039733822e44497a81ae5e8';

async function runSql(sql: string, description: string) {
  console.log(`\n--- Running: ${description} ---`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);
  if (!res.ok) {
    console.error(`Error executing ${description}:`, body);
    throw new Error(`Failed to execute ${description}: ${body}`);
  }
  console.log(`Success: ${body}`);
  return body;
}

async function migrate() {
  console.log('Starting migration for platform-isolated guideline samples...');

  // 1. Create platforms table if not exists
  await runSql(`
    CREATE TABLE IF NOT EXISTS public.platforms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      public_url TEXT NOT NULL,
      brand_title TEXT NOT NULL,
      content_category TEXT NOT NULL,
      notification_sender TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO public.platforms (id, name, public_url, brand_title, content_category, notification_sender)
    VALUES
      (
        'pinkroom_main',
        'The Pink Room - ASMR Studio',
        'https://pinkroom.online',
        'The Pink Room',
        'thigh_flapping_and_gum_chewing',
        'The Pink Room <notifications@pinkroom.online>'
      ),
      (
        'pinkroom_pages',
        'The Pink Room — Page Turning',
        'https://pages.pinkroom.online',
        'The Pink Room — Page Turning',
        'page_turning',
        'The Pink Room Pages <notifications@pages.pinkroom.online>'
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      public_url = EXCLUDED.public_url,
      brand_title = EXCLUDED.brand_title,
      content_category = EXCLUDED.content_category,
      notification_sender = EXCLUDED.notification_sender;
  `, 'Create platforms table and seed entries');

  // 2. Add platform_id to guideline_samples
  await runSql(`
    ALTER TABLE public.guideline_samples
      ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
      REFERENCES public.platforms(id) ON DELETE RESTRICT;

    CREATE INDEX IF NOT EXISTS idx_guideline_samples_platform_created
      ON public.guideline_samples (platform_id, created_at DESC);
  `, 'Add platform_id column and index to guideline_samples');

  // 3. Update existing records in guideline_samples based on category and IDs
  await runSql(`
    UPDATE public.guideline_samples
    SET platform_id = 'pinkroom_pages'
    WHERE category = 'PAGE_TURNING' 
       OR id IN ('58ff3173-0810-4ed1-be2f-875a90ce58d7', 'bfa0d277-6c60-4f99-b13f-06e4ab528913');

    UPDATE public.guideline_samples
    SET platform_id = 'pinkroom_main'
    WHERE category != 'PAGE_TURNING' 
      AND id NOT IN ('58ff3173-0810-4ed1-be2f-875a90ce58d7', 'bfa0d277-6c60-4f99-b13f-06e4ab528913');
  `, 'Assign platform_id to existing samples');

  // 4. Verify the updated samples
  await runSql(`
    SELECT id, platform_id, title, category, created_at 
    FROM public.guideline_samples 
    ORDER BY created_at DESC;
  `, 'Verify guideline_samples with platform_id');

  console.log('\nMigration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
