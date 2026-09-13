-- ============================================================================
-- MIGRATION 005: Platform Separation (pinkroom_main & pinkroom_pages)
-- Preserves all existing records, balances, and users under 'pinkroom_main'
-- Introduces dedicated 'pinkroom_pages' platform for faceless page-turning ASMR
-- ============================================================================

-- 1. Create platforms reference table
CREATE TABLE IF NOT EXISTS public.platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  brand_title TEXT NOT NULL,
  content_category TEXT NOT NULL,
  notification_sender TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed existing main platform and new page-turning platform
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

-- 2. Create platform memberships table (tracks onboarding & agreement per platform)
CREATE TABLE IF NOT EXISTS public.platform_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('CREATOR', 'ADMIN')) DEFAULT 'CREATOR',
  terms_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  terms_agreed_at TIMESTAMPTZ,
  terms_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_memberships_user_platform 
  ON public.platform_memberships(user_id, platform_id);

-- 3. Safely add platform_id column to existing tables (defaulting to 'pinkroom_main')

-- Submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_submissions_platform_creator 
  ON public.submissions(platform_id, creator_id);

CREATE INDEX IF NOT EXISTS idx_submissions_platform_status 
  ON public.submissions(platform_id, status);

-- Payout Requests
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_payout_requests_platform_creator 
  ON public.payout_requests(platform_id, creator_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_platform_status 
  ON public.payout_requests(platform_id, status);

-- Earnings Ledger
ALTER TABLE public.earnings_ledger
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_earnings_ledger_platform_creator 
  ON public.earnings_ledger(platform_id, creator_id);

-- Notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_platform_user 
  ON public.notifications(platform_id, user_id);

-- Audit Events
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE RESTRICT;

-- Guideline Samples
ALTER TABLE public.guideline_samples
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE RESTRICT;

-- Chat Messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS platform_id TEXT NOT NULL DEFAULT 'pinkroom_main'
  REFERENCES public.platforms(id) ON DELETE CASCADE;

-- 4. Seed initial guideline reference for page-turning platform
INSERT INTO public.guideline_samples (
  id,
  platform_id,
  title,
  description,
  video_url,
  file_name,
  duration_seconds,
  category,
  created_at
)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'pinkroom_pages',
  'Official Reference: Faceless Page-Turning ASMR Sample',
  'Demonstration of authentic page-turning ASMR featuring clear paper whispering sounds, long press nails gently turning pages of a book, stationary overhead camera framing, and completely silent background.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'page_turning_reference.mp4',
  185.00,
  'PAGE_TURNING',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill existing creators and admins into platform_memberships for 'pinkroom_main'
INSERT INTO public.platform_memberships (user_id, platform_id, role, terms_agreed, terms_agreed_at, terms_signature, created_at)
SELECT
  p.id,
  'pinkroom_main',
  p.role,
  COALESCE(p.agreement_signed, TRUE),
  COALESCE(p.agreement_signed_at, p.created_at),
  COALESCE(p.agreement_signature_name, p.display_name),
  p.created_at
FROM public.profiles p
ON CONFLICT (user_id, platform_id) DO NOTHING;

-- Also ensure opheliaadeleke@gmail.com exists as an ADMIN
INSERT INTO public.profiles (
  id, email, display_name, role, country, preferred_category, is_adult_confirmed, agreement_signed, agreement_signed_at, agreement_signature_name
)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'opheliaadeleke@gmail.com',
  'Ophelia Adeleke',
  'ADMIN',
  'Nigeria',
  'BOTH',
  TRUE,
  TRUE,
  NOW(),
  'Ophelia Adeleke'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN';

-- Also enroll admins in 'pinkroom_pages' automatically
INSERT INTO public.platform_memberships (user_id, platform_id, role, terms_agreed, terms_agreed_at, terms_signature, created_at)
SELECT
  p.id,
  'pinkroom_pages',
  'ADMIN',
  TRUE,
  NOW(),
  p.display_name,
  NOW()
FROM public.profiles p
WHERE p.role = 'ADMIN' OR p.email = 'opheliaadeleke@gmail.com'
ON CONFLICT (user_id, platform_id) DO UPDATE SET
  role = 'ADMIN';

-- 6. Row Level Security (RLS) policies for platform isolation

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_memberships ENABLE ROW LEVEL SECURITY;

-- Platforms are publicly readable
DROP POLICY IF EXISTS "Public read platforms" ON public.platforms;
CREATE POLICY "Public read platforms" ON public.platforms FOR SELECT
  USING (true);

-- Memberships: users view own memberships; users can enroll themselves; admins manage all
DROP POLICY IF EXISTS "Users view own platform memberships" ON public.platform_memberships;
CREATE POLICY "Users view own platform memberships" ON public.platform_memberships FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own platform membership" ON public.platform_memberships;
CREATE POLICY "Users insert own platform membership" ON public.platform_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own platform membership" ON public.platform_memberships;
CREATE POLICY "Users update own platform membership" ON public.platform_memberships FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Storage policies for private video bucket paths
-- Format: {platform_id}/{user_id}/{submission_id}/{filename} or legacy {user_id}/{filename}
DROP POLICY IF EXISTS "Private videos platform access" ON storage.objects;
CREATE POLICY "Private videos platform access" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'private-videos' AND (
      public.is_admin() OR
      -- Match platform folder structure: /pinkroom_pages/{uid}/... or /pinkroom_main/{uid}/...
      (storage.foldername(name))[2] = auth.uid()::text OR
      -- Match legacy structure: /{uid}/...
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Private videos platform upload" ON storage.objects;
CREATE POLICY "Private videos platform upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'private-videos' AND (
      public.is_admin() OR
      (storage.foldername(name))[2] = auth.uid()::text OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );
