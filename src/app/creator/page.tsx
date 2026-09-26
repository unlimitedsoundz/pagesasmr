'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Video,
  Clock,
  CheckCircle2,
  Lock,
  Wallet,
  Upload,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import VideoThumbnail from '@/components/VideoThumbnail';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import {
  playNotificationChime,
  sendBrowserPushNotification,
} from '@/lib/notifications';

export default function CreatorDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<any>(null);

  useEffect(() => {
    profileRef.current = data?.profile;
  }, [data?.profile]);

  const fetchDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [statsRes, subsRes, notifsRes] = await Promise.all([
        fetch('/api/creator/stats', { cache: 'no-store' }),
        fetch('/api/submissions', { cache: 'no-store' }),
        fetch('/api/notifications', { cache: 'no-store' }),
      ]);

      const [statsData, subsData, notifsData] = await Promise.all([
        statsRes.json(),
        subsRes.json(),
        notifsRes.json(),
      ]);

      if (statsData?.profile) {
        setData(statsData);
      }
      if (subsData?.submissions) {
        setSubmissions(subsData.submissions);
      }
      if (notifsData?.notifications) {
        setNotifications(notifsData.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);

    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        const myId = profileRef.current?.id;
        if (msg.creatorId && myId && msg.creatorId !== myId) return;

        handleReviewEvent(msg);
        fetchDashboardData(false);
      };
    } catch (e) {}

    const realtimeChannel = supabase
      .channel('submission-updates')
      .on('broadcast', { event: 'submission_reviewed' }, (payload: any) => {
        const d = payload.payload;
        if (!d) return;

        const myId = profileRef.current?.id;
        if (d.creatorId && myId && d.creatorId !== myId) return;

        handleReviewEvent(d);
        fetchDashboardData(false);
      })
      .subscribe();

    const postgresSubChannel = supabase
      .channel('public:submissions-creator')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        (payload: any) => {
          const myId = profileRef.current?.id;
          if (payload.new && myId && payload.new.creator_id === myId) {
            fetchDashboardData(false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const myId = profileRef.current?.id;
          if (payload.new && myId && payload.new.user_id === myId) {
            fetchDashboardData(false);
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(false);
      }
    }, 12000);

    return () => {
      if (broadcastChan) broadcastChan.close();
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(postgresSubChannel);
      clearInterval(pollInterval);
    };
  }, [fetchDashboardData]);

  const handleReviewEvent = (event: any) => {
    if (event.type === 'AUDITION_REVIEWED') {
      if (event.action === 'APPROVE') {
        toast.success(
          'Audition approved! Production guideline: Master page-turning sound quality, crisp paper acoustics, and steady overhead framing.',
          'Audition Approved 🎉'
        );
        playNotificationChime('success');
        sendBrowserPushNotification('Audition Approved! 🎉', {
          body: 'Your 30-second audition was approved! Guideline: Master page-turning sound quality, crisp paper acoustics, and steady overhead framing.',
        });
      } else {
        toast.warning(
          event.notes || 'Your audition sample requires updates before full production is unlocked.',
          event.action === 'REVISION' ? 'Audition Revision Requested' : 'Audition Rejected'
        );
        playNotificationChime('alert');
        sendBrowserPushNotification('Audition Review Update', {
          body: event.notes || 'Your audition sample was reviewed by an administrator.',
        });
      }
      return;
    }

    const title = event.title || 'Video Submission';
    if (event.action === 'APPROVE') {
      toast.success(
        `"${title}" has been approved and credited toward your payout threshold!`,
        'Submission Approved 🎉'
      );
      playNotificationChime('success');
      sendBrowserPushNotification('Submission Approved! 🎉', {
        body: `"${title}" has been approved by Admin.`,
      });
    } else if (event.action === 'REJECT') {
      toast.error(
        `"${title}" was rejected: ${event.feedback || 'Please review guidelines.'}`,
        'Submission Rejected'
      );
      playNotificationChime('alert');
      sendBrowserPushNotification('Submission Rejected', {
        body: `"${title}" was rejected: ${event.feedback || ''}`,
      });
    } else if (event.action === 'REQUEST_REVISION') {
      toast.warning(
        `Changes requested on "${title}": ${event.feedback || 'See notes.'}`,
        'Revision Requested'
      );
      playNotificationChime('alert');
      sendBrowserPushNotification('Revision Requested', {
        body: `Changes requested on "${title}": ${event.feedback || ''}`,
      });
    }
  };

  const stats = data?.stats;
  const profile = data?.profile;
  const displayName = profile?.display_name || 'Creator';
  const firstName = displayName.trim().split(/\s+/)[0] || 'Creator';
  const minRequired = stats?.minRequired || 8;
  const rate = profile?.rate_per_video_usd || 10;
  const targetPayout = minRequired * rate;
  const eligibleCount = stats?.eligibleCount || 0;
  const progressPercent = Math.min(100, Math.round((eligibleCount / minRequired) * 100));
  const remainingVideos = Math.max(0, minRequired - eligibleCount);
  const totalApproved = stats?.approvedCount ?? (profile?.sample_status === 'APPROVED' ? 1 : 0);
  const sampleApprovedCount = stats?.approvedSamplesCount ?? (profile?.sample_status === 'APPROVED' ? 1 : 0);
  const fullApprovedCount = stats?.approvedFullVideosCount ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const availableBalance = stats?.availablePayoutBalance ?? 0;
  const reservedBalance = stats?.reservedBalance ?? 0;
  const totalPaid = stats?.totalPaid ?? 0;
  const canRequestPayout = stats?.canRequestPayout ?? false;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:46';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sampleSubmission = submissions.find((s) => s.is_sample) || (profile?.sample_status === 'APPROVED' ? {
    id: profile?.sample_submission_id || 'sample-audition',
    title: `${displayName} — 30s Audition Sample`,
    category: 'PAGE_TURNING',
    duration_seconds: 46,
    status: 'APPROVED',
    is_sample: true,
    created_at: profile?.created_at || '2026-09-07T21:05:00.000Z',
    agreed_rate_usd: 0,
    payout_status: 'NON_BILLABLE',
  } : null);

  const regularSubmissions = submissions.filter((s) => !s.is_sample);
  const displayList = sampleSubmission
    ? [sampleSubmission, ...regularSubmissions]
    : submissions;

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-10 space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              YOUR CREATOR DASHBOARD
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5 flex-wrap">
              <span>Welcome back, <span className="italic font-serif text-[#8E2848] dark:text-pink-400">{firstName}.</span></span>
              {profile?.sample_status === 'APPROVED' && <VerifiedBadge size={20} className="mt-1" />}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              Your next chapter starts with a recording.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/creator/settings"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FDF2F4] text-[#7B1E4B] hover:bg-[#F8E2EC] text-xs font-bold transition-colors border-0"
            >
              Edit profile
            </Link>
            <Link
              href="/creator/upload"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#7B1E4B] hover:bg-[#63183C] text-white text-xs font-bold flex items-center gap-2 transition-colors border-0 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload video</span>
            </Link>
          </div>
        </div>

        {/* Audition Approved Status Banner */}
        <div className="bg-[#f8e2ec] dark:bg-[#281420] border border-[#f0cddc] dark:border-[#421d31] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-[#8E2848] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#9D174D] dark:text-pink-300 uppercase">
                AUDITION APPROVED · YOU&apos;RE READY
              </div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                Time to create your first batch.
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                Wear long press-on nails and flip from the edges of the pages with your 2 middle fingers like the sample.
              </p>
            </div>
          </div>
          <Link
            href="/guidelines"
            className="text-xs font-semibold text-[#8E2848] dark:text-pink-300 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Review batch guidelines</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Main 2-Card Row: First Payout & Available Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Card: YOUR FIRST PAYOUT (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
                  YOUR FIRST PAYOUT
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold text-[#7B1E4B] bg-[#FDF2F4] border-0">
                  {minRequired} videos = ${targetPayout}
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-neutral-900 dark:text-white font-normal leading-snug">
                A little closer with <br />
                every <span className="italic font-serif text-[#8E2848] dark:text-pink-400">approved video.</span>
              </h2>
            </div>

            {/* Segmented Progress */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                <span>{eligibleCount} of {minRequired} full videos approved</span>
                <span className="text-neutral-500 dark:text-neutral-400">{progressPercent}%</span>
              </div>

              {/* Distinct Bar Segments */}
              <div
                className="grid gap-1.5 w-full"
                style={{ gridTemplateColumns: `repeat(${minRequired}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: minRequired }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx < eligibleCount
                        ? 'bg-[#8E2848] dark:bg-pink-400'
                        : 'bg-neutral-200/90 dark:bg-neutral-800'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                <span>${(eligibleCount * rate).toFixed(0)} earned</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">${targetPayout} minimum payout</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{remainingVideos} more approved full videos to unlock your payout.</span>
              </div>
              <Link href="/creator/upload" className="hover:text-black dark:hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4 text-neutral-500" />
              </Link>
            </div>
          </div>

          {/* Right Card: AVAILABLE BALANCE (5 cols) */}
          <div className="lg:col-span-5 bg-[#18151A] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 border border-white/15">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  AVAILABLE BALANCE
                </span>
                <Wallet className="w-4 h-4 text-white" />
              </div>

              <div>
                <div className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-white">
                  ${availableBalance.toFixed(2)}
                </div>
                <div className="text-xs text-white/90 mt-1.5 font-normal">
                  {eligibleCount} approved, unpaid full videos
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t border-white/15 pt-4 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                  YOUR LOCKED-IN RATE
                </span>
                <span className="font-bold text-white">
                  $10 <span className="text-white/90 font-normal">/ approved video</span>
                </span>
              </div>

              <div>
                {canRequestPayout ? (
                  <Link
                    href="/creator/payouts"
                    className="w-full py-3 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    Request payout →
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded-full bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-white/20"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span className="text-white font-semibold">Request payout</span>
                  </button>
                )}
                <div className="text-[11px] text-white/80 text-center mt-2 font-normal">
                  Unlocks at {minRequired} approved, unpaid videos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Four Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:divide-neutral-800 overflow-hidden">
          
          {/* Approved Videos */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Approved videos</span>
              <CheckCircle2 className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              {totalApproved}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {fullApprovedCount} full videos · {sampleApprovedCount} audition sample
            </div>
          </div>

          {/* Awaiting Review */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Awaiting review</span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              {pendingCount}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {pendingCount === 0 ? 'No videos waiting for review' : `${pendingCount} videos waiting for review`}
            </div>
          </div>

          {/* Reserved in Payout */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Reserved in payout</span>
              <Lock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              ${reservedBalance.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Held while a payout is processing
            </div>
          </div>

          {/* Total Disbursed */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Total disbursed</span>
              <Wallet className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              ${totalPaid.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Confirmed payments to date
            </div>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Recent Submissions (8 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white flex items-center">
                Recent submissions
                <sup className="text-[10px] font-mono ml-1 text-neutral-400">
                  {Math.max(1, displayList.length).toString().padStart(2, '0')}
                </sup>
              </h2>
              <Link
                href="/creator/videos"
                className="text-xs font-semibold text-[#8E2848] dark:text-pink-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Submissions List */}
            <div className="space-y-3">
              {displayList.slice(0, 5).map((sub, idx) => (
                <div
                  key={sub.id || idx}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      {/* Video Thumbnail Box */}
                      <VideoThumbnail
                        videoId={sub.id}
                        durationSeconds={sub.duration_seconds}
                        className="w-16 h-16 sm:w-20 sm:h-20"
                        altTitle={sub.title}
                      />

                      {/* Video Details */}
                      <div className="space-y-1">
                        <StatusBadge status={sub.status} size="sm" />
                        <h3 className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white line-clamp-1">
                          {sub.title}
                        </h3>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {sub.category === 'PAGE_TURNING' || sub.category === 'THIGH_FLAPPING_AND_GUM_CHEWING'
                            ? 'Page-Turning ASMR'
                            : (sub.category || 'Page-Turning ASMR')}
                        </div>
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {formatDate(sub.created_at)}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/creator/videos?highlight=${sub.id}`}
                      className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                      title="View submission details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>
                      {sub.is_sample ? 'Audition sample · Non-billable' : `$${(sub.agreed_rate_usd || 10).toFixed(2)} · ${sub.payout_status || 'UNPAID'}`}
                    </span>
                    <Link
                      href={`/creator/videos?highlight=${sub.id}`}
                      className="font-medium text-neutral-700 dark:text-neutral-300 hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))}

              {/* Next Video Prompt Slot (02) */}
              <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-serif text-2xl sm:text-3xl text-pink-300/80 dark:text-pink-400/60 font-normal shrink-0">
                    {(displayList.length + 1).toString().padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white">
                      Your first full video is next.
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      At least 3 minutes. Original sound. Your own pace.
                    </div>
                  </div>
                </div>

                <Link
                  href="/creator/upload"
                  className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                  title="Upload video"
                >
                  <Upload className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Feedback & Essentials (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Editorial Feedback Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                  Editorial feedback
                </h2>
                <Link
                  href="/creator/notifications"
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-5 sm:p-6">
                {notifications.length === 0 ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#8E2848] dark:text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                        You&apos;re all caught up.
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        No editorial notes at this time.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((n) => (
                      <div key={n.id} className="text-xs space-y-1">
                        <div className="font-bold text-neutral-900 dark:text-white">{n.title}</div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Before You Press Record: The Essentials Card */}
            <div className="bg-[#FDF2F4] dark:bg-[#22131A] border border-[#FCE3E8] dark:border-[#3B1E2C] rounded-2xl p-6 sm:p-7 space-y-5">
              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
                  BEFORE YOU PRESS RECORD
                </div>
                <h3 className="font-serif text-2xl font-normal text-neutral-900 dark:text-white mt-1">
                  The essentials.
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-200 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>At least 3 minutes per full video</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>Clear audio, no background noise</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>Stable, faceless framing</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>Long press-on nails worn</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>Flip from page edges with 2 middle fingers like sample</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                  <span>Safe, painless rhythmic pacing</span>
                </li>
              </ul>

              <div className="pt-3 border-t border-[#F8D2DB] dark:border-[#38202F]">
                <Link
                  href="/guidelines"
                  className="text-xs font-semibold text-[#8E2848] dark:text-pink-300 hover:underline flex items-center justify-between"
                >
                  <span>Full recording guidelines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Ticker Bar */}
        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500 tracking-wider py-8">
          ${rate} flat rate &nbsp;&middot;&nbsp; {minRequired}-video minimum &nbsp;&middot;&nbsp;{' '}
          <span className="italic text-neutral-600 dark:text-neutral-400">
            Your work. Your earnings.
          </span>
        </div>
      </div>
    </div>
  );
}
