'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  Filter,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Eye,
  X,
  UploadCloud,
  History,
  Info,
  Download,
  Zap,
  Calendar,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import VideoThumbnail from '@/components/VideoThumbnail';
import StatusBadge from '@/components/StatusBadge';
import { Submission, SubmissionVersion } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { compressVideoFile, formatBytes } from '@/lib/videoCompression';
import { downloadNormalVideo, downloadCompressedVideo } from '@/lib/videoDownload';
import {
  playNotificationChime,
  sendBrowserPushNotification,
} from '@/lib/notifications';

export default function MyVideosPage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected for details / revision
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

  const handleDownload = async (sub: Submission, compress: boolean = true) => {
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

  useEffect(() => {
    selectedSubRef.current = selectedSub;
  }, [selectedSub]);

  const fetchSubmissions = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    fetch('/api/submissions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const subs: Submission[] = data.submissions || [];
        setSubmissions(subs);

        // Update selectedSub if it was modified
        if (selectedSubRef.current) {
          const currentId = selectedSubRef.current.id;
          const fresh = subs.find((s) => s.id === currentId);
          if (fresh) {
            setSelectedSub(fresh);
          }
        }
        if (showSpinner) setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        if (showSpinner) setLoading(false);
      });
  }, []);

  const handleReviewEvent = useCallback((event: any) => {
    if (event.type === 'AUDITION_REVIEWED') {
      if (event.action === 'APPROVE') {
        toast.success(
          'Audition approved! Production guideline: Master page-turning sound quality, crisp paper acoustics, and steady overhead framing.',
          'Audition Approved 🎉'
        );
        playNotificationChime('success');
      }
      return;
    }

    const title = event.title || 'Video Submission';
    if (event.action === 'APPROVE') {
      toast.success(
        `"${title}" has been approved!`,
        'Submission Approved 🎉'
      );
      playNotificationChime('success');
      sendBrowserPushNotification('Submission Approved! 🎉', {
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
  }, [toast]);

  useEffect(() => {
    fetchSubmissions(true);

    // 1. Cross-tab instant broadcast sync
    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        handleReviewEvent(msg);
        fetchSubmissions(false);
      };
    } catch {}

    // 2. Supabase Realtime broadcast channel
    const realtimeChan = supabase
      .channel('submission-updates-videos')
      .on('broadcast', { event: 'submission_reviewed' }, (payload: any) => {
        const data = payload.payload;
        if (!data) return;
        handleReviewEvent(data);
        fetchSubmissions(false);
      })
      .subscribe();

    // 3. Supabase Realtime postgres_changes
    const postgresChan = supabase
      .channel('public:submissions-videos-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          fetchSubmissions(false);
        }
      )
      .subscribe();

    // 4. Background polling fallback every 12 seconds
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSubmissions(false);
      }
    }, 12000);

    return () => {
      if (broadcastChan) broadcastChan.close();
      supabase.removeChannel(realtimeChan);
      supabase.removeChannel(postgresChan);
      clearInterval(pollInterval);
    };
  }, [fetchSubmissions, handleReviewEvent]);

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

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !revisionFile) return;

    setRevisionLoading(true);
    setRevisionError('');

    try {
      let fileToUpload = revisionFile;

      // Compress revision video if larger than 15MB
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
          toast.success(`Revision compressed: ${formatBytes(comp.originalSize)} → ${formatBytes(comp.compressedSize)} (${comp.savedPercent}% saved)!`);
        } catch (cErr) {
          console.warn('Revision compression skipped:', cErr);
        } finally {
          setRevisionCompressing(false);
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      if (revisionNotes.trim()) {
        formData.append('notes', revisionNotes.trim());
      }

      const res = await fetch(`/api/submissions/${selectedSub.id}/revision`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Revision upload failed');
      }

      toast.success(`Version ${data.submission.version_number} submitted for review!`);
      setSelectedSub(null);
      setRevisionFile(null);
      setRevisionNotes('');
      fetchSubmissions();
    } catch (err: any) {
      setRevisionError(err.message || 'Failed to submit revision');
    } finally {
      setRevisionLoading(false);
      setRevisionCompressing(false);
    }
  };

  const filtered = submissions.filter((s) => {
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q) || (s.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              CREATOR ARCHIVE
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 dark:text-white">
              My Submissions
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              Track video approvals, quality reviews, and downloadable assets.
            </p>
          </div>

          <Link
            href="/creator/upload"
            className="px-5 py-2.5 rounded-full bg-[#18151A] hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-100 text-white text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload video</span>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search submissions by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white transition-colors"
              />
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white transition-colors"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted (Under Review)</option>
                <option value="APPROVED">Approved</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white transition-colors"
              >
                <option value="ALL">All Formats</option>
                <option value="PAGE_TURNING">Page-Turning ASMR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="p-12 text-center text-neutral-500">
            <div className="inline-block w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs sm:text-sm font-medium">Loading your submissions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 p-12 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 text-center space-y-3">
            <Film className="w-10 h-10 text-neutral-400 mx-auto" />
            <h3 className="font-serif text-xl font-normal text-neutral-900 dark:text-white">
              No matching submissions found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto font-normal">
              Try adjusting your search filters or upload a new recording.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub) => {
              const minutes = Math.floor(sub.duration_seconds / 60);
              const seconds = Math.round(sub.duration_seconds % 60);

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                      {/* Video Thumbnail Box with real frame fetch */}
                      <button
                        type="button"
                        onClick={() => openDetails(sub)}
                        className="group relative focus:outline-none shrink-0"
                        title="Click to view & play video"
                      >
                        <VideoThumbnail
                          videoId={sub.id}
                          durationSeconds={sub.duration_seconds}
                          className="w-20 h-20 sm:w-24 sm:h-24"
                          altTitle={sub.title}
                        />
                      </button>

                      {/* Video Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* Status Badge */}
                          {sub.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF2F4] dark:bg-[#2E1823] text-[#8E2848] dark:text-pink-300 border border-[#FAD8E2] dark:border-[#421D30]">
                              <CheckCircle2 className="w-3 h-3 text-[#8E2848] dark:text-pink-300" />
                              <span>Approved</span>
                            </span>
                          ) : sub.status === 'REVISION_REQUESTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="w-3 h-3" />
                              <span>Revision Requested</span>
                            </span>
                          ) : sub.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                              <X className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              <span>Under Review</span>
                            </span>
                          )}

                          {/* Category Tag */}
                          <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-0.5 rounded-full border border-neutral-200/80 dark:border-neutral-700">
                            Page-Turning ASMR
                          </span>

                          {/* Duration Tag */}
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            {minutes}:{seconds.toString().padStart(2, '0')} ({Math.round(sub.duration_seconds)}s)
                          </span>

                          {/* Created Date */}
                          {sub.created_at && (
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
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

                          {sub.version_number > 1 && (
                            <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                              v{sub.version_number}
                            </span>
                          )}
                        </div>

                        {/* Video Title */}
                        <h3
                          onClick={() => openDetails(sub)}
                          className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white line-clamp-1 cursor-pointer hover:text-[#BE185D] dark:hover:text-[#F472B6] transition-colors"
                        >
                          {sub.title}
                        </h3>

                        {/* Tags: Audition Sample / Quality Gate OR Payout Info */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {sub.is_sample ? (
                            <>
                              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                                Audition Sample
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-700">•</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E2848] dark:text-pink-400">
                                Quality Gate
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-700">•</span>
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                Non-billable
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                ${(sub.agreed_rate_usd || 50).toFixed(2)}
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-700">•</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                                Payout: {sub.payout_status || 'UNPAID'}
                              </span>
                            </>
                          )}
                        </div>

                        {sub.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 italic line-clamp-1">
                            “{sub.notes}”
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right / Bottom Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleDownload(sub, true)}
                        disabled={downloadingId === sub.id || downloadingCompressId === sub.id}
                        title="Download MP4"
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FDF2F4] hover:bg-[#F8E2EC] text-[#7B1E4B] transition-colors border-0 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#7B1E4B]" />
                        <Download className={`w-3.5 h-3.5 ${downloadingCompressId === sub.id ? 'animate-bounce' : ''}`} />
                        <span>{downloadingCompressId === sub.id ? 'Saving...' : 'MP4'}</span>
                      </button>

                      {sub.status === 'REVISION_REQUESTED' && (
                        <button
                          type="button"
                          onClick={() => openDetails(sub)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#7B1E4B] hover:bg-[#63183C] text-white transition-colors border-0 shadow-xs"
                        >
                          Upload Revision
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openDetails(sub)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FDF2F4] hover:bg-[#F8E2EC] text-[#7B1E4B] transition-colors border-0 flex items-center gap-1"
                      >
                        <span>History & Details</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </div>
                  </div>

                  {/* Revision / Rejection Feedback callouts if present */}
                  {sub.revision_notes && (
                    <div className="p-3 bg-[#FDF2F4] dark:bg-[#22131A] border border-[#FCE3E8] dark:border-[#3B1E2C] rounded-xl text-xs text-neutral-900 dark:text-neutral-100 space-y-1">
                      <div className="font-bold text-[#8E2848] dark:text-pink-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#8E2848] dark:text-pink-300" />
                        <span>Admin Revision Instructions:</span>
                      </div>
                      <p className="leading-relaxed font-normal">{sub.revision_notes}</p>
                    </div>
                  )}

                  {sub.rejection_reason && (
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 space-y-1">
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">Rejection Reason:</div>
                      <p className="leading-relaxed font-normal">{sub.rejection_reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Details & Revision Drawer Modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#fff9fb] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 border border-[#f2e3e8] text-neutral-900 shadow-2xl">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div>
                      <StatusBadge status={selectedSub.status} />
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white break-words">
                      {selectedSub.title}
                    </h3>
                  </div>
                  {/* Mobile close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="sm:hidden p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 -mr-1"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Download Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedSub, true)}
                    disabled={downloadingId === selectedSub.id || downloadingCompressId === selectedSub.id}
                    title="Download Compressed MP4"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                    <Download className={`w-3.5 h-3.5 shrink-0 ${downloadingCompressId === selectedSub.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingCompressId === selectedSub.id ? 'Compressing...' : 'MP4'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedSub, false)}
                    disabled={downloadingId === selectedSub.id || downloadingCompressId === selectedSub.id}
                    title="Download Original Raw Video"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 shrink-0 ${downloadingId === selectedSub.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingId === selectedSub.id ? 'Downloading...' : 'Original'}</span>
                  </button>
                  {/* Desktop close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="hidden sm:inline-flex p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 ml-1"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Locked Agreed Rate Info */}
              <div className="bg-[#f8e2ec] p-4 rounded-xl border-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">Agreed Rate</span>
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
                  <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">Duration</span>
                  <div className="font-serif text-base font-normal text-neutral-900 mt-0.5">
                    {Math.round(selectedSub.duration_seconds)}s
                  </div>
                </div>
                <div>
                  <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">Payout State</span>
                  <div className="font-semibold text-neutral-900 uppercase mt-0.5 text-[11px]">
                    {selectedSub.is_sample ? (
                      <span className="text-neutral-600">
                        Gate ($0)
                      </span>
                    ) : (
                      selectedSub.payout_status
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">Version</span>
                  <div className="font-serif text-base font-normal text-neutral-900 mt-0.5">
                    v{selectedSub.version_number}
                  </div>
                </div>
              </div>

              {/* Revision Upload Section */}
              {selectedSub.status === 'REVISION_REQUESTED' && (
                <div className="bg-[#f8e2ec] p-5 rounded-2xl border-0 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <RotateCw className="w-4 h-4 text-[#8E2848] dark:text-pink-400" />
                      <span>Submit Version {selectedSub.version_number + 1} Revision</span>
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-normal">
                      Re-upload your video addressing the admin&apos;s notes. Revisions preserve submission history and cannot generate duplicate earnings.
                    </p>
                  </div>

                  {revisionError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-medium">
                      {revisionError}
                    </div>
                  )}

                  <form onSubmit={handleRevisionSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                        Choose Replacement MP4/MOV Video (3+ Minutes)
                      </label>
                      <input
                        type="file"
                        required
                        accept="video/mp4,video/quicktime,.mp4,.mov"
                        onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                        className="text-xs w-full text-neutral-700 dark:text-neutral-300 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#18151A] file:text-white dark:file:bg-white dark:file:text-black hover:file:opacity-90"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                        Notes on Changes Made
                      </label>
                      <input
                        type="text"
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="e.g. Re-exported with background noise filtered..."
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={revisionLoading || !revisionFile}
                      className="px-5 py-2.5 rounded-full bg-[#18151A] hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-100 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                    >
                      {revisionLoading ? 'Processing Revision...' : 'Submit Revision'}
                    </button>
                  </form>
                </div>
              )}

              {/* Version History List */}
              <div className="space-y-3">
                <h4 className="font-serif text-lg font-normal text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-neutral-400" />
                  <span>Version History</span>
                </h4>

                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          Version {v.version_number}{' '}
                          {v.version_number === selectedSub.version_number && (
                            <span className="text-[10px] font-semibold text-[#8E2848] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-full ml-1 border border-pink-200/60 dark:border-pink-900/40">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                          Runtime: {Math.round(v.duration_seconds)}s • Uploaded:{' '}
                          {new Date(v.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                        {v.notes && <p className="text-neutral-600 dark:text-neutral-400 mt-1 italic">“{v.notes}”</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Centered Ticker Bar */}
        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500 tracking-wider py-8">
          $50 flat rate. &nbsp;·&nbsp; 8-video minimum. &nbsp;·&nbsp; Your work. Your earnings.
        </div>
      </div>
    </div>
  );
}
