import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  Profile,
  Submission,
  SubmissionVersion,
  EarningsLedgerEntry,
  PayoutRequest,
  NotificationItem,
  AuditEvent,
  PlatformSettings,
  SubmissionStatus,
  ContentCategory,
  PaymentMethodType,
  GuidelineSample,
  PayoutStatus,
  PayoutItemStatus,
  PlatformMembership,
  ChatMessage,
} from '@/types';
import { supabaseAdmin } from './supabase';
import { sendNotificationEmail } from './email';
import { getLocalCurrency, formatLocalFx, AFRICAN_MOBILE_MONEY_COUNTRIES } from './currency';
import {
  PLATFORM_ID,
  RATE_PER_VIDEO_USD,
  MIN_PAYOUT_VIDEOS,
  MIN_PAYOUT_AMOUNT_USD,
  MIN_VIDEO_DURATION_SECONDS,
  MAX_UPLOAD_SIZE_BYTES,
  ADMIN_NOTIFICATION_EMAIL,
  ADMIN_NOTIFICATION_EMAILS,
} from './constants';

export function ensureUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

interface DatabaseData {
  profiles: Profile[];
  platform_memberships: PlatformMembership[];
  submissions: Submission[];
  submission_versions: SubmissionVersion[];
  earnings_ledger: EarningsLedgerEntry[];
  payout_requests: PayoutRequest[];
  notifications: NotificationItem[];
  audit_events: AuditEvent[];
  settings: PlatformSettings;
  guideline_samples: GuidelineSample[];
  chat_messages: ChatMessage[];
}

const APP_DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_DIR = fs.existsSync(APP_DATA_DIR) ? APP_DATA_DIR : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const TMP_DATA_DIR = path.join(os.tmpdir(), 'asmr_pages_data');
const TMP_DB_FILE = path.join(TMP_DATA_DIR, 'database.json');

const DEFAULT_SETTINGS: PlatformSettings = {
  rate_per_video_usd: RATE_PER_VIDEO_USD,
  min_payout_videos: MIN_PAYOUT_VIDEOS,
  min_duration_seconds: MIN_VIDEO_DURATION_SECONDS,
  max_upload_size_bytes: MAX_UPLOAD_SIZE_BYTES,
};

function getInitialSeedData(): DatabaseData {
  const adminId = 'a0000000-0000-4000-8000-000000000001';
  const unlymitedAdminId = '694d15ea-ff2c-43ff-967d-80b7817534a8';
  const opheliaAdminId = 'c0000000-0000-4000-8000-000000000001';

  const profiles: Profile[] = [
    {
      id: adminId,
      email: 'admin@pinkroom.online',
      display_name: 'Platform Operations Admin',
      role: 'ADMIN',
      country: 'United States',
      is_adult_confirmed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: unlymitedAdminId,
      email: 'unlymitedsoundz@gmail.com',
      display_name: 'Unlymited Soundz',
      role: 'ADMIN',
      country: 'Nigeria',
      is_adult_confirmed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: opheliaAdminId,
      email: 'opheliaadeleke@gmail.com',
      display_name: 'Ophelia Adeleke',
      role: 'ADMIN',
      country: 'Nigeria',
      is_adult_confirmed: true,
      password: 'Chichichi21#',
      created_at: new Date().toISOString(),
    },
  ];

  const platform_memberships: PlatformMembership[] = [
    {
      id: ensureUuid(),
      user_id: adminId,
      platform_id: PLATFORM_ID,
      role: 'ADMIN',
      terms_agreed: true,
      terms_agreed_at: new Date().toISOString(),
      terms_signature: 'Platform Operations Admin',
      created_at: new Date().toISOString(),
    },
    {
      id: ensureUuid(),
      user_id: unlymitedAdminId,
      platform_id: PLATFORM_ID,
      role: 'ADMIN',
      terms_agreed: true,
      terms_agreed_at: new Date().toISOString(),
      terms_signature: 'Unlymited Soundz',
      created_at: new Date().toISOString(),
    },
    {
      id: ensureUuid(),
      user_id: opheliaAdminId,
      platform_id: PLATFORM_ID,
      role: 'ADMIN',
      terms_agreed: true,
      terms_agreed_at: new Date().toISOString(),
      terms_signature: 'Ophelia Adeleke',
      created_at: new Date().toISOString(),
    },
  ];

  const guideline_samples: GuidelineSample[] = [
    {
      id: 'b0000000-0000-4000-8000-000000000001',
      platform_id: PLATFORM_ID,
      title: 'Page Turning Sample',
      description:
        'Demonstration of authentic page-turning ASMR featuring clear paper whispering sounds, long press nails gently turning pages of a book, stationary overhead camera framing, and completely silent background.',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      file_name: 'page_turning_reference.mp4',
      duration_seconds: 185,
      category: 'PAGE_TURNING',
      created_at: new Date().toISOString(),
      uploaded_by: 'Platform Operations Admin',
    },
  ];

  return {
    profiles,
    platform_memberships,
    submissions: [],
    submission_versions: [],
    earnings_ledger: [],
    payout_requests: [],
    notifications: [],
    audit_events: [
      {
        id: ensureUuid(),
        platform_id: PLATFORM_ID,
        actor_id: unlymitedAdminId,
        actor_name: 'Unlymited Soundz',
        action: 'PAGE_TURNING_PLATFORM_INITIALIZED',
        target_type: 'SYSTEM',
        target_id: PLATFORM_ID,
        details: { status: 'READY', domain: 'pages.pinkroom.online' },
        created_at: new Date().toISOString(),
      },
    ],
    settings: DEFAULT_SETTINGS,
    guideline_samples,
    chat_messages: [],
  };
}

class PagesDatabaseService {
  private data: DatabaseData;

  constructor() {
    this.ensureDataDir();
    this.data = this.readFromDisk();
    this.syncFromSupabase().catch((err) => {
      console.warn('[Pages DB] Initial Supabase sync warning:', err);
    });
  }

  public reload(): void {
    const diskData = this.readFromDisk();
    if (!this.data) {
      this.data = diskData;
      return;
    }
    const existingSubIds = new Set(this.data.submissions.map((s) => s.id));
    for (const sub of diskData.submissions) {
      if (!existingSubIds.has(sub.id)) {
        this.data.submissions.push(sub);
      }
    }
  }

  public async syncFromSupabase(): Promise<void> {
    try {
      // 1. Sync Profiles (shared across platforms)
      const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('*');
      if (!pErr && profiles) {
        for (const sp of profiles) {
          const existingIdx = this.data.profiles.findIndex(
            (p) => p.id === sp.id || p.email.toLowerCase() === sp.email.toLowerCase()
          );
          const mappedProfile: Profile = {
            id: sp.id,
            email: sp.email,
            display_name: sp.display_name,
            role: sp.role as any,
            country: sp.country,
            is_adult_confirmed: sp.is_adult_confirmed,
            payment_method: sp.payment_method as any,
            payment_details: sp.payment_details || {},
            avatar_url: sp.avatar_url || undefined,
            bio: sp.bio || undefined,
            date_of_birth: sp.date_of_birth || undefined,
            password: sp.password || undefined,
            preferred_category: sp.preferred_category || 'PAGE_TURNING',
            sample_status: sp.sample_status || 'NOT_SUBMITTED',
            sample_submission_id: sp.sample_submission_id || undefined,
            sample_review_notes: sp.sample_review_notes || undefined,
            agreement_signed: Boolean(sp.agreement_signed),
            agreement_signed_at: sp.agreement_signed_at || undefined,
            agreement_signature_name: sp.agreement_signature_name || undefined,
            created_at: sp.created_at || new Date().toISOString(),
          };
          if (existingIdx !== -1) {
            this.data.profiles[existingIdx] = { ...this.data.profiles[existingIdx], ...mappedProfile };
          } else {
            this.data.profiles.push(mappedProfile);
          }
        }
      }

      // 2. Sync Platform Memberships for pinkroom_pages
      const { data: memberships, error: mErr } = await supabaseAdmin
        .from('platform_memberships')
        .select('*')
        .eq('platform_id', PLATFORM_ID);
      if (!mErr && memberships) {
        this.data.platform_memberships = memberships.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          platform_id: m.platform_id,
          role: m.role,
          terms_agreed: Boolean(m.terms_agreed),
          terms_agreed_at: m.terms_agreed_at,
          terms_signature: m.terms_signature,
          created_at: m.created_at,
        }));
      }

      // 3. Sync Submissions for pinkroom_pages ONLY (strict platform isolation)
      const { data: subs, error: sErr } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('platform_id', PLATFORM_ID);
      if (!sErr && subs) {
        for (const ss of subs) {
          const existingIdx = this.data.submissions.findIndex((s) => s.id === ss.id);
          const creator = this.data.profiles.find((p) => p.id === ss.creator_id);
          const isSample = Boolean(ss.is_sample);
          const mappedSub: Submission = {
            id: ss.id,
            platform_id: PLATFORM_ID,
            creator_id: ss.creator_id,
            creator_name: creator?.display_name || (existingIdx !== -1 ? this.data.submissions[existingIdx].creator_name : undefined),
            creator_email: creator?.email || (existingIdx !== -1 ? this.data.submissions[existingIdx].creator_email : undefined),
            title: ss.title,
            category: ss.category || 'PAGE_TURNING',
            duration_seconds: Number(ss.duration_seconds),
            file_url: ss.file_url,
            file_name: ss.file_name,
            file_size_bytes: Number(ss.file_size_bytes),
            status: (ss.status || 'SUBMITTED').toString().toUpperCase() as SubmissionStatus,
            is_sample: isSample,
            agreed_rate_usd: Number(ss.agreed_rate_usd ?? (isSample ? 0 : RATE_PER_VIDEO_USD)),
            payout_status: ss.payout_status as PayoutItemStatus,
            payout_id: ss.payout_id || undefined,
            notes: ss.notes || undefined,
            rejection_reason: ss.rejection_reason || undefined,
            revision_notes: ss.revision_notes || undefined,
            version_number: ss.version_number || 1,
            parent_submission_id: ss.parent_submission_id || undefined,
            created_at: ss.created_at || new Date().toISOString(),
            updated_at: ss.updated_at || new Date().toISOString(),
          };
          if (existingIdx !== -1) {
            this.data.submissions[existingIdx] = { ...this.data.submissions[existingIdx], ...mappedSub };
          } else {
            this.data.submissions.push(mappedSub);
          }
        }
      }

      // 3.5. Sync Submission Versions (Revisions) from Supabase
      const { data: versions, error: vErr } = await supabaseAdmin
        .from('submission_versions')
        .select('*');
      if (!vErr && versions) {
        if (!this.data.submission_versions) this.data.submission_versions = [];
        for (const sv of versions) {
          const existingIdx = this.data.submission_versions.findIndex((v) => v.id === sv.id);
          const mappedVer: SubmissionVersion = {
            id: sv.id,
            submission_id: sv.submission_id,
            version_number: Number(sv.version_number) || 1,
            file_url: sv.file_url,
            file_name: `Revision v${sv.version_number}.mp4`,
            file_size_bytes: 0,
            duration_seconds: Number(sv.duration_seconds) || 0,
            notes: sv.notes || undefined,
            created_at: sv.created_at || new Date().toISOString(),
          };
          if (existingIdx !== -1) {
            this.data.submission_versions[existingIdx] = { ...this.data.submission_versions[existingIdx], ...mappedVer };
          } else {
            this.data.submission_versions.push(mappedVer);
          }
        }
      }

      // 4. Sync Payout Requests for pinkroom_pages ONLY
      const { data: payouts, error: payErr } = await supabaseAdmin
        .from('payout_requests')
        .select('*')
        .eq('platform_id', PLATFORM_ID);
      if (!payErr && payouts) {
        const supabasePayoutIds = new Set(payouts.map((pr) => pr.id));
        this.data.payout_requests = this.data.payout_requests.filter((p) => supabasePayoutIds.has(p.id));

        for (const pr of payouts) {
          const existingIdx = this.data.payout_requests.findIndex((p) => p.id === pr.id);
          const mappedPayout: PayoutRequest = {
            id: pr.id,
            platform_id: PLATFORM_ID,
            creator_id: pr.creator_id,
            creator_name: pr.creator_name || 'Creator',
            creator_email: pr.creator_email || '',
            amount_usd: Number(pr.amount_usd),
            video_count: pr.video_count,
            status: pr.status as PayoutStatus,
            payment_method: pr.payment_method as PaymentMethodType,
            payment_destination: pr.payment_destination,
            submission_ids: pr.submission_ids || [],
            failure_reason: pr.failure_reason || undefined,
            payment_reference: pr.payment_reference || undefined,
            requested_at: pr.requested_at || new Date().toISOString(),
            processed_at: pr.processed_at || undefined,
          };
          if (existingIdx !== -1) {
            this.data.payout_requests[existingIdx] = mappedPayout;
          } else {
            this.data.payout_requests.push(mappedPayout);
          }
        }
      }

      // 5. Sync Earnings Ledger for pinkroom_pages ONLY
      const { data: ledger, error: ledgErr } = await supabaseAdmin
        .from('earnings_ledger')
        .select('*')
        .eq('platform_id', PLATFORM_ID);
      if (!ledgErr && ledger) {
        this.data.earnings_ledger = ledger.map((l: any) => ({
          id: l.id,
          platform_id: PLATFORM_ID,
          creator_id: l.creator_id,
          submission_id: l.submission_id || undefined,
          payout_id: l.payout_id || undefined,
          type: l.type,
          amount_usd: Number(l.amount_usd),
          description: l.description,
          created_at: l.created_at,
        }));
      }

      // 6. Sync Guideline Samples for pinkroom_pages ONLY
      const { data: gSamples, error: gErr } = await supabaseAdmin
        .from('guideline_samples')
        .select('*')
        .or(`platform_id.eq.${PLATFORM_ID},category.eq.PAGE_TURNING`);
      if (!gErr && gSamples && gSamples.length > 0) {
        if (!this.data.guideline_samples) this.data.guideline_samples = [];
        for (const gs of gSamples) {
          const existingIdx = this.data.guideline_samples.findIndex((g) => g.id === gs.id);
          const mappedSample: GuidelineSample = {
            id: gs.id,
            platform_id: PLATFORM_ID,
            title: gs.title || 'Official Sample Guideline',
            description: gs.description || '',
            video_url: gs.video_url,
            file_name: gs.file_name || 'admin_guideline_reference.mp4',
            duration_seconds: Number(gs.duration_seconds) || 180,
            category: 'PAGE_TURNING',
            uploaded_by: gs.uploaded_by || undefined,
            created_at: gs.created_at || new Date().toISOString(),
          };
          if (existingIdx !== -1) {
            this.data.guideline_samples[existingIdx] = mappedSample;
          } else {
            this.data.guideline_samples.push(mappedSample);
          }
        }
      }

      // 7. Live sync Chat Messages — only for pinkroom_pages creators
      // Build list of creator IDs belonging to this platform
      const pagesCreatorIds = new Set(
        this.data.platform_memberships
          .filter((m) => m.platform_id === PLATFORM_ID && m.role === 'CREATOR')
          .map((m) => m.user_id)
      );
      // Also include creators who have submissions on this platform
      this.data.submissions
        .filter((s) => s.platform_id === PLATFORM_ID)
        .forEach((s) => pagesCreatorIds.add(s.creator_id));

      if (pagesCreatorIds.size > 0) {
        const creatorIdList = Array.from(pagesCreatorIds);
        const { data: chats, error: cErr } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .in('creator_id', creatorIdList)
          .order('created_at', { ascending: true });
        if (!cErr && chats && chats.length > 0) {
          this.data.chat_messages = chats.map((c: any) => ({
            id: c.id,
            creator_id: c.creator_id,
            sender_id: c.sender_id,
            sender_name: c.sender_name,
            sender_role: c.sender_role as 'CREATOR' | 'ADMIN',
            message: c.message,
            is_read: Boolean(c.is_read),
            created_at: c.created_at,
          }));
        } else if (!cErr) {
          this.data.chat_messages = [];
        }
      } else {
        this.data.chat_messages = [];
      }

      this.save();
    } catch (err) {
      console.warn('[Pages DB] Supabase live sync exception:', err);
    }
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {}
  }

  private readFromDisk(): DatabaseData {
    try {
      let targetFile = DB_FILE;
      if (!fs.existsSync(DB_FILE) && fs.existsSync(TMP_DB_FILE)) {
        targetFile = TMP_DB_FILE;
      }
      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const parsed: DatabaseData = JSON.parse(raw);
        if (parsed.profiles) {
          const seen = new Set<string>();
          parsed.profiles = parsed.profiles.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return (
              !p.email?.includes('creator.io') &&
              !p.email?.includes('test_') &&
              !p.email?.includes('example.com') &&
              !p.display_name?.includes('Test')
            );
          });
        }
        if (parsed.submissions) {
          parsed.submissions = parsed.submissions.filter((s) => {
            return (
              !s.title?.includes('Unlocked Full Video') &&
              !s.title?.includes('Cancel Test Video') &&
              !s.title?.includes('Qualified Video') &&
              !s.creator_email?.includes('creator.io') &&
              !s.creator_email?.includes('test_') &&
              !s.creator_name?.includes('Test')
            );
          });
          // Strip any leaked submissions from the main platform
          parsed.submissions = parsed.submissions.filter((s) =>
            !s.platform_id || s.platform_id === PLATFORM_ID
          );
        }
        // Filter chat messages to only those belonging to pinkroom_pages creators
        const pagesMemberIds = new Set<string>([
          ...(parsed.platform_memberships || [])
            .filter((m) => m.platform_id === PLATFORM_ID && m.role === 'CREATOR')
            .map((m) => m.user_id),
          ...(parsed.submissions || [])
            .filter((s) => s.platform_id === PLATFORM_ID)
            .map((s) => s.creator_id),
        ]);
        if (parsed.chat_messages && pagesMemberIds.size > 0) {
          parsed.chat_messages = parsed.chat_messages.filter((m) =>
            pagesMemberIds.has(m.creator_id)
          );
        } else if (!parsed.chat_messages) {
          parsed.chat_messages = [];
        }
        return parsed;
      }
    } catch (err) {
      console.warn('[Pages DB] Read error, falling back to seeds:', err);
    }
    const seed = getInitialSeedData();
    this.writeToDisk(seed);
    return seed;
  }

  private writeToDisk(data: DatabaseData): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      try {
        if (!fs.existsSync(TMP_DATA_DIR)) {
          fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (tmpErr) {
        console.warn('[Pages DB] In-memory write only:', tmpErr);
      }
    }
  }

  public save(): void {
    this.writeToDisk(this.data);
  }

  // ==========================================
  // PROFILE & MEMBERSHIP METHODS
  // ==========================================
  getProfiles(role?: 'ADMIN' | 'CREATOR'): Profile[] {
    this.reload();
    if (role) {
      return this.data.profiles.filter((p) => p.role === role);
    }
    return this.data.profiles;
  }

  getPlatformCreators(): Profile[] {
    this.reload();
    const subs = this.data.submissions.filter((s) => s.platform_id === PLATFORM_ID);
    const validCreatorIds = new Set([
      ...this.data.platform_memberships
        .filter((m) => m.platform_id === PLATFORM_ID && m.role === 'CREATOR')
        .map((m) => m.user_id),
      ...subs.map((s) => s.creator_id),
    ]);

    return this.data.profiles.filter((p) => {
      if (p.role !== 'CREATOR') return false;
      return validCreatorIds.has(p.id) || p.preferred_category === 'PAGE_TURNING';
    });
  }

  getProfileById(id: string): Profile | undefined {
    this.reload();
    return this.data.profiles.find((p) => p.id === id);
  }

  /**
   * Auto-remove creators who registered but never submitted an audition sample
   * within the given time window (default: 48 hours / 172_800_000 ms).
   * Removes from: profiles, platform_memberships, notifications.
   * Also propagates deletes to Supabase.
   */
  async removeStaleCreators(olderThanMs = 86_400_000): Promise<{ removed: number; emails: string[] }> {
    this.reload();
    const cutoff = Date.now() - olderThanMs;
    const removed: string[] = [];

    const stale = this.getPlatformCreators().filter((p) => {
      // Must have no sample submission of any kind
      const hasSample = this.data.submissions.some(
        (s) => s.creator_id === p.id && s.is_sample
      );
      if (hasSample) return false;
      // sample_status must still be NOT_SUBMITTED (or missing)
      if (p.sample_status && p.sample_status !== 'NOT_SUBMITTED') return false;
      if (olderThanMs > 0) {
        const joinedAt = p.created_at ? new Date(p.created_at).getTime() : 0;
        if (joinedAt === 0 || joinedAt >= cutoff) return false;
      }
      return true;
    });

    if (stale.length === 0) return { removed: 0, emails: [] };

    const staleIds = new Set(stale.map((p) => p.id));
    const staleEmails = stale.map((p) => p.email);

    // Remove from local data
    this.data.profiles = this.data.profiles.filter((p) => !staleIds.has(p.id));
    this.data.platform_memberships = this.data.platform_memberships.filter(
      (m) => !staleIds.has(m.user_id)
    );
    this.data.notifications = this.data.notifications.filter(
      (n) => !staleIds.has(n.user_id)
    );
    this.save();

    // Propagate to Supabase (best-effort)
    for (const id of staleIds) {
      removed.push(id);
      try {
        await supabaseAdmin.from('platform_memberships').delete().eq('user_id', id);
        await supabaseAdmin.from('notifications').delete().eq('user_id', id);
        await supabaseAdmin.from('chat_messages').delete().or(`creator_id.eq.${id},sender_id.eq.${id}`);
        await supabaseAdmin.from('profiles').delete().eq('id', id);
        try {
          await supabaseAdmin.auth.admin.deleteUser(id);
        } catch {}
      } catch (e) {
        console.warn('[Pages DB] removeStaleCreators Supabase delete warning:', e);
      }
    }

    console.log(`[Pages DB] Removed ${removed.length} stale creator(s):`, staleEmails);
    return { removed: removed.length, emails: staleEmails };
  }

  /**
   * Remove a specific creator account by ID (admin-only action).
   * Cleans up profiles, memberships, notifications. Does NOT delete submissions
   * (retains audit trail). Returns false if creator not found.
   */
  async removeCreatorById(creatorId: string): Promise<boolean> {
    this.reload();
    const profile = this.data.profiles.find((p) => p.id === creatorId && p.role === 'CREATOR');
    if (!profile) return false;

    this.data.profiles = this.data.profiles.filter((p) => p.id !== creatorId);
    this.data.platform_memberships = this.data.platform_memberships.filter(
      (m) => !(m.user_id === creatorId && m.platform_id === PLATFORM_ID)
    );
    this.data.notifications = this.data.notifications.filter(
      (n) => n.user_id !== creatorId
    );
    this.save();

    try {
      await supabaseAdmin.from('platform_memberships').delete().eq('user_id', creatorId).eq('platform_id', PLATFORM_ID);
      await supabaseAdmin.from('profiles').delete().eq('id', creatorId);
    } catch (e) {
      console.warn('[Pages DB] removeCreatorById Supabase delete warning:', e);
    }

    console.log(`[Pages DB] Manually removed creator: ${profile.email} (${creatorId})`);
    return true;
  }

  async getProfileByIdAsync(id: string): Promise<Profile | undefined> {
    const cached = this.getProfileById(id);
    if (cached) return cached;
    try {
      const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
      if (!error && data) {
        const profile: Profile = {
          id: data.id,
          email: data.email,
          display_name: data.display_name,
          role: data.role as any,
          country: data.country,
          is_adult_confirmed: data.is_adult_confirmed,
          payment_method: data.payment_method as any,
          payment_details: data.payment_details || {},
          avatar_url: data.avatar_url || undefined,
          bio: data.bio || undefined,
          date_of_birth: data.date_of_birth || undefined,
          password: data.password || undefined,
          created_at: data.created_at || new Date().toISOString(),
        };
        this.data.profiles.push(profile);
        this.save();
        return profile;
      }
    } catch {}
    return undefined;
  }

  getProfileByEmail(email: string): Profile | undefined {
    return this.data.profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
  }

  async getProfileByEmailAsync(email: string): Promise<Profile | undefined> {
    const cached = this.getProfileByEmail(email);
    if (cached) return cached;
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', email.trim())
        .single();
      if (!error && data) {
        const profile: Profile = {
          id: data.id,
          email: data.email,
          display_name: data.display_name,
          role: data.role as any,
          country: data.country,
          is_adult_confirmed: data.is_adult_confirmed,
          payment_method: data.payment_method as any,
          payment_details: data.payment_details || {},
          avatar_url: data.avatar_url || undefined,
          bio: data.bio || undefined,
          date_of_birth: data.date_of_birth || undefined,
          password: data.password || undefined,
          created_at: data.created_at || new Date().toISOString(),
        };
        this.data.profiles.push(profile);
        this.save();
        return profile;
      }
    } catch {}
    return undefined;
  }

  async getMembership(userId: string): Promise<PlatformMembership | undefined> {
    const mem = this.data.platform_memberships.find(
      (m) => m.user_id === userId && m.platform_id === PLATFORM_ID
    );
    if (mem) return mem;

    try {
      const { data, error } = await supabaseAdmin
        .from('platform_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('platform_id', PLATFORM_ID)
        .single();
      if (!error && data) {
        const mapped: PlatformMembership = {
          id: data.id,
          user_id: data.user_id,
          platform_id: data.platform_id,
          role: data.role,
          terms_agreed: Boolean(data.terms_agreed),
          terms_agreed_at: data.terms_agreed_at,
          terms_signature: data.terms_signature,
          created_at: data.created_at,
        };
        this.data.platform_memberships.push(mapped);
        this.save();
        return mapped;
      }
    } catch {}
    return undefined;
  }

  async enrollMembership(userId: string, signatureName: string): Promise<PlatformMembership> {
    const profile = await this.getProfileByIdAsync(userId);
    if (!profile) throw new Error('User not found.');

    const now = new Date().toISOString();
    const existing = await this.getMembership(userId);
    if (existing) {
      existing.terms_agreed = true;
      existing.terms_agreed_at = now;
      existing.terms_signature = signatureName;
      this.save();

      await supabaseAdmin.from('platform_memberships').upsert({
        id: existing.id,
        user_id: userId,
        platform_id: PLATFORM_ID,
        role: existing.role,
        terms_agreed: true,
        terms_agreed_at: now,
        terms_signature: signatureName,
      });

      return existing;
    }

    const membership: PlatformMembership = {
      id: ensureUuid(),
      user_id: userId,
      platform_id: PLATFORM_ID,
      role: profile.role,
      terms_agreed: true,
      terms_agreed_at: now,
      terms_signature: signatureName,
      created_at: now,
    };

    this.data.platform_memberships.push(membership);
    this.save();

    await supabaseAdmin.from('platform_memberships').insert({
      id: membership.id,
      user_id: userId,
      platform_id: PLATFORM_ID,
      role: membership.role,
      terms_agreed: true,
      terms_agreed_at: now,
      terms_signature: signatureName,
      created_at: now,
    });

    return membership;
  }

  async createProfileAsync(profileData: Profile, signatureName?: string): Promise<Profile> {
    const id = ensureUuid(profileData.id);
    const profile: Profile = {
      ...profileData,
      id,
      email: profileData.email.trim().toLowerCase(),
      preferred_category: profileData.preferred_category || 'PAGE_TURNING',
      sample_status: profileData.sample_status || 'NOT_SUBMITTED',
      is_adult_confirmed: Boolean(profileData.is_adult_confirmed),
      created_at: new Date().toISOString(),
    };
    this.data.profiles.push(profile);

    // Enroll in pinkroom_pages
    const membership: PlatformMembership = {
      id: ensureUuid(),
      user_id: id,
      platform_id: PLATFORM_ID,
      role: profile.role,
      terms_agreed: true,
      terms_agreed_at: new Date().toISOString(),
      terms_signature: signatureName || profile.display_name,
      created_at: new Date().toISOString(),
    };
    this.data.platform_memberships.push(membership);
    this.save();

    // Supabase sync
    try {
      await supabaseAdmin.from('profiles').upsert(
        {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          role: profile.role,
          country: profile.country || 'Nigeria',
          preferred_category: profile.preferred_category || 'PAGE_TURNING',
          is_adult_confirmed: Boolean(profile.is_adult_confirmed),
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null,
          date_of_birth: profile.date_of_birth || null,
          sample_status: profile.sample_status || 'NOT_SUBMITTED',
          sample_submission_id: profile.sample_submission_id || null,
          sample_review_notes: profile.sample_review_notes || null,
          payment_method: profile.payment_method || null,
          payment_details: profile.payment_details || {},
          password: profile.password || null,
          agreement_signed: Boolean(profile.agreement_signed ?? true),
          agreement_signed_at: profile.agreement_signed_at || profile.created_at,
          agreement_signature_name: profile.agreement_signature_name || profile.display_name,
          created_at: profile.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

      await supabaseAdmin.from('platform_memberships').upsert(
        {
          id: membership.id,
          user_id: id,
          platform_id: PLATFORM_ID,
          role: membership.role,
          terms_agreed: true,
          terms_agreed_at: membership.terms_agreed_at,
          terms_signature: membership.terms_signature,
          created_at: membership.created_at,
        },
        { onConflict: 'user_id,platform_id' }
      );
    } catch (e) {
      console.error('[Pages DB] Profile Supabase sync error:', e);
    }

    return profile;
  }

  async updateProfileAsync(id: string, updates: Partial<Profile>): Promise<Profile> {
    const profile = this.getProfileById(id);
    if (!profile) throw new Error('Profile not found.');
    Object.assign(profile, updates);
    this.save();

    try {
      await supabaseAdmin.from('profiles').upsert(
        {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          role: profile.role,
          country: profile.country || 'Nigeria',
          preferred_category: profile.preferred_category || 'PAGE_TURNING',
          is_adult_confirmed: Boolean(profile.is_adult_confirmed),
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null,
          date_of_birth: profile.date_of_birth || null,
          sample_status: profile.sample_status || 'NOT_SUBMITTED',
          sample_submission_id: profile.sample_submission_id || null,
          sample_review_notes: profile.sample_review_notes || null,
          payment_method: profile.payment_method || null,
          payment_details: profile.payment_details || {},
          password: profile.password || null,
          agreement_signed: Boolean(profile.agreement_signed ?? true),
          agreement_signed_at: profile.agreement_signed_at || profile.created_at,
          agreement_signature_name: profile.agreement_signature_name || profile.display_name,
          created_at: profile.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );
    } catch (e) {
      console.error('[Pages DB] Update profile error:', e);
    }
    return profile;
  }

  updateProfile(id: string, updates: Partial<Profile>): Profile {
    const profile = this.getProfileById(id);
    if (!profile) throw new Error('Profile not found.');
    Object.assign(profile, updates);
    this.save();
    (async () => {
      try {
        await supabaseAdmin.from('profiles').update(updates).eq('id', id);
      } catch (e) {
        console.error('[Pages DB] Update profile error:', e);
      }
    })();
    return profile;
  }

  // ==========================================
  // SUBMISSIONS (Scoped to pinkroom_pages)
  // ==========================================
  getSubmissions(filters?: {
    creatorId?: string;
    status?: SubmissionStatus;
    search?: string;
  }): Submission[] {
    this.reload();
    return this.data.submissions
      .filter((s) => {
        if (s.platform_id !== PLATFORM_ID) return false;
        if (filters?.creatorId && s.creator_id !== filters.creatorId) return false;
        if (filters?.status && s.status !== filters.status) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchCreator = (s.creator_name || '').toLowerCase().includes(q);
          const matchEmail = (s.creator_email || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCreator && !matchEmail) return false;
        }
        return true;
      })
      .map((s) => {
        if (!s.creator_name || !s.creator_email) {
          const creator = this.data.profiles.find((p) => p.id === s.creator_id);
          if (creator) {
            return {
              ...s,
              creator_name: s.creator_name || creator.display_name,
              creator_email: s.creator_email || creator.email,
            };
          }
        }
        return s;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSubmissionById(id: string): Submission | undefined {
    return this.data.submissions.find((s) => s.id === id && s.platform_id === PLATFORM_ID);
  }

  createSubmission(submission: {
    creator_id: string;
    creator_name?: string;
    creator_email?: string;
    title: string;
    category?: string;
    duration_seconds: number;
    file_url: string;
    file_name?: string;
    file_size_bytes?: number;
    notes?: string;
    is_sample?: boolean;
  }): Submission {
    // Invariant: Creator must have their 30s sample approved before uploading full paid videos
    if (!submission.is_sample) {
      const creator = this.getProfileById(submission.creator_id);
      if (creator && creator.role === 'CREATOR' && creator.sample_status !== 'APPROVED') {
        throw new Error(
          'Audition required: You must submit a 30-second audition sample and receive Admin approval before uploading full production videos.'
        );
      }
    }

    const id = ensureUuid();
    const now = new Date().toISOString();
    const isSample = Boolean(submission.is_sample);

    const creator = this.getProfileById(submission.creator_id);
    const creatorName = submission.creator_name || creator?.display_name || 'Creator';
    let fileName = submission.file_name || (isSample ? 'audition_sample.mp4' : 'page_turning.mp4');
    if (!fileName.toLowerCase().startsWith(creatorName.toLowerCase())) {
      fileName = `${creatorName} - ${fileName}`;
    }

    const newSub: Submission = {
      id,
      platform_id: PLATFORM_ID,
      creator_id: submission.creator_id,
      creator_name: creatorName,
      creator_email: submission.creator_email || creator?.email,
      title: submission.title,
      category: 'PAGE_TURNING',
      duration_seconds: submission.duration_seconds,
      file_url: submission.file_url,
      file_name: fileName,
      file_size_bytes: submission.file_size_bytes || 0,
      status: isSample ? 'UNDER_REVIEW' : 'SUBMITTED',
      is_sample: isSample,
      agreed_rate_usd: isSample ? 0 : RATE_PER_VIDEO_USD, // Audition sample is unpaid ($0), full production is locked at $50.00
      payout_status: 'UNPAID',
      notes: submission.notes,
      version_number: 1,
      created_at: now,
      updated_at: now,
    };

    this.data.submissions.unshift(newSub);
    const ver1: SubmissionVersion = {
      id: ensureUuid(),
      submission_id: id,
      version_number: 1,
      file_url: newSub.file_url,
      file_name: newSub.file_name,
      file_size_bytes: newSub.file_size_bytes,
      duration_seconds: newSub.duration_seconds,
      notes: newSub.notes,
      created_at: now,
    };
    this.data.submission_versions.push(ver1);

    this.save();
    this.syncSubmissionToSupabase(newSub);
    this.syncSubmissionVersionToSupabase(ver1);

    // In-app & email notification to creator (for both sample and full video)
    this.createNotification({
      user_id: newSub.creator_id,
      title: isSample
        ? '30-Second Audition Submitted for Review'
        : `Page-Turning Video Submitted: "${newSub.title}"`,
      message: isSample
        ? 'Your 30-second audition sample has been received and is queued for administrative review. You will be notified as soon as a decision is made.'
        : `Your video "${newSub.title}" has been submitted for admin quality inspection.`,
      type: 'REVIEW',
      link: isSample ? '/creator/upload' : '/creator/videos',
    });

    // Transactional alert to all admins (for both sample and full video)
    this.notifyAdmins({
      title: isSample
        ? `New Audition Sample Submitted: ${creatorName}`
        : `New Video Submitted: "${newSub.title}"`,
      message: isSample
        ? `${creatorName} (${newSub.creator_email || creator?.email || 'Creator'}) submitted a 30-second audition sample for review. Action required to approve/reject before they can upload full paid videos.`
        : `${creatorName} (${newSub.creator_email || creator?.email || 'Creator'}) submitted a new page-turning video "${newSub.title}" (${Math.round(newSub.duration_seconds)}s) for review.`,
      type: 'REVIEW',
      link: '/admin/submissions',
    });

    return newSub;
  }

  async createSubmissionAsync(submission: any): Promise<Submission> {
    const sub = this.createSubmission(submission);
    const ver = this.data.submission_versions.find(
      (v) => v.submission_id === sub.id && v.version_number === 1
    );
    await Promise.allSettled([
      this.syncSubmissionToSupabase(sub),
      ver ? this.syncSubmissionVersionToSupabase(ver) : Promise.resolve(),
      sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAILS,
        recipientName: 'Admin',
        type: 'REVIEW',
        title: sub.is_sample
          ? `New Audition Sample Submitted: ${sub.creator_name}`
          : `New Video Submitted: "${sub.title}"`,
        message: sub.is_sample
          ? `${sub.creator_name} (${sub.creator_email}) submitted a 30-second audition sample for review. Action required to approve/reject before they can upload full paid videos.`
          : `${sub.creator_name} (${sub.creator_email}) submitted a new page-turning video "${sub.title}" (${Math.round(sub.duration_seconds)}s) for review.`,
        link: '/admin/submissions',
      }),
    ]);
    return sub;
  }

  createRevision(submissionId: string, revision: {
    file_url: string;
    file_name: string;
    file_size_bytes: number;
    duration_seconds: number;
    notes?: string;
  }): Submission {
    const sub = this.getSubmissionById(submissionId);
    if (!sub) throw new Error('Submission not found.');

    const newVersion = (sub.version_number || 1) + 1;
    const now = new Date().toISOString();

    sub.file_url = revision.file_url;
    sub.file_name = revision.file_name;
    sub.file_size_bytes = revision.file_size_bytes;
    sub.duration_seconds = revision.duration_seconds;
    sub.status = 'SUBMITTED';
    sub.revision_notes = undefined;
    sub.rejection_reason = undefined;
    sub.version_number = newVersion;
    sub.updated_at = now;

    const newVer: SubmissionVersion = {
      id: ensureUuid(),
      submission_id: sub.id,
      version_number: newVersion,
      file_url: revision.file_url,
      file_name: revision.file_name,
      file_size_bytes: revision.file_size_bytes,
      duration_seconds: revision.duration_seconds,
      notes: revision.notes,
      created_at: now,
    };
    this.data.submission_versions.push(newVer);

    this.save();
    this.syncSubmissionToSupabase(sub);
    this.syncSubmissionVersionToSupabase(newVer);

    this.createNotification({
      user_id: sub.creator_id,
      title: `Revision Uploaded: "${sub.title}" (v${newVersion})`,
      message: `Version ${newVersion} of "${sub.title}" has been successfully uploaded and is pending admin review.`,
      type: 'REVIEW',
      link: '/creator/videos',
    });

    this.notifyAdmins({
      title: `Revision Submitted: "${sub.title}" (v${newVersion})`,
      message: `${sub.creator_name || 'Creator'} submitted a revised version (v${newVersion}) of "${sub.title}" for review.`,
      type: 'REVIEW',
      link: '/admin/submissions',
    });

    return sub;
  }

  async createRevisionAsync(
    submissionId: string,
    revision: {
      file_url: string;
      file_name: string;
      file_size_bytes: number;
      duration_seconds: number;
      notes?: string;
    }
  ): Promise<Submission> {
    const sub = this.createRevision(submissionId, revision);
    const ver = this.data.submission_versions.find(
      (v) => v.submission_id === sub.id && v.version_number === sub.version_number
    );
    await Promise.allSettled([
      this.syncSubmissionToSupabase(sub),
      ver ? this.syncSubmissionVersionToSupabase(ver) : Promise.resolve(),
      sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAILS,
        recipientName: 'Admin',
        type: 'REVIEW',
        title: `Revision Submitted: "${sub.title}" (v${sub.version_number})`,
        message: `${sub.creator_name || 'Creator'} submitted a revised version (v${sub.version_number}) of "${sub.title}" for review.`,
        link: '/admin/submissions',
      }),
    ]);
    return sub;
  }

  getSubmissionVersions(submissionId: string): SubmissionVersion[] {
    this.reload();
    return (this.data.submission_versions || [])
      .filter((v) => v.submission_id === submissionId)
      .sort((a, b) => a.version_number - b.version_number);
  }

  // ==========================================
  // IDEMPOTENT APPROVAL & REVIEW WORKFLOW
  // ==========================================
  approveSubmission(submissionId: string, adminUser: Profile): Submission {
    const sub = this.getSubmissionById(submissionId);
    if (!sub) throw new Error('Submission not found on page-turning platform.');

    if (sub.payout_status === 'PAID') {
      throw new Error('This submission has already been paid out and cannot be modified.');
    }

    sub.status = 'APPROVED';
    sub.updated_at = new Date().toISOString();
    sub.rejection_reason = undefined;
    sub.revision_notes = undefined;

    // Idempotency: verify only one credit entry is ever created per submission (auditions are unpaid)
    const existingCredit = this.data.earnings_ledger.find(
      (l) => l.submission_id === submissionId && l.type === 'CREDIT' && l.platform_id === PLATFORM_ID
    );

    if (!existingCredit && !sub.is_sample && sub.agreed_rate_usd > 0) {
      const creditEntry: EarningsLedgerEntry = {
        id: ensureUuid(),
        platform_id: PLATFORM_ID,
        creator_id: sub.creator_id,
        submission_id: sub.id,
        type: 'CREDIT',
        amount_usd: sub.agreed_rate_usd, // exactly $50.00
        description: `Approval credit: ${sub.title}`,
        created_at: new Date().toISOString(),
      };
      this.data.earnings_ledger.push(creditEntry);
      this.syncLedgerToSupabase(creditEntry);
    }

    // Update creator audition status if this is an audition sample
    if (sub.is_sample) {
      const creator = this.getProfileById(sub.creator_id);
      if (creator) {
        creator.sample_status = 'APPROVED';
        creator.sample_submission_id = sub.id;
        creator.sample_review_notes = 'Audition meets quality guidelines. Full production unlocked.';
        this.syncProfileToSupabase(creator);
      }
    }

    // In-app & email notification
    this.createNotification({
      user_id: sub.creator_id,
      title: sub.is_sample ? '30s Audition Approved! 🎉' : `Page-Turning Video Approved! (+$${sub.agreed_rate_usd.toFixed(2)})`,
      message: sub.is_sample
        ? 'Your 30-second audition was approved! Full production unlocked: you may now upload your 8 full videos ($50 each).'
        : `Your page-turning video "${sub.title}" was approved. $${sub.agreed_rate_usd.toFixed(2)} USD has been added to your page-turning balance.`,
      type: 'REVIEW',
      link: sub.is_sample ? '/creator/upload' : '/creator/videos',
    });

    this.save();
    this.syncSubmissionToSupabase(sub);
    return sub;
  }

  rejectSubmission(submissionId: string, reason: string, adminUser: Profile): Submission {
    const sub = this.getSubmissionById(submissionId);
    if (!sub) throw new Error('Submission not found.');

    sub.status = 'REJECTED';
    sub.rejection_reason = reason.trim();
    sub.updated_at = new Date().toISOString();

    if (sub.is_sample) {
      const creator = this.getProfileById(sub.creator_id);
      if (creator) {
        creator.sample_status = 'REJECTED';
        creator.sample_review_notes = reason.trim();
        this.syncProfileToSupabase(creator);
      }
    }

    this.createNotification({
      user_id: sub.creator_id,
      title: sub.is_sample ? 'Audition Sample Rejected' : 'Page-Turning Submission Not Approved',
      message: sub.is_sample
        ? `Audition sample could not be approved. Reason: ${reason.trim()}`
        : `Your video "${sub.title}" could not be approved. Reason: ${reason.trim()}`,
      type: 'REVIEW',
      link: sub.is_sample ? '/creator/upload' : '/creator/videos',
    });

    this.save();
    this.syncSubmissionToSupabase(sub);
    return sub;
  }

  requestRevision(submissionId: string, notes: string, adminUser: Profile): Submission {
    const sub = this.getSubmissionById(submissionId);
    if (!sub) throw new Error('Submission not found.');

    sub.status = 'REVISION_REQUESTED';
    sub.revision_notes = notes.trim();
    sub.updated_at = new Date().toISOString();

    if (sub.is_sample) {
      const creator = this.getProfileById(sub.creator_id);
      if (creator) {
        creator.sample_status = 'REVISION_REQUESTED';
        creator.sample_review_notes = notes.trim();
        this.syncProfileToSupabase(creator);
      }
    }

    this.createNotification({
      user_id: sub.creator_id,
      title: sub.is_sample ? 'Audition Sample Revision Requested' : 'Revision Requested for Page-Turning Video',
      message: sub.is_sample
        ? `Revision requested for your audition sample: ${notes.trim()}`
        : `Editorial changes requested for "${sub.title}": ${notes.trim()}`,
      type: 'REVIEW',
      link: sub.is_sample ? '/creator/upload' : '/creator/videos',
    });

    this.save();
    this.syncSubmissionToSupabase(sub);
    return sub;
  }

  // ==========================================
  // EARNINGS & PAYOUTS (Strictly Isolated)
  // ==========================================
  getCreatorStats(creatorId: string) {
    this.reload();
    const creator = this.getProfileById(creatorId);

    // Strictly page_turning platform videos
    const creatorSubmissions = this.data.submissions.filter(
      (s) => s.creator_id === creatorId && s.platform_id === PLATFORM_ID
    );

    // Filter full production videos (audition samples are unpaid and do not count towards 8-video milestone)
    const approvedSubmissions = creatorSubmissions.filter((s) => s.status === 'APPROVED' && !s.is_sample);
    const eligibleForPayout = approvedSubmissions.filter((s) => s.payout_status === 'UNPAID');
    const reservedSubmissions = approvedSubmissions.filter((s) => s.payout_status === 'RESERVED');
    const paidSubmissions = approvedSubmissions.filter((s) => s.payout_status === 'PAID');
    const pendingReviewSubmissions = creatorSubmissions.filter((s) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'PROCESSING'].includes(s.status) && !s.is_sample
    );

    const approvedEarnings = approvedSubmissions.reduce((sum, s) => sum + s.agreed_rate_usd, 0);
    const availablePayoutBalance = eligibleForPayout.reduce((sum, s) => sum + s.agreed_rate_usd, 0);
    const reservedBalance = reservedSubmissions.reduce((sum, s) => sum + s.agreed_rate_usd, 0);
    const totalPaid = paidSubmissions.reduce((sum, s) => sum + s.agreed_rate_usd, 0);
    const pendingReviewValue = pendingReviewSubmissions.reduce((sum, s) => sum + s.agreed_rate_usd, 0);

    const minRequired = MIN_PAYOUT_VIDEOS;
    const eligibleCount = eligibleForPayout.length;
    const canRequestPayout = eligibleCount >= minRequired;
    const remainingToUnlock = Math.max(0, minRequired - eligibleCount);

    return {
      totalSubmissions: creatorSubmissions.length,
      approvedCount: approvedSubmissions.length,
      pendingCount: pendingReviewSubmissions.length,
      eligibleCount,
      minRequired,
      remainingToUnlock,
      canRequestPayout,
      approvedEarnings,
      availablePayoutBalance,
      reservedBalance,
      totalPaid,
      pendingReviewValue,
      eligibleSubmissions: eligibleForPayout,
      sampleStatus: creator?.sample_status || 'NOT_SUBMITTED',
      sampleReviewNotes: creator?.sample_review_notes || null,
      sampleSubmissionId: creator?.sample_submission_id || null,
    };
  }

  requestPayout(
    creatorId: string,
    paymentMethod?: PaymentMethodType,
    paymentDestination?: string
  ): PayoutRequest {
    const stats = this.getCreatorStats(creatorId);
    if (!stats.canRequestPayout) {
      throw new Error(
        `Creators must accumulate at least ${stats.minRequired} approved, unpaid page-turning videos before requesting a payout (currently eligible: ${stats.eligibleCount} videos).`
      );
    }

    const creator = this.getProfileById(creatorId);
    if (!creator) throw new Error('Creator not found.');

    let resolvedMethod = paymentMethod || creator.payment_method;
    if (!resolvedMethod) {
      if (creator.country === 'Nigeria') {
        resolvedMethod = 'NIGERIA_BANK';
      } else if (AFRICAN_MOBILE_MONEY_COUNTRIES.includes(creator.country)) {
        resolvedMethod = 'MOBILE_MONEY';
      } else {
        resolvedMethod = 'WISE';
      }
    }

    let resolvedDestination = (paymentDestination || '').trim();
    if (!resolvedDestination && creator.payment_details) {
      const pd = creator.payment_details;
      if (resolvedMethod === 'WISE' && pd.wise_email) resolvedDestination = pd.wise_email;
      else if (resolvedMethod === 'PAYPAL' && pd.paypal_email) resolvedDestination = pd.paypal_email;
      else if (resolvedMethod === 'NIGERIA_BANK') {
        const b = pd.nigerian_bank_name || 'Nigerian Bank';
        const num = pd.nigerian_account_number;
        const name = pd.nigerian_account_name;
        if (num) resolvedDestination = `${b} - NUBAN: ${num}${name ? ` (${name})` : ''}`;
      } else if (resolvedMethod === 'MOBILE_MONEY') {
        const prov = pd.mobile_money_provider || 'Mobile Money';
        const phone = pd.mobile_money_phone;
        const name = pd.mobile_money_account_name;
        if (phone) resolvedDestination = `${prov} - ${phone}${name ? ` (${name})` : ''}`;
      } else if (resolvedMethod === 'ACH' || resolvedMethod === 'WIRE') {
        const parts = [];
        if (pd.bank_name) parts.push(pd.bank_name);
        if (pd.account_number) parts.push(`Acc: ${pd.account_number}`);
        if (pd.routing_number) parts.push(`Routing: ${pd.routing_number}`);
        if (pd.beneficiary_name) parts.push(`Beneficiary: ${pd.beneficiary_name}`);
        if (parts.length > 0) resolvedDestination = parts.join(', ');
      }
    }

    if (!resolvedDestination) {
      throw new Error('Payout destination details are required. Please enter or save your account details.');
    }

    const eligibleSubmissions = stats.eligibleSubmissions;
    const amountUsd = eligibleSubmissions.reduce((sum, s) => sum + s.agreed_rate_usd, 0);
    const videoCount = eligibleSubmissions.length;
    const submissionIds = eligibleSubmissions.map((s) => s.id);

    const payoutId = ensureUuid();
    const now = new Date().toISOString();

    // 1. Atomic reservation: lock submissions to RESERVED
    for (const subId of submissionIds) {
      const sub = this.data.submissions.find((s) => s.id === subId);
      if (sub) {
        sub.payout_status = 'RESERVED';
        sub.payout_id = payoutId;
        sub.updated_at = now;
        this.syncSubmissionToSupabase(sub);
      }
    }

    // 2. Create payout record scoped to pinkroom_pages
    const payout: PayoutRequest = {
      id: payoutId,
      platform_id: PLATFORM_ID,
      creator_id: creatorId,
      creator_name: creator.display_name,
      creator_email: creator.email,
      amount_usd: amountUsd,
      video_count: videoCount,
      status: 'REQUESTED',
      payment_method: resolvedMethod,
      payment_destination: resolvedDestination,
      submission_ids: submissionIds,
      requested_at: now,
    };
    this.data.payout_requests.unshift(payout);
    this.syncPayoutToSupabase(payout);

    // 3. Ledger reservation entry
    const reserveEntry: EarningsLedgerEntry = {
      id: ensureUuid(),
      platform_id: PLATFORM_ID,
      creator_id: creatorId,
      payout_id: payoutId,
      type: 'RESERVED',
      amount_usd: -amountUsd,
      description: `Reserved for page-turning payout request #${payoutId} (${videoCount} approved videos)`,
      created_at: now,
    };
    this.data.earnings_ledger.push(reserveEntry);
    this.syncLedgerToSupabase(reserveEntry);

    const currency = getLocalCurrency(creator.country, resolvedMethod);
    const localFx = formatLocalFx(amountUsd, currency);
    const fxNotice = currency.code !== 'USD' ? ` (${localFx})` : '';

    this.createNotification({
      user_id: creatorId,
      title: 'Page-Turning Payout Request Submitted',
      message: `Your payout request for $${amountUsd.toFixed(2)} USD${fxNotice} (${videoCount} page-turning videos) has been submitted. Bank processing timeframe: up to 3 working days.`,
      type: 'PAYOUT',
      link: '/creator/payouts',
    });

    this.notifyAdmins({
      title: `New Page-Turning Payout Request: ${creator.display_name}`,
      message: `${creator.display_name} requested a payout of $${amountUsd.toFixed(2)} USD${fxNotice} for ${videoCount} approved page-turning videos via ${resolvedMethod}.`,
      type: 'PAYOUT',
      link: '/admin/payouts',
    });

    this.save();
    return payout;
  }

  confirmPayoutPaid(payoutId: string, paymentReference: string, adminUser: Profile): PayoutRequest {
    const payout = this.data.payout_requests.find((p) => p.id === payoutId && p.platform_id === PLATFORM_ID);
    if (!payout) throw new Error('Payout request not found.');
    if (payout.status === 'PAID') throw new Error('Payout is already confirmed as paid.');

    if (!paymentReference || paymentReference.trim().length === 0) {
      throw new Error('A valid bank transaction reference or payment identifier is strictly required.');
    }

    const now = new Date().toISOString();
    payout.status = 'PAID';
    payout.payment_reference = paymentReference.trim();
    payout.processed_at = now;

    // Permanently mark submissions as PAID
    for (const subId of payout.submission_ids) {
      const sub = this.getSubmissionById(subId);
      if (sub) {
        sub.payout_status = 'PAID';
        sub.updated_at = now;
        this.syncSubmissionToSupabase(sub);
      }
    }

    // Ledger PAID entry
    const paidEntry: EarningsLedgerEntry = {
      id: ensureUuid(),
      platform_id: PLATFORM_ID,
      creator_id: payout.creator_id,
      payout_id: payout.id,
      type: 'PAID',
      amount_usd: payout.amount_usd,
      description: `Disbursed via ${payout.payment_method} (Ref: ${paymentReference.trim()})`,
      created_at: now,
    };
    this.data.earnings_ledger.push(paidEntry);
    this.syncLedgerToSupabase(paidEntry);

    const creator = this.getProfileById(payout.creator_id);
    const currency = getLocalCurrency(creator?.country, payout.payment_method);
    const localFx = formatLocalFx(payout.amount_usd, currency);
    const fxNotice = currency.code !== 'USD' ? ` (${localFx})` : '';

    this.createNotification({
      user_id: payout.creator_id,
      title: 'Page-Turning Payout Completed',
      message: `Your payout request #${payout.id} for $${payout.amount_usd.toFixed(2)} USD${fxNotice} has been paid! Reference: ${paymentReference.trim()}. Please allow up to 3 working days for your bank to settle the deposit.`,
      type: 'PAYOUT',
      link: '/creator/payouts',
    });

    this.save();
    this.syncPayoutToSupabase(payout);
    return payout;
  }

  markPayoutProcessing(payoutId: string, adminUser: Profile): PayoutRequest {
    const payout = this.data.payout_requests.find((p) => p.id === payoutId && p.platform_id === PLATFORM_ID);
    if (!payout) throw new Error('Payout request not found.');
    payout.status = 'PROCESSING';
    this.save();
    this.syncPayoutToSupabase(payout);
    return payout;
  }

  cancelOrFailPayout(payoutId: string, reason: string, adminUser: Profile, isFailed = false): PayoutRequest {
    const payout = this.data.payout_requests.find((p) => p.id === payoutId && p.platform_id === PLATFORM_ID);
    if (!payout) throw new Error('Payout request not found.');
    if (payout.status === 'PAID') throw new Error('Cannot cancel a payout that has already been confirmed as paid.');

    const now = new Date().toISOString();
    payout.status = isFailed ? 'FAILED' : 'CANCELLED';
    payout.failure_reason = reason.trim();
    payout.processed_at = now;

    // Release reserved submissions safely back to UNPAID
    for (const subId of payout.submission_ids) {
      const sub = this.getSubmissionById(subId);
      if (sub && sub.payout_status === 'RESERVED') {
        sub.payout_status = 'UNPAID';
        sub.payout_id = undefined;
        sub.updated_at = now;
        this.syncSubmissionToSupabase(sub);
      }
    }

    // Release reservation in ledger
    const releaseEntry: EarningsLedgerEntry = {
      id: ensureUuid(),
      platform_id: PLATFORM_ID,
      creator_id: payout.creator_id,
      payout_id: payout.id,
      type: 'RELEASED',
      amount_usd: payout.amount_usd,
      description: `Released reservation for ${payout.status} payout #${payout.id}: ${reason.trim()}`,
      created_at: now,
    };
    this.data.earnings_ledger.push(releaseEntry);
    this.syncLedgerToSupabase(releaseEntry);

    this.createNotification({
      user_id: payout.creator_id,
      title: `Payout Request ${payout.status}`,
      message: `Your page-turning payout request #${payout.id} was ${payout.status.toLowerCase()}. Reason: ${reason.trim()}. Your approved video credits have been safely released back to your available balance.`,
      type: 'PAYOUT',
      link: '/creator/payouts',
    });

    this.save();
    this.syncPayoutToSupabase(payout);
    return payout;
  }

  // ==========================================
  // NOTIFICATIONS & AUDIT
  // ==========================================
  createNotification(
    notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read' | 'platform_id'>,
    options?: { skipEmail?: boolean }
  ): NotificationItem {
    const id = ensureUuid();
    const item: NotificationItem = {
      ...notif,
      id,
      platform_id: PLATFORM_ID,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.save();

    if (options?.skipEmail) {
      return item;
    }

    // Trigger transactional email
    const recipient = this.getProfileById(notif.user_id);
    const isAdminTarget =
      notif.user_id === 'admin-001' ||
      notif.user_id === 'admin' ||
      notif.user_id === '694d15ea-ff2c-43ff-967d-80b7817534a8' ||
      notif.user_id === 'c0000000-0000-4000-8000-000000000001' ||
      recipient?.role === 'ADMIN';

    if (isAdminTarget) {
      sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAILS,
        recipientName: 'Admin',
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
      }).catch((err) => {
        console.warn('[Pages DB] Admin email dispatch warning:', err);
      });
    } else {
      if (recipient && recipient.email) {
        sendNotificationEmail({
          to: recipient.email,
          recipientName: recipient.display_name,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
        }).catch((err) => {
          console.warn('[Pages DB] Email dispatch warning:', err);
        });
      }
    }

    return item;
  }

  notifyAdmins(payload: {
    title: string;
    message: string;
    type?: 'REVIEW' | 'PAYOUT' | 'SYSTEM' | 'GENERAL';
    link?: string;
  }): void {
    // 1. In-app notifications for all registered admin profiles
    const adminProfiles = (this.data.profiles || []).filter((p) => p.role === 'ADMIN');
    for (const admin of adminProfiles) {
      const item: NotificationItem = {
        id: ensureUuid(),
        user_id: admin.id,
        platform_id: PLATFORM_ID,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'GENERAL',
        link: payload.link || '/admin/submissions',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      this.data.notifications.unshift(item);
    }
    this.save();

    // 2. Immediate transactional email to all configured admin email inboxes
    sendNotificationEmail({
      to: ADMIN_NOTIFICATION_EMAILS,
      recipientName: 'Admin',
      type: payload.type || 'GENERAL',
      title: payload.title,
      message: payload.message,
      link: payload.link || '/admin/submissions',
    }).catch((err) => {
      console.warn('[Pages DB] notifyAdmins email dispatch warning:', err);
    });
  }

  getNotifications(userId: string): NotificationItem[] {
    this.reload();
    return this.data.notifications.filter(
      (n) => n.user_id === userId && n.platform_id === PLATFORM_ID
    );
  }

  markNotificationRead(id: string, userId?: string): void {
    const notif = this.data.notifications.find(
      (n) => n.id === id && (!userId || n.user_id === userId)
    );
    if (notif) {
      notif.is_read = true;
      this.save();
    }
  }

  markAllNotificationsRead(userId: string): void {
    let changed = false;
    for (const notif of this.data.notifications) {
      if (notif.user_id === userId && notif.platform_id === PLATFORM_ID && !notif.is_read) {
        notif.is_read = true;
        changed = true;
      }
    }
    if (changed) {
      this.save();
    }
  }

  getAllNotifications(limit = 100): Array<NotificationItem & { recipient_name?: string; recipient_email?: string }> {
    this.reload();
    return (this.data.notifications || [])
      .filter((n) => n.platform_id === PLATFORM_ID)
      .slice(0, limit)
      .map((n) => {
        const recipient = this.getProfileById(n.user_id);
        return {
          ...n,
          recipient_name: recipient?.display_name || (n.user_id.startsWith('admin') ? 'Admin' : 'Creator'),
          recipient_email: recipient?.email || '',
        };
      });
  }

  // Supabase sync helpers
  public async syncSubmissionToSupabase(sub: Submission) {
    try {
      const { error } = await supabaseAdmin.from('submissions').upsert(
        {
          id: ensureUuid(sub.id),
          platform_id: PLATFORM_ID,
          creator_id: ensureUuid(sub.creator_id),
          title: sub.title,
          category: 'PAGE_TURNING',
          duration_seconds: Math.round(sub.duration_seconds || 0),
          file_url: sub.file_url,
          file_name: sub.file_name || 'page_turning.mp4',
          file_size_bytes: sub.file_size_bytes || 0,
          status: sub.status,
          agreed_rate_usd: sub.agreed_rate_usd,
          payout_status: sub.payout_status,
          payout_id: sub.payout_id ? ensureUuid(sub.payout_id) : null,
          notes: sub.notes || null,
          rejection_reason: sub.rejection_reason || null,
          revision_notes: sub.revision_notes || null,
          version_number: sub.version_number || 1,
          is_sample: Boolean(sub.is_sample),
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Pages DB] Submission Supabase sync error:', error);
      }
    } catch (e) {
      console.warn('[Pages DB] Submission sync warning:', e);
    }
  }

  public async syncSubmissionVersionToSupabase(version: SubmissionVersion) {
    try {
      const { error } = await supabaseAdmin.from('submission_versions').upsert(
        {
          id: ensureUuid(version.id),
          submission_id: ensureUuid(version.submission_id),
          version_number: version.version_number,
          file_url: version.file_url,
          duration_seconds: Math.round(version.duration_seconds || 0),
          notes: version.notes || null,
          created_at: version.created_at,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Pages DB] SubmissionVersion Supabase sync error:', error);
      }
    } catch (e) {
      console.warn('[Pages DB] Version sync warning:', e);
    }
  }

  public async syncProfileToSupabase(profile: Profile) {
    try {
      const { error } = await supabaseAdmin.from('profiles').upsert(
        {
          id: ensureUuid(profile.id),
          email: profile.email,
          display_name: profile.display_name,
          role: profile.role,
          country: profile.country,
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null,
          date_of_birth: profile.date_of_birth || null,
          password: profile.password || null,
          preferred_category: profile.preferred_category || 'PAGE_TURNING',
          sample_status: profile.sample_status || 'NOT_SUBMITTED',
          sample_submission_id: profile.sample_submission_id ? ensureUuid(profile.sample_submission_id) : null,
          sample_review_notes: profile.sample_review_notes || null,
          payment_method: profile.payment_method || null,
          payment_details: profile.payment_details || {},
          agreement_signed: profile.agreement_signed ?? true,
          agreement_signed_at: profile.agreement_signed_at || null,
          agreement_signature_name: profile.agreement_signature_name || null,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Pages DB] Profile Supabase sync error:', error);
      }
    } catch (e) {
      console.warn('[Pages DB] Profile sync warning:', e);
    }
  }

  private async syncPayoutToSupabase(payout: PayoutRequest) {
    try {
      await supabaseAdmin.from('payout_requests').upsert(
        {
          id: ensureUuid(payout.id),
          platform_id: PLATFORM_ID,
          creator_id: ensureUuid(payout.creator_id),
          creator_name: payout.creator_name,
          creator_email: payout.creator_email,
          amount_usd: payout.amount_usd,
          video_count: payout.video_count,
          status: payout.status,
          payment_method: payout.payment_method,
          payment_destination: payout.payment_destination,
          submission_ids: payout.submission_ids || [],
          payment_reference: payout.payment_reference || null,
          failure_reason: payout.failure_reason || null,
          requested_at: payout.requested_at,
          processed_at: payout.processed_at || null,
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('[Pages DB] Payout sync warning:', e);
    }
  }

  private async syncLedgerToSupabase(entry: EarningsLedgerEntry) {
    try {
      await supabaseAdmin.from('earnings_ledger').upsert(
        {
          id: ensureUuid(entry.id),
          platform_id: PLATFORM_ID,
          creator_id: ensureUuid(entry.creator_id),
          submission_id: entry.submission_id ? ensureUuid(entry.submission_id) : null,
          payout_id: entry.payout_id ? ensureUuid(entry.payout_id) : null,
          type: entry.type,
          amount_usd: entry.amount_usd,
          description: entry.description,
          created_at: entry.created_at,
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('[Pages DB] Ledger sync warning:', e);
    }
  }

  getSettings(): PlatformSettings {
    this.reload();
    return this.data.settings || DEFAULT_SETTINGS;
  }

  updateSettings(updates: Partial<PlatformSettings>, adminUser?: Profile): PlatformSettings {
    this.reload();
    this.data.settings = { ...DEFAULT_SETTINGS, ...this.data.settings, ...updates };
    this.save();
    if (adminUser) {
      this.createAuditEvent({
        platform_id: PLATFORM_ID,
        actor_id: adminUser.id,
        actor_name: adminUser.display_name,
        action: 'SETTINGS_UPDATED',
        target_type: 'SYSTEM',
        target_id: PLATFORM_ID,
        details: updates,
      });
    }
    return this.data.settings;
  }

  createAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): AuditEvent {
    const id = ensureUuid();
    const item: AuditEvent = {
      ...event,
      id,
      created_at: new Date().toISOString(),
    };
    if (!this.data.audit_events) this.data.audit_events = [];
    this.data.audit_events.unshift(item);
    this.save();
    return item;
  }

  getGuidelineSamples(): GuidelineSample[] {
    this.reload();
    return (this.data.guideline_samples || [])
      .filter((g) => g.platform_id === PLATFORM_ID || g.category === 'PAGE_TURNING')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  createGuidelineSample(sample: Omit<GuidelineSample, 'id' | 'created_at' | 'platform_id'>): GuidelineSample {
    const id = ensureUuid();
    const item: GuidelineSample = {
      ...sample,
      id,
      platform_id: PLATFORM_ID,
      category: 'PAGE_TURNING',
      created_at: new Date().toISOString(),
    };
    if (!this.data.guideline_samples) this.data.guideline_samples = [];
    this.data.guideline_samples.unshift(item);
    this.save();
    this.syncGuidelineSampleToSupabase(item);
    return item;
  }

  public async syncGuidelineSampleToSupabase(sample: GuidelineSample) {
    try {
      const payload: any = {
        id: ensureUuid(sample.id),
        platform_id: PLATFORM_ID,
        title: sample.title,
        description: sample.description,
        video_url: sample.video_url,
        file_name: sample.file_name,
        duration_seconds: sample.duration_seconds,
        category: 'PAGE_TURNING',
        uploaded_by:
          sample.uploaded_by &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sample.uploaded_by)
            ? sample.uploaded_by
            : null,
        created_at: sample.created_at,
      };
      await supabaseAdmin.from('guideline_samples').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Pages DB] Supabase guideline sample sync exception:', err);
    }
  }

  deleteGuidelineSample(id: string, adminUser?: Profile): boolean {
    if (!this.data.guideline_samples) return false;
    const idx = this.data.guideline_samples.findIndex((g) => g.id === id && (g.platform_id === PLATFORM_ID || g.category === 'PAGE_TURNING'));
    if (idx !== -1) {
      this.data.guideline_samples.splice(idx, 1);
      this.save();
      try {
        supabaseAdmin.from('guideline_samples').delete().eq('id', id);
      } catch {}
      if (adminUser) {
        this.createAuditEvent({
          platform_id: PLATFORM_ID,
          actor_id: adminUser.id,
          actor_name: adminUser.display_name,
          action: 'GUIDELINE_SAMPLE_DELETED',
          target_type: 'GUIDELINE_SAMPLE',
          target_id: id,
          details: { sampleId: id },
        });
      }
      return true;
    }
    return false;
  }

  getPayoutRequests(filters?: { creatorId?: string; status?: PayoutStatus }): PayoutRequest[] {
    this.reload();
    return this.data.payout_requests
      .filter((p) => {
        if (p.platform_id !== PLATFORM_ID) return false;
        if (filters?.creatorId && p.creator_id !== filters.creatorId) return false;
        if (filters?.status && p.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }

  getEarningsLedger(creatorId?: string): EarningsLedgerEntry[] {
    this.reload();
    return this.data.earnings_ledger
      .filter((l) => (!creatorId || l.creator_id === creatorId) && l.platform_id === PLATFORM_ID)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getAuditEvents(): AuditEvent[] {
    this.reload();
    return (this.data.audit_events || [])
      .filter((a) => a.platform_id === PLATFORM_ID)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==========================================
  // CREATOR 30-SECOND AUDITION SAMPLE WORKFLOW
  // ==========================================
  submitCreatorSample(
    creatorId: string,
    sampleData: {
      file_url: string;
      file_name: string;
      file_size_bytes: number;
      duration_seconds: number;
      notes?: string;
    }
  ): { profile: Profile; submission: Submission } {
    const creator = this.getProfileById(creatorId);
    if (!creator) throw new Error('Creator profile not found.');

    const subId = ensureUuid();
    const submission: Submission = {
      id: subId,
      platform_id: PLATFORM_ID,
      creator_id: creator.id,
      creator_name: creator.display_name,
      creator_email: creator.email,
      title: `${creator.display_name} - 30s Audition Sample`,
      category: 'PAGE_TURNING',
      duration_seconds: sampleData.duration_seconds,
      file_url: sampleData.file_url,
      file_name: sampleData.file_name,
      file_size_bytes: sampleData.file_size_bytes,
      status: 'UNDER_REVIEW',
      agreed_rate_usd: 0, // Audition sample is unpaid
      payout_status: 'UNPAID',
      is_sample: true,
      notes: sampleData.notes,
      version_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.submissions.unshift(submission);
    const ver1: SubmissionVersion = {
      id: ensureUuid(),
      submission_id: subId,
      version_number: 1,
      file_url: submission.file_url,
      file_name: submission.file_name,
      file_size_bytes: submission.file_size_bytes,
      duration_seconds: submission.duration_seconds,
      notes: submission.notes,
      created_at: submission.created_at,
    };
    this.data.submission_versions.push(ver1);

    creator.sample_status = 'PENDING_REVIEW';
    creator.sample_submission_id = subId;
    this.save();
    this.syncSubmissionToSupabase(submission);
    this.syncSubmissionVersionToSupabase(ver1);
    this.syncProfileToSupabase(creator);

    this.createNotification({
      user_id: creator.id,
      title: '30-Second Audition Sample Submitted',
      message: 'Your 30-second audition sample has been received and is currently under review by our administration team.',
      type: 'REVIEW',
      link: '/creator/upload',
    });

    this.notifyAdmins({
      title: `Audition Sample Submitted: ${creator.display_name}`,
      message: `${creator.display_name} (${creator.email}) has submitted a 30-second page-turning audition sample for review.`,
      type: 'REVIEW',
      link: '/admin/submissions',
    });

    return { profile: creator, submission };
  }

  async submitCreatorSampleAsync(
    creatorId: string,
    sampleData: {
      file_url: string;
      file_name: string;
      file_size_bytes: number;
      duration_seconds: number;
      notes?: string;
    }
  ): Promise<{ profile: Profile; submission: Submission }> {
    const res = this.submitCreatorSample(creatorId, sampleData);
    const ver = this.data.submission_versions.find(
      (v) => v.submission_id === res.submission.id && v.version_number === 1
    );
    await Promise.allSettled([
      this.syncSubmissionToSupabase(res.submission),
      this.syncProfileToSupabase(res.profile),
      ver ? this.syncSubmissionVersionToSupabase(ver) : Promise.resolve(),
      sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAILS,
        recipientName: 'Admin',
        type: 'REVIEW',
        title: `Audition Sample Submitted: ${res.profile.display_name}`,
        message: `${res.profile.display_name} (${res.profile.email}) has submitted a 30-second page-turning audition sample for review.`,
        link: '/admin/submissions',
      }),
      res.profile.email
        ? sendNotificationEmail({
            to: res.profile.email,
            recipientName: res.profile.display_name || 'Creator',
            type: 'REVIEW',
            title: '30-Second Audition Sample Submitted',
            message:
              'Your 30-second audition sample has been received and is currently under review by our administration team. You will receive an email as soon as your sample is reviewed.',
            link: '/creator/upload',
          })
        : Promise.resolve(),
    ]);
    return res;
  }

  approveCreatorSample(creatorId: string, adminUser: Profile, notes?: string): Profile {
    const creator = this.getProfileById(creatorId);
    if (!creator) throw new Error('Creator not found.');

    creator.sample_status = 'APPROVED';
    creator.sample_review_notes =
      notes || 'Audition meets quality guidelines. You may now produce and upload the 8 full paid videos ($50 each).';

    // Update all sample submissions for this creator to APPROVED
    const sampleSubs = this.data.submissions.filter(
      (s) => s.creator_id === creator.id && s.is_sample && s.platform_id === PLATFORM_ID
    );
    for (const sub of sampleSubs) {
      sub.status = 'APPROVED';
      sub.updated_at = new Date().toISOString();
      this.syncSubmissionToSupabase(sub);

      // Auto-set the approved sample as official guideline reference sample
      if (sub.file_url) {
        try {
          this.createGuidelineSample({
            title: `Official Guideline Sample: Page Turning (${creator.display_name || 'Exemplary Audition'})`,
            description: notes || 'Official verified reference sample for page-turning audio standards, pacing, and overhead camera framing.',
            video_url: sub.file_url,
            file_name: sub.file_name || 'official_page_turning_sample.mp4',
            duration_seconds: sub.duration_seconds || 30,
            category: 'PAGE_TURNING',
            uploaded_by: adminUser.id || adminUser.display_name,
          });
        } catch (sampleErr) {
          console.warn('[Pages DB] Auto-publishing approved sample as guideline error:', sampleErr);
        }
      }
    }

    this.createNotification({
      user_id: creator.id,
      title: 'Audition Approved — Full Production Unlocked! 🎉',
      message:
        'Your 30-second audition sample meets our page-turning quality standard! Full production portal unlocked: you may now upload your 8 full videos ($50 each).',
      type: 'REVIEW',
      link: '/creator/upload',
    });

    this.createAuditEvent({
      platform_id: PLATFORM_ID,
      actor_id: adminUser.id,
      actor_name: adminUser.display_name,
      action: 'APPROVE_SUBMISSION',
      target_type: 'PROFILE',
      target_id: creator.id,
      details: { sample_submission_id: creator.sample_submission_id, notes },
    });

    this.save();
    this.syncProfileToSupabase(creator);
    return creator;
  }

  rejectCreatorSample(creatorId: string, adminUser: Profile, reason: string, isRevision: boolean = true): Profile {
    const creator = this.getProfileById(creatorId);
    if (!creator) throw new Error('Creator not found.');

    creator.sample_status = isRevision ? 'REVISION_REQUESTED' : 'REJECTED';
    creator.sample_review_notes = reason;

    // Update all sample submissions for this creator
    const sampleSubs = this.data.submissions.filter(
      (s) => s.creator_id === creator.id && s.is_sample && s.platform_id === PLATFORM_ID
    );
    for (const sub of sampleSubs) {
      sub.status = isRevision ? 'REVISION_REQUESTED' : 'REJECTED';
      sub.revision_notes = reason;
      sub.updated_at = new Date().toISOString();
      this.syncSubmissionToSupabase(sub);
    }

    this.createNotification({
      user_id: creator.id,
      title: isRevision ? 'Audition Sample Revision Requested' : 'Audition Sample Rejected',
      message: reason,
      type: 'REVIEW',
      link: '/creator/upload',
    });

    this.createAuditEvent({
      platform_id: PLATFORM_ID,
      actor_id: adminUser.id,
      actor_name: adminUser.display_name,
      action: isRevision ? 'REVISION_REQUESTED' : 'REJECT_SUBMISSION',
      target_type: 'PROFILE',
      target_id: creator.id,
      details: { sample_submission_id: creator.sample_submission_id, reason },
    });

    this.save();
    this.syncProfileToSupabase(creator);
    return creator;
  }

  getPlatformStats() {
    this.reload();
    const subs = this.data.submissions.filter((s) => s.platform_id === PLATFORM_ID);
    const totalSubmissions = subs.length;
    const totalFullVideos = subs.filter((s) => !s.is_sample).length;
    const totalSamples = subs.filter((s) => s.is_sample).length;
    const approved = subs.filter((s) => s.status === 'APPROVED').length;
    const approvedFullCount = subs.filter((s) => s.status === 'APPROVED' && !s.is_sample).length;
    const approvedSamplesCount = subs.filter((s) => s.status === 'APPROVED' && s.is_sample).length;
    const rejected = subs.filter((s) => s.status === 'REJECTED').length;
    const revision = subs.filter((s) => s.status === 'REVISION_REQUESTED').length;
    const pending = subs.filter((s) => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status)).length;
    const pendingFullCount = subs.filter(
      (s) => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status) && !s.is_sample
    ).length;
    const pendingSamplesCount = subs.filter(
      (s) => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status) && s.is_sample
    ).length;
    const totalRevisions = (this.data.submission_versions || []).length;

    const outstandingLiability = subs
      .filter((s) => s.status === 'APPROVED' && s.payout_status !== 'PAID' && !s.is_sample)
      .reduce((sum, s) => sum + (s.agreed_rate_usd || 0), 0);

    const platformPayouts = this.data.payout_requests.filter((p) => p.platform_id === PLATFORM_ID);
    const totalConfirmedPaid = platformPayouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount_usd, 0);

    const pendingPayoutRequests = platformPayouts.filter((p) =>
      ['REQUESTED', 'PROCESSING'].includes(p.status)
    ).length;

    const creatorCount = this.getPlatformCreators().length;

    const platformLedger = this.data.earnings_ledger.filter((l) => l.platform_id === PLATFORM_ID);
    const totalLedgerEntries = platformLedger.length;
    const platformAudit = this.data.audit_events.filter((a) => a.platform_id === PLATFORM_ID);
    const totalAuditEvents = platformAudit.length;

    return {
      totalSubmissions,
      totalFullVideos,
      totalSamples,
      totalRevisions,
      approvedCount: approved,
      approvedFullCount,
      approvedSamplesCount,
      pendingCount: pending,
      pendingFullCount,
      pendingSamplesCount,
      rejectedCount: rejected,
      revisionCount: revision,
      outstandingLiability,
      totalConfirmedPaid,
      pendingPayoutRequests,
      creatorCount,
      totalLedgerEntries,
      totalAuditEvents,
      unreadChatCount: (this.data.chat_messages || []).filter(
        (m) => !m.is_read && m.sender_role === 'CREATOR'
      ).length,
      activeChatConversations: this.getChatConversations().length,
    };
  }

  // ==========================================
  // REAL-TIME CREATOR <-> ADMIN CHAT
  // ==========================================
  public async syncChatToSupabase(msg: ChatMessage) {
    try {
      const targetCreatorId = ensureUuid(msg.creator_id);
      const targetSenderId = (msg.sender_id === 'admin-001' || msg.sender_id === 'admin-unlymitedsoundz-001')
        ? '694d15ea-ff2c-43ff-967d-80b7817534a8'
        : ensureUuid(msg.sender_id);

      const creator = this.data.profiles.find((p) => p.id === targetCreatorId);
      if (creator) await this.syncProfileToSupabase(creator);
      const sender = this.data.profiles.find((p) => p.id === targetSenderId);
      if (sender) await this.syncProfileToSupabase(sender);

      const payload: any = {
        id: ensureUuid(msg.id),
        creator_id: targetCreatorId,
        sender_id: targetSenderId,
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        message: msg.message,
        is_read: Boolean(msg.is_read),
        created_at: msg.created_at,
      };
      const { error } = await supabaseAdmin.from('chat_messages').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('[Pages DB] Failed to sync chat message to Supabase:', error);
      }
    } catch (err) {
      console.error('[Pages DB] Supabase chat sync exception:', err);
    }
  }

  getChatMessages(creatorId: string): ChatMessage[] {
    if (!this.data.chat_messages) this.data.chat_messages = [];
    return this.data.chat_messages
      .filter((m) => m.creator_id === creatorId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getChatConversations(): { creator: Profile; lastMessage: ChatMessage; unreadCount: number }[] {
    if (!this.data.chat_messages) this.data.chat_messages = [];
    // Use getPlatformCreators() to ensure only pinkroom_pages creators are shown
    const creators = this.getPlatformCreators();
    const result: { creator: Profile; lastMessage: ChatMessage; unreadCount: number }[] = [];

    for (const creator of creators) {
      const messages = this.getChatMessages(creator.id);
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter((m) => !m.is_read && m.sender_role === 'CREATOR').length;
        result.push({ creator, lastMessage, unreadCount });
      }
    }

    return result.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }

  sendChatMessage(creatorId: string, sender: Profile, messageText: string): ChatMessage {
    if (!this.data.chat_messages) this.data.chat_messages = [];
    const newMsg: ChatMessage = {
      id: ensureUuid(),
      creator_id: creatorId,
      sender_id: sender.id,
      sender_name: sender.display_name,
      sender_role: sender.role,
      message: messageText.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    this.data.chat_messages.push(newMsg);

    // If sender is ADMIN, notify the creator
    if (sender.role === 'ADMIN') {
      this.createNotification({
        user_id: creatorId,
        title: 'New Support Message from Admin',
        message: messageText.length > 80 ? messageText.substring(0, 77) + '...' : messageText,
        type: 'REVIEW',
        link: '/creator/messages',
      });
    } else {
      // If sender is CREATOR, notify admins
      this.createNotification({
        user_id: 'admin-001',
        title: `New Message from ${sender.display_name}`,
        message: messageText.length > 80 ? messageText.substring(0, 77) + '...' : messageText,
        type: 'REVIEW',
        link: `/admin/chat?creatorId=${creatorId}`,
      });
    }

    this.save();
    this.syncChatToSupabase(newMsg);
    return newMsg;
  }

  markChatRead(creatorId: string, readerRole: 'CREATOR' | 'ADMIN'): void {
    if (!this.data.chat_messages) return;
    let changed = false;
    const updated: ChatMessage[] = [];
    this.data.chat_messages.forEach((m) => {
      if (m.creator_id === creatorId && m.sender_role !== readerRole && !m.is_read) {
        m.is_read = true;
        changed = true;
        updated.push(m);
      }
    });
    if (changed) {
      this.save();
      for (const m of updated) {
        this.syncChatToSupabase(m);
      }
    }
  }

  getAdminUnreadChatCount(): number {
    this.reload();
    return (this.data.chat_messages || []).filter(
      (m) => !m.is_read && m.sender_role === 'CREATOR'
    ).length;
  }

  getCreatorUnreadChatCount(creatorId: string): number {
    this.reload();
    return (this.data.chat_messages || []).filter(
      (m) => m.creator_id === creatorId && !m.is_read && m.sender_role === 'ADMIN'
    ).length;
  }
}

export const db = new PagesDatabaseService();
