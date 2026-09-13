-- ============================================================================
-- MIGRATION 002: RLS Policies, Profile Updates & Real-Time Chat/Samples
-- ============================================================================

-- 1. Profile Schema Updates (Avatar, Bio, Date of Birth, Audition State)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS sample_status TEXT DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS sample_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS sample_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Guideline Samples Benchmark Table
CREATE TABLE IF NOT EXISTS public.guideline_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  duration_seconds NUMERIC(8,2) NOT NULL DEFAULT 180,
  category TEXT NOT NULL DEFAULT 'THIGH_FLAPPING_AND_GUM_CHEWING',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Real-Time Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('CREATOR', 'ADMIN')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ensure RLS is Enabled Across Every Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guideline_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function for Administrator Privilege Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Public view creator profiles" ON public.profiles;
CREATE POLICY "Public view creator profiles" ON public.profiles FOR SELECT
  USING (role = 'CREATOR' OR auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- SUBMISSIONS
DROP POLICY IF EXISTS "Creators view own submissions" ON public.submissions;
CREATE POLICY "Creators view own submissions" ON public.submissions FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Creators create submissions" ON public.submissions;
CREATE POLICY "Creators create submissions" ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins update submissions" ON public.submissions;
CREATE POLICY "Admins update submissions" ON public.submissions FOR UPDATE
  USING (public.is_admin() OR auth.uid() = creator_id);

-- SUBMISSION VERSIONS
DROP POLICY IF EXISTS "Creators view own submission versions" ON public.submission_versions;
CREATE POLICY "Creators view own submission versions" ON public.submission_versions FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.submissions WHERE id = submission_versions.submission_id AND creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Creators insert submission versions" ON public.submission_versions;
CREATE POLICY "Creators insert submission versions" ON public.submission_versions FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.submissions WHERE id = submission_versions.submission_id AND creator_id = auth.uid())
  );

-- GUIDELINE BENCHMARK SAMPLES
DROP POLICY IF EXISTS "Anyone view guideline samples" ON public.guideline_samples;
CREATE POLICY "Anyone view guideline samples" ON public.guideline_samples FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage guideline samples" ON public.guideline_samples;
CREATE POLICY "Admins manage guideline samples" ON public.guideline_samples FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Creators view own chat messages" ON public.chat_messages;
CREATE POLICY "Creators view own chat messages" ON public.chat_messages FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Creators and admins send chat messages" ON public.chat_messages;
CREATE POLICY "Creators and admins send chat messages" ON public.chat_messages FOR INSERT
  WITH CHECK ((auth.uid() = creator_id AND sender_role = 'CREATOR') OR public.is_admin());

DROP POLICY IF EXISTS "Users update chat read status" ON public.chat_messages;
CREATE POLICY "Users update chat read status" ON public.chat_messages FOR UPDATE
  USING (auth.uid() = creator_id OR public.is_admin());

-- EARNINGS LEDGER
DROP POLICY IF EXISTS "Creators view own ledger" ON public.earnings_ledger;
CREATE POLICY "Creators view own ledger" ON public.earnings_ledger FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage earnings ledger" ON public.earnings_ledger;
CREATE POLICY "Admins manage earnings ledger" ON public.earnings_ledger FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PAYOUT REQUESTS
DROP POLICY IF EXISTS "Creators view own payouts" ON public.payout_requests;
CREATE POLICY "Creators view own payouts" ON public.payout_requests FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Creators request payouts" ON public.payout_requests;
CREATE POLICY "Creators request payouts" ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins update payouts" ON public.payout_requests;
CREATE POLICY "Admins update payouts" ON public.payout_requests FOR UPDATE
  USING (public.is_admin());

-- PAYOUT ITEMS
DROP POLICY IF EXISTS "Creators view own payout items" ON public.payout_items;
CREATE POLICY "Creators view own payout items" ON public.payout_items FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.payout_requests WHERE id = payout_items.payout_id AND creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage payout items" ON public.payout_items;
CREATE POLICY "Admins manage payout items" ON public.payout_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- PLATFORM SETTINGS
DROP POLICY IF EXISTS "Anyone view platform settings" ON public.platform_settings;
CREATE POLICY "Anyone view platform settings" ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins update platform settings" ON public.platform_settings;
CREATE POLICY "Admins update platform settings" ON public.platform_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- AUDIT EVENTS
DROP POLICY IF EXISTS "Admins view audit events" ON public.audit_events;
CREATE POLICY "Admins view audit events" ON public.audit_events FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert audit events" ON public.audit_events;
CREATE POLICY "Admins insert audit events" ON public.audit_events FOR INSERT
  WITH CHECK (public.is_admin());
