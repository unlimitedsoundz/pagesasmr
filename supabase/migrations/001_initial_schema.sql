-- ============================================================================
-- ASMR CREATOR PLATFORM: PRODUCTION SUPABASE POSTGRESQL SCHEMA & RLS
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CREATOR', 'ADMIN')) DEFAULT 'CREATOR',
  country TEXT NOT NULL,
  preferred_category TEXT NOT NULL CHECK (preferred_category IN ('THIGH_FLAPPING', 'GUM_CHEWING', 'BOTH')),
  is_adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT CHECK (payment_method IN ('WISE', 'PAYPAL', 'ACH', 'WIRE')),
  payment_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('THIGH_FLAPPING', 'GUM_CHEWING')),
  duration_seconds NUMERIC(10,2) NOT NULL CHECK (duration_seconds >= 180),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED')) DEFAULT 'SUBMITTED',
  agreed_rate_usd NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  payout_status TEXT NOT NULL CHECK (payout_status IN ('UNPAID', 'RESERVED', 'PAID')) DEFAULT 'UNPAID',
  notes TEXT,
  rejection_reason TEXT,
  revision_notes TEXT,
  version_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Submission Versions (Audit trail for revisions)
CREATE TABLE IF NOT EXISTS public.submission_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_url TEXT NOT NULL,
  duration_seconds NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payout Requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd >= 400.00),
  video_count INT NOT NULL CHECK (video_count >= 8),
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED')) DEFAULT 'REQUESTED',
  payment_method TEXT NOT NULL,
  payment_destination TEXT NOT NULL,
  payment_reference TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Payout Line Items (Maps payout to specific submissions)
CREATE TABLE IF NOT EXISTS public.payout_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id UUID NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE RESTRICT,
  amount_usd NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payout_id, submission_id)
);

-- 6. Earnings Ledger (Double entry style transaction log)
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  submission_id UUID UNIQUE REFERENCES public.submissions(id) ON DELETE RESTRICT,
  payout_id UUID REFERENCES public.payout_requests(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'RESERVED', 'PAID', 'RELEASED')),
  amount_usd NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('REVIEW', 'PAYOUT', 'SYSTEM')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Events
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('rate_per_video_usd', '50.00'::jsonb),
  ('min_payout_videos', '8'::jsonb),
  ('min_duration_seconds', '180'::jsonb),
  ('max_upload_size_bytes', '524288000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Users can view & update their own profile; Admins can view all
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Submissions: Creators view & create their own; Admins view & update all
CREATE POLICY "Creators view own submissions" ON public.submissions FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());
CREATE POLICY "Creators create submissions" ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admins update submissions" ON public.submissions FOR UPDATE
  USING (public.is_admin() OR auth.uid() = creator_id);

-- Payouts: Creators view & create their own; Admins manage all
CREATE POLICY "Creators view own payouts" ON public.payout_requests FOR SELECT
  USING (auth.uid() = creator_id OR public.is_admin());
CREATE POLICY "Creators request payouts" ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admins update payouts" ON public.payout_requests FOR UPDATE
  USING (public.is_admin());

-- Notifications: Users only see their own
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage bucket configuration for private videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('private-videos', 'private-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Private videos access" ON storage.objects FOR SELECT
  USING (bucket_id = 'private-videos' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
  ));
CREATE POLICY "Private videos upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'private-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
