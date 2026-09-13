'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  X,
  UploadCloud,
  History,
  Download,
  Zap,
  ArrowRight,
} from 'lucide-react';
import VideoThumbnail from '@/components/VideoThumbnail';
import { Submission, SubmissionVersion } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { compressVideoFile, formatBytes } from '@/lib/videoCompression';
import { downloadNormalVideo, downloadCompressedVideo } from '@/lib/videoDownload';
import {
  playNotificationChime,
  sendBrowserPushNotification,
} from '@/lib/notifications';

// â”€â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({
  label,
  count,
  subtitle,
  icon,
}: {
  label: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const formatted = count.toString().padStart(2, '0');
  return (
    <div className="p-5 sm:p-6 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-400">{icon}</span>
      </div>
      <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
        {formatted}
      </div>
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {subtitle}
      </div>
    </div>
  );
}

// â”€â”€â”€ Status Pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatusPill({ status }: { status: string }) {
  if (status === 'APPROVED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF2F4] dark:bg-[#2E1823] text-[#8E2848] dark:text-pink-300 border border-[#FAD8E2] dark:border-[#421D30]">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </span>
    );
  if (status === 'REVISION_REQUESTED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-3 h-3" />
        Needs revision
      </span>
    );
  if (status === 'REJECTED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
        <X className="w-3 h-3" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
      <Clock className="w-3 h-3" />
      Awaiting review
    </span>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SubmissionsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'APPROVED' | 'SUBMITTED' | 'REVISION_REQUESTED'
  >('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail / Revision drawer
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const selectedSubRef = useRef<Submission | null>(null);
  const [versions, setVersions] = useState<SubmissionVersion[]>([]);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [revisionCompressing, setRevisionCompressing] = useState(false);
  const [revisionCompProgress, setRevisionCompProgress] = useState(0);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingCompressId, setDownloadingCompressId] = useState<string | null>(null);

  useEffect(() => {
    selectedSubRef.current = selectedSub;
  }, [selectedSub]);

  // â”€â”€ Fetch helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAll = useCallback(
    (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      Promise.all([
        fetch('/api/creator/stats', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/submissions', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()),
      ])
        .then(([stats, subsData, meData]) => {
          if (stats?.stats) setStatsData(stats.stats);
          if (stats?.profile) setUser((prev: any) => prev ?? stats.profile);
          if (meData?.user) setUser((prev: any) => prev ?? meData.user);
          const subs: Submission[] = subsData.submissions || [];
          setSubmissions(subs);
          if (selectedSubRef.current) {
            const fresh = subs.find((s) => s.id === selectedSubRef.current!.id);
            if (fresh) setSelectedSub(fresh);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (showSpinner) setLoading(false);
        });
    },
    []
  );

  const handleReviewEvent = useCallback(
    (event: any) => {
      if (event.type === 'AUDITION_REVIEWED') {
        if (event.action === 'APPROVE') {
          toast.success(
            'Audition approved! Production guideline: Record 8 full page-turning ASMR videos with clear acoustics and consistent table-level framing.',
            'Audition Approved'
          );
          playNotificationChime('success');
        }
        return;
      }
      const title = event.title || 'Video Submission';
      if (event.action === 'APPROVE') {
        toast.success(`"${title}" has been approved!`, 'Submission Approved ðŸŽ‰');
        playNotificationChime('success');
        sendBrowserPushNotification('Submission Approved! ðŸŽ‰', {
          body: `"${title}" has been approved by Admin.`,
        });
      } else if (event.action === 'REJECT') {
        toast.error(
          `"${title}" was rejected: ${event.feedback || 'Please check guidelines.'}`,
          'Submission Rejected'
        );
        playNotificationChime('alert');
        sendBrowserPushNotification('Submission Rejected', {
          body: `"${title}" was rejected: ${event.feedback || ''}`,
        });
      } else if (event.action === 'REQUEST_REVISION') {
        toast.warning(
          `Revision requested for "${title}": ${event.feedback || 'See notes.'}`,
          'Revision Requested'
        );
        playNotificationChime('alert');
        sendBrowserPushNotification('Revision Requested', {
          body: `Changes requested on "${title}": ${event.feedback || ''}`,
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchAll(true);

    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        handleReviewEvent(msg);
        fetchAll(false);
      };
    } catch {}

    const realtimeChan = supabase
      .channel('submission-updates-videos-v2')
      .on('broadcast', { event: 'submission_reviewed' }, (payload: any) => {
        const data = payload.payload;
        if (!data) return;
        handleReviewEvent(data);
        fetchAll(false);
      })
      .subscribe();

    const postgresChan = supabase
      .channel('public:submissions-videos-page-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          fetchAll(false);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAll(false);
    }, 12000);

    return () => {
      if (broadcastChan) broadcastChan.close();
      supabase.removeChannel(realtimeChan);
      supabase.removeChannel(postgresChan);
      clearInterval(pollInterval);
    };
  }, [fetchAll, handleReviewEvent]);

  // â”€â”€ Open detail drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openDetails = async (sub: Submission) => {
    setSelectedSub(sub);
    setRevisionFile(null);
    setRevisionNotes('');
    setRevisionError('');
    try {
      const res = await fetch(`/api/submissions/${sub.id}`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (e) {
      console.error(e);
    }
  };

  // â”€â”€ Revision submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !revisionFile) return;
    setRevisionLoading(true);
    setRevisionError('');
    try {
      let fileToUpload = revisionFile;
      if (revisionFile.size > 15 * 1024 * 1024) {
        setRevisionCompressing(true);
        setRevisionCompProgress(5);
        try {
          const comp = await compressVideoFile(revisionFile, {
            maxDimension: 1280,
            videoBitrate: 2_000_000,
            onProgress: (p: any) => setRevisionCompProgress(p.percent),
          });
          fileToUpload = comp.file;
          toast.success(
            `Revision compressed: ${formatBytes(comp.originalSize)} â†’ ${formatBytes(comp.compressedSize)} (${comp.savedPercent}% saved)!`
          );
        } catch (cErr) {
          console.warn('Revision compression skipped:', cErr);
        } finally {
          setRevisionCompressing(false);
        }
      }
      const formData = new FormData();
      formData.append('file', fileToUpload);
      if (revisionNotes.trim()) formData.append('notes', revisionNotes.trim());
      const res = await fetch(`/api/submissions/${selectedSub.id}/revision`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revision upload failed');
      toast.success(`Version ${data.submission.version_number} submitted for review!`);
      setSelectedSub(null);
      setRevisionFile(null);
      setRevisionNotes('');
      fetchAll();
    } catch (err: any) {
      setRevisionError(err.message || 'Failed to submit revision');
    } finally {
      setRevisionLoading(false);
      setRevisionCompressing(false);
    }
  };

  // â”€â”€ Download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDownload = async (sub: Submission, compress = true) => {
    if (downloadingId || downloadingCompressId) return;
    if (compress) {
      setDownloadingCompressId(sub.id);
      toast.info(`Preparing to compress "${sub.title}" for device download...`);
      try {
        await downloadCompressedVideo(
          {
            id: sub.id,
            title: sub.title,
            creator_name: sub.creator_name,
            file_url: sub.file_url,
            file_name: sub.file_name,
          },
          {
            onSuccess: (s) =>
              toast.success(
                `Compressed! Saved ${s.savedPercent}% (${formatBytes(s.originalSize)} â†’ ${formatBytes(s.compressedSize)})`
              ),
            onError: (err) => toast.error(err.message || 'Failed to compress.'),
          }
        );
      } catch (err: any) {
        console.error(err);
      } finally {
        setDownloadingCompressId(null);
      }
    } else {
      setDownloadingId(sub.id);
      toast.info(`Saving "${sub.title}" directly to device storage...`);
      try {
        await downloadNormalVideo(
          {
            id: sub.id,
            title: sub.title,
            creator_name: sub.creator_name,
            file_url: sub.file_url,
            file_name: sub.file_name,
          },
          {
            onSuccess: (fn) => toast.success(`"${fn}" downloading to device!`),
            onError: (err) => toast.error(err.message || 'Failed to download.'),
          }
        );
      } catch (err: any) {
        console.error(err);
      } finally {
        setDownloadingId(null);
      }
    }
  };

  // â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalCount = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const awaitingCount = submissions.filter((s) => s.status === 'SUBMITTED').length;
  const revisionCount = submissions.filter(
    (s) => s.status === 'REVISION_REQUESTED'
  ).length;

  const sampleSub = submissions.find((s) => s.is_sample);
  const sampleApproved = sampleSub?.status === 'APPROVED';
  const fullApprovedCount = submissions.filter(
    (s) => !s.is_sample && s.status === 'APPROVED'
  ).length;
  const minRequired = statsData?.minRequired || 8;
  const availableBalance = statsData?.availablePayoutBalance ?? 0;

  const tabCounts = {
    ALL: totalCount,
    APPROVED: approvedCount,
    SUBMITTED: awaitingCount,
    REVISION_REQUESTED: revisionCount,
  };

  const filtered = submissions.filter((s) => {
    if (activeTab !== 'ALL' && s.status !== activeTab) return false;
    if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatCategoryShort = (cat: string) => {
    if (cat === 'PAGE_TURNING') return 'Page-Turning';
    if (cat === 'THIGH_FLAPPING_AND_GUM_CHEWING')
      return 'Thigh-Flapping & Gum-Chewing';
    if (cat === 'THIGH_FLAPPING') return 'Thigh-Flapping';
    return cat || 'Page-Turning';
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#0E0B10] text-neutral-900 dark:text-neutral-100 transition-colors">
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              YOUR RECORDING LIBRARY
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-normal tracking-tight text-neutral-900 dark:text-white leading-tight">
              Your work.{' '}
              <span className="italic text-[#8E2848] dark:text-pink-400">
                Every step of the way.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Keep track of your recordings, reviews, and the earnings they bring.
            </p>
          </div>

          <Link
            href="/creator/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18151A] hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-100 text-white text-xs font-semibold transition-colors self-start sm:self-auto shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload video
          </Link>
        </div>

        {/* â”€â”€ Stat Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:divide-neutral-800 overflow-hidden">
          <StatCard
            label="Total submissions"
            count={totalCount}
            subtitle={
              totalCount === 1
                ? 'Your creative journey so far'
                : `${totalCount} submissions total`
            }
            icon={<Film className="w-4 h-4" />}
          />
          <StatCard
            label="Approved"
            count={approvedCount}
            subtitle={
              approvedCount === 0
                ? 'No approved videos yet'
                : `${
                    approvedCount === 1 ? '1 audition' : `${approvedCount} videos`
                  } Â· ${fullApprovedCount} full videos`
            }
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatCard
            label="Awaiting review"
            count={awaitingCount}
            subtitle={
              awaitingCount === 0
                ? 'No recordings in the queue'
                : `${awaitingCount} pending review`
            }
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            label="Needs revision"
            count={revisionCount}
            subtitle={
              revisionCount === 0
                ? "You're all caught up"
                : `${revisionCount} need attention`
            }
            icon={<AlertCircle className="w-4 h-4" />}
          />
        </div>

        {/* â”€â”€ Submissions Table Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
          {/* Section header */}
          <div className="px-6 pt-6 pb-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-400 uppercase mb-1">
                MADE BY YOU
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white flex items-center gap-1">
                Your submissions
                <sup className="text-[10px] font-mono ml-0.5 text-neutral-400 dark:text-neutral-500 not-italic">
                  {totalCount.toString().padStart(2, '0')}
                </sup>
              </h2>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:block pb-1">
              Original sounds. A growing collection.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="px-6 mt-4 flex items-center border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            {(
              [
                { key: 'ALL', label: 'All videos' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'SUBMITTED', label: 'Awaiting review' },
                { key: 'REVISION_REQUESTED', label: 'Needs revision' },
              ] as const
            ).map(({ key, label }) => {
              const isActive = activeTab === key;
              const cnt = tabCounts[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-0 pb-2.5 pt-1 mr-6 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#8E2848] text-neutral-900 dark:text-white'
                      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  {label}
                  <span
                    className={`text-[10px] font-mono ${
                      isActive
                        ? 'text-neutral-600 dark:text-neutral-300'
                        : 'text-neutral-400'
                    }`}
                  >
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Filter row */}
          <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search your recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Video type
              </span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="ALL">All types</option>
                <option value="PAGE_TURNING">Page-Turning</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="px-6 pb-10 text-center">
              <div className="inline-block w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-2 mt-4" />
              <p className="text-xs text-neutral-500">
                Loading your submissions...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 pb-10 pt-4 text-center space-y-2">
              <Film className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {activeTab === 'ALL'
                  ? 'No submissions yet. Upload your first recording!'
                  : 'No recordings match this filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Table column headers */}
              <div className="px-6 grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 py-2.5">
                <span>Recording</span>
                <span>Submitted</span>
                <span>Status</span>
                <span>Earnings</span>
                <span />
              </div>

              {/* Table rows */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((sub) => {
                  const minutes = Math.floor(sub.duration_seconds / 60);
                  const secs = Math.round(sub.duration_seconds % 60);
                  const durationLabel = `${minutes}:${secs
                    .toString()
                    .padStart(2, '0')}`;
                  const earnings = sub.is_sample
                    ? '$0.00'
                    : `$${(sub.agreed_rate_usd || 50).toFixed(2)}`;
                  const earningsNote = sub.is_sample
                    ? 'Non-billable audition'
                    : sub.payout_status || 'UNPAID';

                  return (
                    <div
                      key={sub.id}
                      className="px-6 py-4 grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      {/* Recording col */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => openDetails(sub)}
                          className="shrink-0 focus:outline-none"
                        >
                          <VideoThumbnail
                            videoId={sub.id}
                            videoUrl={sub.file_url}
                            durationSeconds={sub.duration_seconds}
                            className="w-14 h-14 rounded-lg"
                            altTitle={sub.title}
                            isSample={sub.is_sample}
                          />
                        </button>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-medium">
                            {formatCategoryShort(sub.category)}
                          </div>
                          <button
                            type="button"
                            onClick={() => openDetails(sub)}
                            className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1 text-left hover:text-[#8E2848] dark:hover:text-pink-400 transition-colors"
                          >
                            {sub.title}
                          </button>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                            {sub.is_sample && (
                              <span className="font-medium text-neutral-500">
                                Audition sample
                              </span>
                            )}
                            <span>Â· {durationLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Submitted col */}
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-0.5">
                        {sub.created_at ? (
                          <>
                            <div className="font-medium">
                              {new Date(sub.created_at).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {new Date(sub.created_at).toLocaleTimeString(
                                'en-US',
                                {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }
                              )}
                            </div>
                          </>
                        ) : (
                          <span>â€”</span>
                        )}
                      </div>

                      {/* Status col */}
                      <div>
                        <StatusPill status={sub.status} />
                      </div>

                      {/* Earnings col */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {earnings}
                        </div>
                        <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          {earningsNote}
                        </div>
                      </div>

                      {/* Action col */}
                      <button
                        type="button"
                        onClick={() => openDetails(sub)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#8E2848] dark:text-pink-400 hover:underline whitespace-nowrap"
                      >
                        Details
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Table footer */}
              <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                <span>
                  Showing {filtered.length} of {totalCount} submission
                  {totalCount !== 1 ? 's' : ''}
                </span>
                <span className="italic hidden sm:inline">
                  Audition samples don&apos;t count toward payouts.
                </span>
              </div>
            </>
          )}
        </div>

        {/* â”€â”€ Bottom 2-Col Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Next step CTA */}
          <div className="bg-[#FDF2F4] dark:bg-[#1E1118] border border-[#F8D2DB] dark:border-[#3B1E2C] rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <span className="font-serif text-4xl sm:text-5xl text-[#EDAFC6] dark:text-[#6B2040] font-normal leading-none shrink-0">
                  {(totalCount + 1).toString().padStart(2, '0')}
                </span>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
                    {sampleApproved ? 'AUDITION APPROVED' : 'YOUR JOURNEY'}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white mt-0.5 leading-snug">
                    {sampleApproved
                      ? 'Your first full video is next.'
                      : 'Submit your audition sample.'}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {sampleApproved ? (
                  <>
                    Your sample is approved. Record at{' '}
                    <span className="font-semibold text-[#8E2848] dark:text-pink-400">
                      least 3 minutes
                    </span>{' '}
                    to start building toward your first payout.
                  </>
                ) : (
                  'Upload a 30-second audition sample to unlock full production and earnings.'
                )}
              </p>
            </div>
            <Link
              href="/creator/upload"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E2848] dark:text-pink-400 hover:underline"
            >
              Add your next recording
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right: Payout card */}
          <div className="bg-[#18151A] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-5 border border-white/10">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                YOUR NEXT PAYOUT
              </span>
              <ArrowRight className="w-4 h-4 text-white/30" />
            </div>

            <div>
              <div className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-white">
                ${availableBalance.toFixed(0)}{' '}
                <span className="text-2xl sm:text-3xl text-white/40 font-normal">
                  of $400
                </span>
              </div>
              <div className="text-xs text-white/50 mt-2">
                {fullApprovedCount} of {minRequired} approved, unpaid full videos
              </div>
            </div>

            {/* 8-segment progress bar */}
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: minRequired }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    idx < fullApprovedCount ? 'bg-[#E8799B]' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Design preview notice */}
        <p className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center">
          Design preview Â· Showing the submission from your dashboard. Live review updates are connected.
        </p>

        {/* Ticker */}
        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500 tracking-wider py-2">
          $50 flat rate.&nbsp;Â·&nbsp; 8-video minimum.&nbsp;Â·&nbsp;{' '}
          <span className="italic text-neutral-600 dark:text-neutral-400">
            Your work. Your earnings.
          </span>
        </div>
      </main>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="w-full bg-[#130E14] text-white pt-12 pb-8">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-2">
              <Link href="/">
                <span className="font-serif text-xl font-medium text-[#FCD4E5] tracking-tight">
                  The Pink Room
                </span>
              </Link>
              <p className="text-xs text-white/60 max-w-xs">
                An independent home for original, faceless ASMR creators.
              </p>
            </div>

            {/* Platform */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                PLATFORM
              </h4>
              <ul className="space-y-2 text-xs text-white/70">
                <li>
                  <Link
                    href="/guidelines"
                    className="hover:text-white transition-colors"
                  >
                    Recording guidelines
                  </Link>
                </li>
                <li>
                  <Link
                    href="/earnings-and-payments"
                    className="hover:text-white transition-colors"
                  >
                    Earnings &amp; payments
                  </Link>
                </li>
              </ul>
            </div>

            {/* Creator Support */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                CREATOR SUPPORT
              </h4>
              <ul className="space-y-2 text-xs text-white/70">
                <li>
                  <a
                    href="mailto:notifications@pinkroom.online"
                    className="hover:text-white transition-colors"
                  >
                    notifications@pinkroom.online
                  </a>
                </li>
                <li>
                  <Link
                    href="/"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    Visit The Pink Room â†—
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>
              Â© {new Date().getFullYear()} The Pink Room. All rights reserved.
            </span>
            <span>Ethical. Non-explicit. Creator-owned.</span>
          </div>
        </div>
      </footer>

      {/* â”€â”€ Detail / Revision Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#fff9fb] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 border border-[#f2e3e8] text-neutral-900 shadow-2xl">
            {/* Drawer Header */}
            <div className="border-b border-neutral-200 pb-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <StatusPill status={selectedSub.status} />
                <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 break-words mt-1">
                  {selectedSub.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedSub, true)}
                  disabled={
                    downloadingId === selectedSub.id ||
                    downloadingCompressId === selectedSub.id
                  }
                  title="Download Compressed MP4"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3 h-3 text-[#9D174D] shrink-0" />
                  <Download
                    className={`w-3 h-3 shrink-0 ${
                      downloadingCompressId === selectedSub.id
                        ? 'animate-bounce'
                        : ''
                    }`}
                  />
                  <span>
                    {downloadingCompressId === selectedSub.id
                      ? 'Compressing...'
                      : 'MP4'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(selectedSub, false)}
                  disabled={
                    downloadingId === selectedSub.id ||
                    downloadingCompressId === selectedSub.id
                  }
                  title="Download Original"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors disabled:opacity-50"
                >
                  <Download
                    className={`w-3 h-3 shrink-0 ${
                      downloadingId === selectedSub.id ? 'animate-bounce' : ''
                    }`}
                  />
                  <span>
                    {downloadingId === selectedSub.id
                      ? 'Downloading...'
                      : 'Original'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Meta grid */}
            <div className="bg-[#f8e2ec] p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div>
                <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">
                  Agreed Rate
                </span>
                <div className="font-serif text-base font-normal text-neutral-900 mt-0.5">
                  {selectedSub.is_sample ? (
                    <span className="text-xs text-[#8E2848] font-semibold">
                      Audition Gate
                    </span>
                  ) : (
                    `$${selectedSub.agreed_rate_usd.toFixed(2)}`
                  )}
                </div>
              </div>
              <div>
                <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">
                  Duration
                </span>
                <div className="font-serif text-base font-normal text-neutral-900 mt-0.5">
                  {Math.round(selectedSub.duration_seconds)}s
                </div>
              </div>
              <div>
                <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">
                  Payout State
                </span>
                <div className="font-semibold text-neutral-900 uppercase mt-0.5 text-[11px]">
                  {selectedSub.is_sample ? (
                    <span className="text-neutral-600">Gate ($0)</span>
                  ) : (
                    selectedSub.payout_status
                  )}
                </div>
              </div>
              <div>
                <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">
                  Version
                </span>
                <div className="font-serif text-base font-normal text-neutral-900 mt-0.5">
                  v{selectedSub.version_number}
                </div>
              </div>
            </div>

            {/* Revision feedback callout */}
            {selectedSub.revision_notes && (
              <div className="p-3 bg-[#FDF2F4] border border-[#FCE3E8] rounded-xl text-xs space-y-1">
                <div className="font-bold text-[#8E2848] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Admin Revision Instructions:
                </div>
                <p className="leading-relaxed">{selectedSub.revision_notes}</p>
              </div>
            )}

            {selectedSub.rejection_reason && (
              <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-neutral-800">
                  Rejection Reason:
                </div>
                <p className="leading-relaxed">
                  {selectedSub.rejection_reason}
                </p>
              </div>
            )}

            {/* Revision Upload Section */}
            {selectedSub.status === 'REVISION_REQUESTED' && (
              <div className="bg-[#f8e2ec] p-5 rounded-2xl space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4 text-[#8E2848]" />
                    Submit Version {selectedSub.version_number + 1} Revision
                  </h4>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Re-upload your video addressing the admin&apos;s notes.
                    Revisions preserve submission history.
                  </p>
                </div>

                {revisionError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                    {revisionError}
                  </div>
                )}

                <form onSubmit={handleRevisionSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Choose Replacement MP4/MOV Video (3+ Minutes)
                    </label>
                    <input
                      type="file"
                      required
                      accept="video/mp4,video/quicktime,.mp4,.mov"
                      onChange={(e) =>
                        setRevisionFile(e.target.files?.[0] || null)
                      }
                      className="text-xs w-full text-neutral-700 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#18151A] file:text-white hover:file:opacity-90"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Notes on Changes Made
                    </label>
                    <input
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="e.g. Re-exported with background noise filtered..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-400 bg-white text-neutral-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={revisionLoading || !revisionFile}
                    className="px-5 py-2.5 rounded-full bg-[#18151A] hover:bg-black text-white font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    {revisionLoading
                      ? 'Processing Revision...'
                      : 'Submit Revision'}
                  </button>
                </form>
              </div>
            )}

            {/* Version History */}
            <div className="space-y-3">
              <h4 className="font-serif text-lg font-normal text-neutral-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-neutral-400" />
                Version History
              </h4>
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/90 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900">
                        Version {v.version_number}
                        {v.version_number === selectedSub.version_number && (
                          <span className="text-[10px] font-semibold text-[#8E2848] bg-pink-50 px-2 py-0.5 rounded-full ml-1 border border-pink-200/60">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-normal">
                        {Math.round(v.duration_seconds)}s Â· Uploaded{' '}
                        {new Date(v.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      {v.notes && (
                        <p className="text-neutral-600 mt-1 italic">
                          &quot;{v.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-xs text-neutral-400 italic">
                    No version history available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
