'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  CheckCircle2,
  XCircle,
  RotateCw,
  Clock,
  DollarSign,
  Play,
  X,
  AlertCircle,
  Eye,
  Check,
  Download,
  Zap,
  Radio,
  Calendar,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  History,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import AdminVideoPreview from '@/components/AdminVideoPreview';
import { Submission, SubmissionVersion } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { downloadNormalVideo, downloadCompressedVideo } from '@/lib/videoDownload';
import { formatBytes } from '@/lib/clientVideoCompression';

export default function AdminSubmissionsPage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const lastCountRef = useRef<number>(-1);

  // Filters (default to QUEUE so pending items appear in active review queue)
  const [filterStatus, setFilterStatus] = useState('QUEUE');
  const [filterType, setFilterType] = useState<'ALL' | 'AUDITIONS' | 'FULL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Review Item Modal & Revisions
  const [reviewingSub, setReviewingSub] = useState<Submission | null>(null);
  const [subVersions, setSubVersions] = useState<SubmissionVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Download States
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingCompressId, setDownloadingCompressId] = useState<string | null>(null);
  const [compressProgress, setCompressProgress] = useState<{ id: string; percent: number; stage: string } | null>(null);

  const handleDownload = async (sub: Submission, compress: boolean = true) => {
    if (downloadingId || downloadingCompressId) return;

    if (compress) {
      setDownloadingCompressId(sub.id);
      setCompressProgress({ id: sub.id, percent: 0, stage: 'initializing' });
      toast.info(`Preparing to compress "${sub.title}" for download...`);

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
            onProgress: (p) => {
              setCompressProgress({ id: sub.id, percent: p.percent, stage: p.stage });
            },
            onSuccess: (stats) => {
              toast.success(
                `Compressed video saved to your device! Reduced by ${stats.savedPercent}% (${formatBytes(stats.originalSize)} → ${formatBytes(stats.compressedSize)})`
              );
            },
            onError: (err) => {
              toast.error(err.message || 'Failed to compress and download video.');
            },
          }
        );
      } catch (err: any) {
        console.error('Download compressed error:', err);
      } finally {
        setDownloadingCompressId(null);
        setCompressProgress(null);
      }
    } else {
      setDownloadingId(sub.id);
      toast.info(`Saving normal video "${sub.title}" directly to device storage...`);

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
            onSuccess: (filename) => {
              toast.success(`Video "${filename}" downloading to device storage!`);
            },
            onError: (err) => {
              toast.error(err.message || 'Failed to download original video.');
            },
          }
        );
      } catch (err: any) {
        console.error('Download normal error:', err);
      } finally {
        setDownloadingId(null);
      }
    }
  };

  // Initial load — shows spinner
  const loadSubmissions = () => {
    setLoading(true);
    fetch('/api/submissions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const subs = data.submissions || [];
        setSubmissions(subs);
        lastCountRef.current = subs.length;
        setLoading(false);
        setLastSynced(new Date());
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  // Silent background refresh — no full loading spinner
  const silentRefresh = useCallback(() => {
    setSyncing(true);
    fetch('/api/submissions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const subs: Submission[] = data.submissions || [];
        setSubmissions(subs);
        const newCount = subs.filter((s) =>
          ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW'].includes(s.status)
        ).length;
        if (lastCountRef.current >= 0 && newCount > lastCountRef.current) {
          const diff = newCount - lastCountRef.current;
          toast.success(`${diff} new submission${diff > 1 ? 's' : ''} arrived in the queue.`);
        }
        lastCountRef.current = newCount;
        setLastSynced(new Date());
        setSyncing(false);
      })
      .catch(() => setSyncing(false));
  }, [toast]);

  // Real-time sync: BroadcastChannel + Supabase Realtime + polling fallback
  useEffect(() => {
    loadSubmissions();

    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = () => {
        silentRefresh();
      };
    } catch {}

    const postgresChan = supabase
      .channel('admin-pages-submissions-postgres')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          silentRefresh();
        }
      )
      .subscribe();

    const broadcastRealtimeChan = supabase
      .channel('admin-pages-submissions-broadcast')
      .on('broadcast', { event: 'submission_reviewed' }, () => {
        silentRefresh();
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    }, 8000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (broadcastChan) broadcastChan.close();
      supabase.removeChannel(postgresChan);
      supabase.removeChannel(broadcastRealtimeChan);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [silentRefresh]);

  const openReviewModal = (sub: Submission) => {
    setReviewingSub(sub);
    setSelectedVersionNum(sub.version_number || 1);
    setSubVersions([]);
    setActionType(null);
    setFeedbackText('');
    setActionError('');
    setLoadingVersions(true);
    fetch(`/api/submissions/${sub.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.versions && Array.isArray(data.versions)) {
          setSubVersions(data.versions);
        }
      })
      .catch((e) => console.warn('[Admin] Failed to load submission versions:', e))
      .finally(() => setLoadingVersions(false));
  };

  const handleReviewAction = async () => {
    if (!reviewingSub || !actionType) return;

    if ((actionType === 'REJECT' || actionType === 'REQUEST_REVISION') && !feedbackText.trim()) {
      setActionError('Feedback explanation notes are required.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      if (reviewingSub.is_sample) {
        const sampleAction =
          actionType === 'APPROVE' ? 'APPROVE' : actionType === 'REQUEST_REVISION' ? 'REVISION' : 'REJECT';
        const res = await fetch('/api/admin/samples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: reviewingSub.creator_id,
            action: sampleAction,
            notes: feedbackText.trim() || (sampleAction === 'APPROVE' ? 'Audition meets page-turning quality guidelines. Full production unlocked.' : ''),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit audition review');

        loadSubmissions();
        setReviewingSub(null);
        setActionType(null);
        setFeedbackText('');
        setActionLoading(false);
        toast.success(
          `Audition sample for "${reviewingSub.creator_name || 'Creator'}" marked as ${sampleAction}! Creator full production portal updated.`
        );

        try {
          const syncChan = new BroadcastChannel('asmr_submissions_sync');
          syncChan.postMessage({
            type: 'AUDITION_REVIEWED',
            action: sampleAction,
            submissionId: reviewingSub.id,
            creatorId: reviewingSub.creator_id,
            timestamp: Date.now(),
          });
          syncChan.close();
        } catch {}

        return;
      }

      const res = await fetch(`/api/submissions/${reviewingSub.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          feedback: feedbackText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      loadSubmissions();
      toast.success(
        `Submission "${reviewingSub.title}" marked as ${actionType.replace('_', ' ')}!`,
        'Review Completed'
      );
      setReviewingSub(null);
      setActionType(null);
      setFeedbackText('');

      try {
        const syncChan = new BroadcastChannel('asmr_submissions_sync');
        syncChan.postMessage({
          type: 'SUBMISSION_REVIEWED',
          action: actionType,
          submissionId: reviewingSub.id,
          creatorId: reviewingSub.creator_id,
          timestamp: Date.now(),
        });
        syncChan.close();
      } catch {}
    } catch (err: any) {
      setActionError(err.message || 'Error completing review');
      toast.error(err.message || 'Error completing review');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = submissions.filter((sub) => {
    const subStatusUpper = (sub.status || '').toString().toUpperCase();
    if (filterStatus === 'QUEUE') {
      if (!['SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW', 'PENDING'].includes(subStatusUpper)) return false;
    } else if (filterStatus === 'SAMPLES') {
      if (!sub.is_sample) return false;
    } else if (filterStatus !== 'ALL' && subStatusUpper !== filterStatus.toUpperCase()) {
      return false;
    }

    if (filterType === 'AUDITIONS' && !sub.is_sample) return false;
    if (filterType === 'FULL' && sub.is_sample) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sub.title.toLowerCase().includes(q) ||
        (sub.creator_name || '').toLowerCase().includes(q) ||
        (sub.creator_email || '').toLowerCase().includes(q) ||
        (sub.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group filtered submissions by creator in folder accordion structure
  const creatorGroups = React.useMemo(() => {
    const map = new Map<string, {
      creatorId: string;
      creatorName: string;
      creatorEmail: string;
      submissions: Submission[];
      pendingCount: number;
      approvedCount: number;
      auditionCount: number;
      latestDate: string;
    }>();

    for (const sub of filtered) {
      const key = sub.creator_id || sub.creator_email || sub.creator_name || 'unknown';
      let group = map.get(key);
      if (!group) {
        group = {
          creatorId: sub.creator_id || key,
          creatorName: sub.creator_name || 'Creator',
          creatorEmail: sub.creator_email || '',
          submissions: [],
          pendingCount: 0,
          approvedCount: 0,
          auditionCount: 0,
          latestDate: sub.created_at || '',
        };
        map.set(key, group);
      }
      group.submissions.push(sub);
      if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW'].includes(sub.status)) {
        group.pendingCount++;
      }
      if (sub.status === 'APPROVED') {
        group.approvedCount++;
      }
      if (sub.is_sample) {
        group.auditionCount++;
      }
      if (sub.created_at && (!group.latestDate || new Date(sub.created_at).getTime() > new Date(group.latestDate).getTime())) {
        group.latestDate = sub.created_at;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.pendingCount !== a.pendingCount) {
        return b.pendingCount - a.pendingCount;
      }
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });
  }, [filtered]);

  const [expandedCreators, setExpandedCreators] = useState<Record<string, boolean>>({});

  const toggleCreator = (creatorId: string) => {
    setExpandedCreators((prev) => {
      const isCurrentlyExpanded = prev[creatorId] !== undefined ? prev[creatorId] : true;
      return {
        ...prev,
        [creatorId]: !isCurrentlyExpanded,
      };
    });
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    creatorGroups.forEach((g) => {
      all[g.creatorId] = true;
    });
    setExpandedCreators(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    creatorGroups.forEach((g) => {
      all[g.creatorId] = false;
    });
    setExpandedCreators(all);
  };

  const pendingCount = submissions.filter((s) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW'].includes(s.status)).length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const revisionCount = submissions.filter((s) => s.status === 'REVISION_REQUESTED').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;
  const samplesCount = submissions.filter((s) => s.is_sample).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-black">
      {/* Header Bar */}
      <div className="border-b border-neutral-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-black">
            Submission Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
            Review page-turning recordings. Approval credits $50.00 USD toward the 8-video payout threshold.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Sync Status */}
          <div className="text-xs font-bold bg-white px-3 py-2 rounded-lg border border-neutral-300 text-black flex items-center gap-1.5" title={lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : 'Syncing...'}>
            <Radio className={`w-3 h-3 ${syncing ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Live'}</span>
          </div>
          <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-lg border border-neutral-300 text-black flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${pendingCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>Active Queue: {pendingCount}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSubmissions()}
            className="p-2 rounded-lg bg-white border border-neutral-300 text-black hover:bg-neutral-100 transition-colors"
            title="Force refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus('QUEUE')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'QUEUE'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>Active Review Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'QUEUE' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('APPROVED')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'APPROVED'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>Approved</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'APPROVED' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('REVISION_REQUESTED')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'REVISION_REQUESTED'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>Revisions Requested</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'REVISION_REQUESTED' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {revisionCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('REJECTED')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'REJECTED'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>Rejected</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'REJECTED' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {rejectedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('SAMPLES')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'SAMPLES'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>30s Auditions</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'SAMPLES' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {samplesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('ALL')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            filterStatus === 'ALL'
              ? 'bg-[#7B1E4B] text-white shadow-sm border-0'
              : 'bg-[#FDF2F4] text-[#7B1E4B] border border-[#F4D3DD] hover:bg-[#FCE7EB]'
          }`}
        >
          <span>All Submissions</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            filterStatus === 'ALL' ? 'bg-white text-[#7B1E4B]' : 'bg-[#7B1E4B] text-white'
          }`}>
            {submissions.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Type Filter */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-300 text-xs font-bold">
            {(['ALL', 'AUDITIONS', 'FULL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filterType === t
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {t === 'AUDITIONS' ? '30s Auditions' : t === 'FULL' ? 'Full Videos' : 'All Types'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search title, creator, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
            />
          </div>
        </div>
      </div>

      {/* Submissions by Creator Folders */}
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-black">
          <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Loading submissions for review...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-neutral-200 text-center space-y-3">
          <Film className="w-12 h-12 text-neutral-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-black">
            No submissions match the selected filter
          </h3>
          <p className="text-xs text-neutral-500 font-medium max-w-sm mx-auto">
            Try switching filter tabs or clearing your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="text-xs font-bold text-neutral-600">
              Showing {filtered.length} submission{filtered.length === 1 ? '' : 's'} across {creatorGroups.length} creator folder{creatorGroups.length === 1 ? '' : 's'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-bold border border-neutral-300 transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-bold border border-neutral-300 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Collapsible Creator Accordion Folders */}
          {creatorGroups.map((group) => {
            const isExpanded = expandedCreators[group.creatorId] ?? true;

            return (
              <div
                key={group.creatorId}
                className="border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-sm transition-all"
              >
                {/* Folder Header */}
                <button
                  type="button"
                  onClick={() => toggleCreator(group.creatorId)}
                  className={`w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left ${
                    isExpanded ? 'border-b border-neutral-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-md bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
                      {isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Folder className="w-5 h-5 text-neutral-200" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-lg font-bold text-black">{group.creatorName}</span>
                        {group.creatorEmail && (
                          <span className="text-xs text-neutral-600 font-medium">({group.creatorEmail})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1 flex-wrap">
                        <span className="font-bold text-black bg-white px-2 py-0.5 rounded border border-neutral-200">
                          {group.submissions.length} video{group.submissions.length === 1 ? '' : 's'}
                        </span>
                        {group.pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {group.pendingCount} Pending Review
                          </span>
                        )}
                        {group.approvedCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {group.approvedCount} Approved
                          </span>
                        )}
                        {group.auditionCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-black border border-neutral-300">
                            Audition Sample
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                    <span className="text-xs font-bold text-neutral-500">
                      {isExpanded ? 'Collapse Folder' : 'Open Folder'}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-black transition-transform duration-200 ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </button>

                {/* Submissions Inside Creator Folder — Rich Card Layout */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 space-y-3 bg-neutral-50/60">
                    {group.submissions.map((sub) => {
                      const minutes = Math.floor(sub.duration_seconds / 60);
                      const seconds = Math.round(sub.duration_seconds % 60);

                      return (
                        <div
                          key={sub.id}
                          className="bg-white p-4 sm:p-5 rounded-lg border border-neutral-200 hover:border-black transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={sub.status} size="sm" />
                              {sub.is_sample && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded">
                                  30s Audition Sample
                                </span>
                              )}
                              <span className="text-xs font-bold text-black bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-200">
                                Page Turning
                              </span>
                              <span className="text-xs text-black flex items-center gap-1 font-bold">
                                <Clock className="w-3.5 h-3.5 text-black" />
                                {minutes}:{seconds.toString().padStart(2, '0')} ({Math.round(sub.duration_seconds)}s)
                              </span>
                              {sub.created_at && (
                                <span className="text-xs font-semibold text-black bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-200 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                                  {new Date(sub.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                              )}
                              {sub.version_number && sub.version_number > 1 && (
                                <span className="text-[10px] font-bold text-black bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                                  v{sub.version_number}
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-lg font-bold text-black">{sub.title}</h3>

                            {sub.notes && (
                              <p className="text-xs text-black italic">Notes: “{sub.notes}”</p>
                            )}

                            {sub.revision_notes && (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                                <strong>Current Revision Guidance:</strong> {sub.revision_notes}
                              </div>
                            )}

                            {sub.rejection_reason && (
                              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900">
                                <strong>Rejection Reason:</strong> {sub.rejection_reason}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200">
                            <div className="text-left md:text-right">
                              <div className="font-serif text-lg font-bold text-black">
                                {sub.is_sample ? (
                                  <span className="text-xs font-sans font-bold text-neutral-500">$0.00 (Unpaid Sample)</span>
                                ) : (
                                  `$${sub.agreed_rate_usd.toFixed(2)} USD`
                                )}
                              </div>
                              <div className="text-[10px] uppercase font-bold text-neutral-500">
                                Payout State: {sub.payout_status}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <button
                                type="button"
                                onClick={() => openReviewModal(sub)}
                                className="px-3.5 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                {sub.status === 'APPROVED' ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Re-inspect</span>
                                  </>
                                ) : (
                                  <>
                                    <Film className="w-3.5 h-3.5" />
                                    <span>{sub.is_sample ? 'Review Audition' : 'Review Video'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload(sub, true)}
                                disabled={downloadingId === sub.id || downloadingCompressId === sub.id}
                                title="Download Compressed MP4 directly to device storage"
                                className="px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 disabled:opacity-50"
                              >
                                <Zap className={`w-3.5 h-3.5 text-black ${downloadingCompressId === sub.id ? 'animate-pulse text-amber-500' : ''}`} />
                                <Download className={`w-3.5 h-3.5 ${downloadingCompressId === sub.id ? 'animate-bounce' : ''}`} />
                                <span className="font-bold">
                                  {downloadingCompressId === sub.id
                                    ? compressProgress?.id === sub.id
                                      ? `${compressProgress.percent}%`
                                      : 'Compressing...'
                                    : 'Compressed'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload(sub, false)}
                                disabled={downloadingId === sub.id || downloadingCompressId === sub.id}
                                title="Download Normal Original Video directly to device storage"
                                className="px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 disabled:opacity-50"
                              >
                                <Download className={`w-3.5 h-3.5 ${downloadingId === sub.id ? 'animate-bounce' : ''}`} />
                                <span className="font-bold">{downloadingId === sub.id ? 'Saving...' : 'Normal'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Review Modal */}
      {reviewingSub && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#fff9fb] max-w-3xl w-full rounded-2xl border border-[#f2e3e8] p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto relative text-neutral-900">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={reviewingSub.status} size="sm" />
                  {reviewingSub.is_sample && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-neutral-100 border border-neutral-300 text-black">
                      30-Second Audition Sample (Unpaid)
                    </span>
                  )}
                  <span className="text-xs font-bold text-neutral-500">
                    Duration: {Math.floor(reviewingSub.duration_seconds / 60)}m {Math.round(reviewingSub.duration_seconds % 60)}s
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-black">
                  {reviewingSub.title}
                </h3>
                {reviewingSub.creator_name && (
                  <div className="text-xs text-neutral-600 font-medium">
                    Creator: <strong>{reviewingSub.creator_name}</strong> {reviewingSub.creator_email ? `(${reviewingSub.creator_email})` : ''}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                <button
                  type="button"
                  onClick={() => handleDownload(reviewingSub, true)}
                  disabled={downloadingId === reviewingSub.id || downloadingCompressId === reviewingSub.id}
                  title="Download Compressed MP4 directly to device storage"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <Download className={`w-3.5 h-3.5 ${downloadingCompressId === reviewingSub.id ? 'animate-bounce' : ''}`} />
                  <span>
                    {downloadingCompressId === reviewingSub.id
                      ? `Compressing ${compressProgress?.id === reviewingSub.id ? `${compressProgress.percent}%` : '...'}`
                      : 'Download Compressed'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(reviewingSub, false)}
                  disabled={downloadingId === reviewingSub.id || downloadingCompressId === reviewingSub.id}
                  title="Download Normal Original Video directly to device storage"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === reviewingSub.id ? 'animate-bounce' : ''}`} />
                  <span>{downloadingId === reviewingSub.id ? 'Saving to Device...' : 'Download Normal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewingSub(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {reviewingSub.is_sample && (
              <div className="p-3.5 rounded-xl bg-[#f8e2ec] border-0 text-xs font-medium text-black">
                <strong className="font-bold">Quality Audition Rule:</strong> Approving this sample unlocks the creator's portal to record and upload their <strong>8 full paid videos ($50.00 each)</strong> toward their $400 milestone payout. Note: audition samples are unpaid ($0 USD).
              </div>
            )}

            {/* Version / Revision Selector & History */}
            {subVersions.length > 0 && (
              <div className="border-0 rounded-xl p-4 bg-[#f8e2ec] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-black" />
                    <span>Revisions & Version Timeline ({subVersions.length})</span>
                  </span>
                  <span className="text-[11px] text-neutral-600 font-bold bg-white px-2 py-0.5 rounded border border-neutral-300">
                    Currently Inspecting: v{selectedVersionNum || reviewingSub.version_number || 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {subVersions.map((ver) => {
                    const isSelected = (selectedVersionNum || reviewingSub.version_number || 1) === ver.version_number;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => setSelectedVersionNum(ver.version_number)}
                        className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-black border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs">Version {ver.version_number}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-black border border-neutral-200'}`}>
                            {Math.round(ver.duration_seconds)}s
                          </span>
                        </div>
                        {ver.notes && (
                          <p className={`text-[11px] truncate italic ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            “{ver.notes}”
                          </p>
                        )}
                        <span className={`text-[10px] ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {new Date(ver.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* High-Performance Video Player with Built-In Quick Downloads */}
            {(() => {
              const activeVer = subVersions.find((v) => v.version_number === selectedVersionNum);
              const previewUrl = activeVer?.file_url || reviewingSub.file_url;
              const previewDuration = activeVer?.duration_seconds || reviewingSub.duration_seconds;
              const previewTitle = activeVer
                ? `${reviewingSub.title} (Version ${activeVer.version_number})`
                : reviewingSub.title;
              const targetForDownload: Submission = {
                ...reviewingSub,
                file_url: previewUrl,
                duration_seconds: previewDuration,
                title: previewTitle,
              };

              return (
                <AdminVideoPreview
                  src={previewUrl}
                  title={previewTitle}
                  durationSeconds={previewDuration}
                  onDownloadNormal={() => handleDownload(targetForDownload, false)}
                  onDownloadCompressed={() => handleDownload(targetForDownload, true)}
                  isDownloadingNormal={downloadingId === reviewingSub.id}
                  isDownloadingCompressed={downloadingCompressId === reviewingSub.id}
                  compressPercent={compressProgress?.id === reviewingSub.id ? compressProgress.percent : undefined}
                />
              );
            })()}

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {actionError}
              </div>
            )}

            {/* Review Decision Buttons */}
            <div className="space-y-4 border-t border-neutral-200 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                Review Decision
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('APPROVE')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    actionType === 'APPROVE'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-neutral-300 bg-white text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{reviewingSub.is_sample ? 'Approve Audition' : 'Approve ($50)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('REQUEST_REVISION')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    actionType === 'REQUEST_REVISION'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-neutral-300 bg-white text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Request Revision</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    actionType === 'REJECT'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-neutral-300 bg-white text-red-700 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Video</span>
                </button>
              </div>

              {actionType && actionType !== 'APPROVE' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Feedback / Revision Guidance for Creator
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      actionType === 'REQUEST_REVISION'
                        ? 'e.g. The paper turning is excellent, but please eliminate the background fan hum in the audio.'
                        : 'e.g. Rejected due to audible voices in the background.'
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              )}

              {actionType && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewingSub(null)}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-neutral-300 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReviewAction}
                    className="px-6 py-2 text-xs font-bold rounded-lg bg-black text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Review'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
