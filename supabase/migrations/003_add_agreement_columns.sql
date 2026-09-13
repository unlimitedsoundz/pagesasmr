-- ============================================================================
-- MIGRATION 003: Profile Agreement Columns & Reference Sample
-- ============================================================================

-- 1. Add missing agreement columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_signature_name TEXT;

-- 2. Ensure initial guideline sample exists in public.guideline_samples
INSERT INTO public.guideline_samples (
  id,
  title,
  description,
  video_url,
  file_name,
  duration_seconds,
  category,
  created_at
)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'Official Reference: Thigh-Flapping & Gum-Chewing ASMR Sample',
  'Gold-standard demonstration combining natural acoustic clapping (knee length skirt, chair/table seated, camera at knee level) and textured spearmint gum chewing with crisp bubble pops. High-gain binaural capture with zero room bleed.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'reference_sample.mp4',
  184.00,
  'THIGH_FLAPPING_AND_GUM_CHEWING',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.guideline_samples
);

-- 3. Ensure platform settings are present
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES
  ('rate_per_video_usd', '50.00'::jsonb, NOW()),
  ('min_payout_videos', '8'::jsonb, NOW()),
  ('min_duration_seconds', '180'::jsonb, NOW()),
  ('max_upload_size_bytes', '524288000'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
