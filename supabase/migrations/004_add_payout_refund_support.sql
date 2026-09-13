-- ============================================================================
-- MIGRATION 004: Support Payout Refund Status & Constraints
-- ============================================================================

-- 1. Update check constraint on payout_requests status to allow REFUNDED
ALTER TABLE public.payout_requests 
  DROP CONSTRAINT IF EXISTS payout_requests_status_check;

ALTER TABLE public.payout_requests 
  ADD CONSTRAINT payout_requests_status_check 
  CHECK (status IN ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'));
