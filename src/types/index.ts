export type UserRole = 'CREATOR' | 'ADMIN';

export type PlatformId = 'pinkroom_pages' | 'pinkroom_main';

export interface PlatformInfo {
  id: PlatformId | string;
  name: string;
  public_url: string;
  brand_title: string;
  content_category: string;
  notification_sender: string;
  created_at: string;
}

export interface PlatformMembership {
  id: string;
  user_id: string;
  platform_id: PlatformId | string;
  role: UserRole;
  terms_agreed: boolean;
  terms_agreed_at?: string;
  terms_signature?: string;
  created_at: string;
}

export type ContentCategory = 'PAGE_TURNING';

export type SubmissionStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type PayoutItemStatus = 'UNPAID' | 'RESERVED' | 'PAID';

export type PayoutStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type SampleStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REVISION_REQUESTED'
  | 'REJECTED';

export type PaymentMethodType = 'WISE' | 'PAYPAL' | 'ACH' | 'WIRE' | 'NIGERIA_BANK' | 'MOBILE_MONEY';

export interface GuidelineSample {
  id: string;
  platform_id?: PlatformId | string;
  title: string;
  description: string;
  video_url: string;
  file_name: string;
  duration_seconds: number;
  category: ContentCategory | string;
  created_at: string;
  uploaded_by?: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  country: string;
  avatar_url?: string;
  bio?: string;
  date_of_birth?: string;
  password?: string;
  preferred_category?: string;
  is_adult_confirmed: boolean;
  sample_status?: SampleStatus;
  sample_submission_id?: string;
  sample_review_notes?: string;
  payment_method?: PaymentMethodType;
  payment_details?: {
    wise_email?: string;
    paypal_email?: string;
    account_number?: string;
    routing_number?: string;
    bank_name?: string;
    beneficiary_name?: string;
    nigerian_bank_name?: string;
    nigerian_account_number?: string;
    nigerian_account_name?: string;
    mobile_money_provider?: string;
    mobile_money_phone?: string;
    mobile_money_account_name?: string;
    notes?: string;
  };
  agreement_signed?: boolean;
  agreement_signed_at?: string;
  agreement_signature_name?: string;
  referral_code?: string;
  referred_by_id?: string;
  created_at: string;
}

export type StorageProvider = 'supabase' | 'hostinger';
export type UploadStatus = 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Submission {
  id: string;
  platform_id: PlatformId | string;
  creator_id: string;
  creator_name?: string;
  creator_email?: string;
  creator_sample_status?: SampleStatus;
  title: string;
  category: ContentCategory | string;
  duration_seconds: number;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  status: SubmissionStatus;
  storage_provider?: StorageProvider;
  storage_key?: string;
  upload_id?: string;
  original_filename?: string;
  detected_mime_type?: string;
  verified_duration_seconds?: number;
  upload_status?: UploadStatus;
  processing_status?: ProcessingStatus;
  preview_file_key?: string;
  preview_url?: string;
  failure_reason?: string;
  upload_completed_at?: string;
  processing_completed_at?: string;
  rejection_reason?: string;
  revision_notes?: string;
  version_number: number;
  parent_submission_id?: string;
  is_sample?: boolean;
  agreed_rate_usd: number;
  payout_status: PayoutItemStatus;
  payout_id?: string;
  notes?: string;
  consent_confirmed?: boolean;
  is_adult_confirmed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmissionVersion {
  id: string;
  submission_id: string;
  version_number: number;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  duration_seconds: number;
  storage_provider?: StorageProvider;
  storage_key?: string;
  original_filename?: string;
  verified_duration_seconds?: number;
  notes?: string;
  created_at: string;
}

export interface EarningsLedgerEntry {
  id: string;
  platform_id: PlatformId | string;
  creator_id: string;
  submission_id?: string;
  payout_id?: string;
  type: 'CREDIT' | 'RESERVED' | 'PAID' | 'RELEASED';
  amount_usd: number;
  description: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  platform_id: PlatformId | string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  creator_sample_status?: SampleStatus;
  amount_usd: number;
  video_count: number;
  status: PayoutStatus;
  payment_method: PaymentMethodType;
  payment_destination: string;
  submission_ids: string[];
  failure_reason?: string;
  payment_reference?: string;
  bank_payment_reference?: string;
  requested_at: string;
  created_at?: string;
  processed_at?: string;
}

export interface NotificationItem {
  id: string;
  platform_id: PlatformId | string;
  user_id: string;
  title: string;
  message: string;
  type: 'REVIEW' | 'PAYOUT' | 'SYSTEM' | 'GENERAL';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  platform_id: PlatformId | string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: any;
  created_at: string;
}

export interface PlatformSettings {
  rate_per_video_usd: number;
  min_payout_videos: number;
  min_duration_seconds: number;
  max_upload_size_bytes: number;
}

export interface ChatMessage {
  id: string;
  platform_id?: PlatformId | string;
  creator_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_user_name: string;
  referred_user_email: string;
  audition_passed: boolean;
  videos_completed_count: number;
  milestone_reached: boolean;
  reward_amount_usd: number;
  reward_status: 'PENDING' | 'REWARDED';
  rewarded_at?: string;
  created_at: string;
  updated_at: string;
}
