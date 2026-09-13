'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  RotateCw,
  Clock,
  Shield,
  ArrowRight,
  Lock,
  FileText,
  Building2,
  Zap,
  Check,
  Video,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { SampleStatus } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { useUpload } from '@/components/UploadProvider';
import { supabase } from '@/lib/supabase';
import {
  playNotificationChime,
  sendBrowserPushNotification,
} from '@/lib/notifications';
import { compressVideoFile, formatBytes } from '@/lib/videoCompression';

interface UploadQueueItem {
  id: string;
  file: File;
  title: string;
  category: 'THIGH_FLAPPING_AND_GUM_CHEWING' | 'THIGH_FLAPPING' | 'GUM_CHEWING';
  notes: string;
  status: 'PENDING' | 'COMPRESSING' | 'UPLOADING' | 'VERIFYING' | 'SUCCESS' | 'ERROR';
  progress: number;
  errorMessage?: string;
  durationSeconds?: number;
  previewUrl?: string;
  uploadedKey?: string;
  compressingMsg?: string;
  isOfficeBonus?: boolean;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    savedPercent: number;
  };
}

export default function CreatorUploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { startUpload, uploadState } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditionFileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [isOfficeBonusBatch, setIsOfficeBonusBatch] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  // Video Compression Options
  const [compressUploads, setCompressUploads] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState<'balanced' | 'high'>('balanced');

  // Audition Gate State
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('APPROVED');
  const [sampleReviewNotes, setSampleReviewNotes] = useState<string | null>(null);
  const [agreementSigned, setAgreementSigned] = useState<boolean | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  // Sample video modal
  const [sampleVideoOpen, setSampleVideoOpen] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string>('');
  const [sampleVideoTitle, setSampleVideoTitle] = useState<string>('Official Sample Guideline');
  const [sampleVideoLoading, setSampleVideoLoading] = useState(false);

  const fetchGuidelineSample = async () => {
    try {
      setSampleVideoLoading(true);
      const res = await fetch('/api/guidelines/samples');
      const data = await res.json();
      if (data.samples && data.samples.length > 0) {
        const s = data.samples[0];
        setSampleVideoUrl(s.video_url || '');
        if (s.title) {
          setSampleVideoTitle(s.title.replace(/benchmark/gi, 'Guideline'));
        }
      }
    } catch (e) {
      console.error('Failed to load official sample', e);
    } finally {
      setSampleVideoLoading(false);
    }
  };

  const openSampleVideoModal = () => {
    setSampleVideoOpen(true);
    fetchGuidelineSample();
  };

  // 30s Audition Upload State
  const [auditionFile, setAuditionFile] = useState<File | null>(null);
  const [auditionNotes, setAuditionNotes] = useState('');
  const [auditionUploading, setAuditionUploading] = useState(false);
  const [auditionError, setAuditionError] = useState('');

  const minRequired = stats?.minRequired ?? settings?.min_payout_videos ?? 8;
  const eligibleCount = stats?.eligibleCount || 0;
  const ratePerVideo = settings?.rate_per_video_usd ?? 50;

  const loadCreatorStatus = async () => {
    try {
      const [statsRes, settingsRes, agreementRes] = await Promise.all([
        fetch('/api/creator/stats'),
        fetch('/api/settings'),
        fetch('/api/creator/agreement'),
      ]);
      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();
      const agreementData = await agreementRes.json().catch(() => null);

      if (agreementData && typeof agreementData.signed === 'boolean') {
        setAgreementSigned(agreementData.signed);
      } else if (statsData.profile) {
        setAgreementSigned(Boolean(statsData.profile.agreement_signed));
      }

      if (statsData.profile) {
        setSampleStatus(statsData.profile.sample_status || 'NOT_SUBMITTED');
        setSampleReviewNotes(statsData.profile.sample_review_notes || null);
      }
      if (statsData.stats) {
        setStats(statsData.stats);
      }
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (e) {
      console.error('Failed to fetch creator stats', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadCreatorStatus();
    fetchGuidelineSample();

    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'AUDITION_REVIEWED') {
          if (msg.action === 'APPROVE') {
            toast.success(
              'Audition approved! Production guideline: The 8 videos should be with the same knee length skirt, but with different panties each.',
              'Audition Approved 🎉'
            );
            playNotificationChime('success');
            sendBrowserPushNotification('Audition Approved!', {
              body: 'Your 30-second audition was approved! Guideline: The 8 videos should be with the same knee length skirt, but with different panties each.',
            });
          } else {
            toast.warning(
              msg.notes || 'Your audition sample requires updates.',
              msg.action === 'REVISION' ? 'Revision Requested' : 'Audition Rejected'
            );
            playNotificationChime('alert');
            sendBrowserPushNotification('Audition Review Update', {
              body: msg.notes || 'Your audition was reviewed by an administrator.',
            });
          }
        }
        loadCreatorStatus();
      };
    } catch { }

    const realtimeChan = supabase
      .channel('submission-updates-upload')
      .on('broadcast', { event: 'submission_reviewed' }, (payload: any) => {
        const data = payload.payload;
        if (!data) return;

        if (data.type === 'AUDITION_REVIEWED') {
          if (data.action === 'APPROVE') {
            toast.success(
              'Audition approved! Production guideline: The 8 videos should be with the same knee length skirt, but with different panties each.',
              'Audition Approved 🎉'
            );
            playNotificationChime('success');
            sendBrowserPushNotification('Audition Approved! 🚀', {
              body: 'Your 30-second audition was approved! Guideline: The 8 videos should be with the same knee length skirt, but with different panties each.',
            });
          } else {
            toast.warning(
              data.notes || 'Your audition sample requires updates.',
              data.action === 'REVISION' ? 'Revision Requested' : 'Audition Rejected'
            );
            playNotificationChime('alert');
          }
        }
        loadCreatorStatus();
      })
      .subscribe();

    const postgresChan = supabase
      .channel('public:profiles-upload-page')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          loadCreatorStatus();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCreatorStatus();
      }
    }, 12000);

    return () => {
      if (broadcastChan) broadcastChan.close();
      supabase.removeChannel(realtimeChan);
      supabase.removeChannel(postgresChan);
      clearInterval(pollInterval);
    };
  }, []);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      try {
        const v = document.createElement('video');
        v.preload = 'metadata';
        const objUrl = URL.createObjectURL(file);
        v.src = objUrl;
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(objUrl);
          if (v.duration && !isNaN(v.duration) && isFinite(v.duration)) {
            resolve(Math.round(v.duration));
          } else {
            resolve(0);
          }
        };
        v.onerror = () => {
          URL.revokeObjectURL(objUrl);
          resolve(0);
        };
      } catch {
        resolve(0);
      }
    });
  };

  const handleAuditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (agreementSigned === false) {
      setAuditionError('You must sign the Master Creator Agreement before submitting your audition.');
      toast.warning('Creator Agreement signature required before uploading.');
      router.push('/creator/agreement');
      return;
    }
    if (!auditionFile) {
      setAuditionError('Please select a video file for your 30-second audition.');
      return;
    }

    setAuditionError('');

    try {
      const clientDuration = await getVideoDuration(auditionFile);
      if (clientDuration > 0 && clientDuration < 30) {
        throw new Error(`Audition sample is only ${clientDuration}s long. Audition samples must be at least 30 seconds.`);
      }

      await startUpload(auditionFile, {
        title: '30s Audition Sample',
        durationSeconds: clientDuration || 30,
        notes: auditionNotes.trim(),
        isSample: true,
      });

      setSampleStatus('PENDING_REVIEW');
      setAuditionFile(null);
      setAuditionNotes('');
      loadCreatorStatus();
    } catch (err: any) {
      setAuditionError(err.message || 'Error submitting audition sample.');
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (agreementSigned === false) {
      toast.warning('Creator Agreement signature required before uploading.');
      router.push('/creator/agreement');
      return;
    }

    const newItems: UploadQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAllowed = file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov');
      if (!isAllowed) {
        toast.error(`File "${file.name}" is not an MP4 or MOV file. Only MP4 and MOV recordings are supported.`);
        continue;
      }

      const itemTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const previewBlob = URL.createObjectURL(file);
      const clientDuration = await getVideoDuration(file);

      newItems.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        title: itemTitle.charAt(0).toUpperCase() + itemTitle.slice(1),
        category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
        notes: '',
        status: 'PENDING',
        progress: 0,
        previewUrl: previewBlob,
        durationSeconds: clientDuration,
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<UploadQueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const clearAllQueue = () => {
    setQueue([]);
  };

  const processItemUpload = async (item: UploadQueueItem) => {
    if (!consentConfirmed) {
      toast.warning('Please check the recording guidelines confirmation checkbox before uploading.');
      return;
    }

    updateItem(item.id, { status: 'UPLOADING', progress: 10, errorMessage: undefined });

    try {
      const clientDuration = await getVideoDuration(item.file);
      if (clientDuration > 0 && clientDuration < 180) {
        throw new Error(`Video duration is only ${clientDuration}s. Full production videos must be at least 3 minutes (180s).`);
      }

      const itemNotesCombined = [batchNotes.trim(), item.notes.trim()].filter(Boolean).join(' | ');

      await startUpload(item.file, {
        title: item.title || batchTitle || item.file.name,
        category: item.category,
        durationSeconds: clientDuration || 180,
        notes: itemNotesCombined,
        consentConfirmed: true,
        isSample: false,
        isOfficeBonus: Boolean(item.isOfficeBonus),
      });

      updateItem(item.id, { status: 'SUCCESS', progress: 100 });
      setTimeout(() => {
        removeItem(item.id);
        router.push('/creator/videos');
      }, 800);
    } catch (err: any) {
      updateItem(item.id, { status: 'ERROR', errorMessage: err.message || 'Upload failed' });
    }
  };

  const uploadAllPending = async () => {
    if (agreementSigned === false) {
      toast.warning('Creator Agreement signature required before uploading.');
      router.push('/creator/agreement');
      return;
    }

    if (!consentConfirmed) {
      toast.warning('Please check the recording guidelines confirmation checkbox before uploading.');
      return;
    }

    const pending = queue.filter((i) => i.status === 'PENDING' || i.status === 'ERROR');
    if (pending.length === 0) return;

    for (const item of pending) {
      await processItemUpload(item);
    }
  };

  const validQueueItems = queue.filter((i) => !i.durationSeconds || i.durationSeconds >= 180);
  const totalReadyCount = Math.min(minRequired, eligibleCount + validQueueItems.length);
  const totalPotentialEarnings = (totalReadyCount * ratePerVideo).toFixed(2);

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] tracking-[0.22em] font-bold text-[#7B1E4B] dark:text-[#F472B6] uppercase">
              YOUR NEXT RECORDING
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-normal text-neutral-900 dark:text-white leading-tight">
              A little sound. <span className="italic font-serif text-[#7B1E4B] dark:text-[#F472B6]">A new beginning.</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              Add your videos, check the details, and prepare your next batch.
            </p>
          </div>
          <Link
            href="/creator"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] sm:text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors self-start sm:self-auto"
          >
            <span>Back to dashboard</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>

        {/* Agreement Warning Banner if not signed */}
        {!loadingProfile && agreementSigned === false && (
          <div className="bg-[#130E14] text-white rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
                  <span>Action Required: Sign Master Creator Agreement</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#BE185D] text-white">
                    Required
                  </span>
                </h3>
                <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
                  Before uploading full production videos or auditions, you must review and electronically sign The Pink Room Master Content Creator & Independent Contractor Agreement.
                </p>
              </div>
            </div>
            <Link
              href="/creator/agreement"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white text-[#130E14] hover:bg-white/90 text-xs font-bold transition-all shadow-sm"
            >
              <span>Review & Sign Agreement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Official Guideline Sample Prominent Banner (Matches Official Sample Reference Spec) */}
        <div
          role="button"
          tabIndex={0}
          onClick={openSampleVideoModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openSampleVideoModal();
            }
          }}
          data-official-sample-banner="true"
          className="official-sample-banner w-full bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F3D3E1] dark:border-[#3D2132] rounded-2xl p-6 sm:p-8 lg:p-10 transition-all hover:bg-[#F9E2EC] dark:hover:bg-[#2A1825] group text-left cursor-pointer shadow-xs"
        >
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-[#721C38] text-[#721C38] ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-normal text-[#2A0E19] dark:text-[#FDF2F7] leading-tight tracking-tight">
                Watch the Official Sample Guideline
              </h2>
              <p className="text-xs sm:text-sm text-[#7D5B6A] dark:text-[#D1B5C3] mt-2 sm:mt-2.5 leading-relaxed max-w-xl">
                See exactly what a passing submission looks, sounds, and frames like before you record.
              </p>
              <div className="mt-5 sm:mt-6">
                <span className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#721C38] hover:bg-[#5C152D] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm group-hover:shadow-md">
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white" />
                  <span>Play Sample Now</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Special Office Setting & Under-Desk View Bonus Banner */}
        <div className="bg-[#130E14] text-white rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-neutral-800 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-medium text-white">
                <span className="font-serif font-normal text-base sm:text-lg text-white">
                  Special Office Setting & Under-Desk View Bonus
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#BE185D] text-white">
                  +$100.00 BONUS
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#BE185D] text-white">
                  $150.00 Total Payout / Video
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-normal">
                Earn an extra <strong>$100 bonus</strong> per video (<strong>$150.00 total payout</strong> instead of the standard $50 rate) by recording in an authentic office environment with your camera positioned under the desk framing the thigh-flapping & gum-chewing ASMR! Simply check the <strong>Office Bonus</strong> option on your video card below before uploading.
              </p>
            </div>
          </div>
        </div>

        {/* 30s Audition Sample Gate Card (When sampleStatus !== 'APPROVED') */}
        {sampleStatus !== 'APPROVED' && (
          <div className="bg-white dark:bg-[#18151C] border-2 border-[#BE185D] dark:border-[#BE185D] rounded-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#BE185D] dark:text-[#F472B6]">
                  Step 1 of 2 • Audition Quality Gate
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">
                  Submit Your 30-Second Audition Sample
                </h2>
              </div>
              <div className="text-[11px] sm:text-xs bg-[#FDF2F4] dark:bg-[#2D1622] text-[#9D174D] dark:text-[#F472B6] px-3 py-1.5 rounded-full font-bold border border-[#FBCFE8] dark:border-[#501D36] self-start sm:self-auto">
                Target Duration: <strong>30 to 60 Seconds</strong>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
              To ensure quality standards, all creators submit a <strong>30-second sample</strong> demonstrating natural thigh-flapping lap clapping (knee length skirt worn) and crisp gum-chewing together without background noise. <strong>Setup rule:</strong> Sit on a chair and table setup and keep the camera mounted at knee level. Once approved by an administrator, full {minRequired}-video production unlocks immediately.
            </p>

            {sampleStatus === 'PENDING_REVIEW' && (
              <div className="bg-[#130E14] text-white rounded-2xl p-5 sm:p-6 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 font-serif text-base sm:text-lg font-bold text-white">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                  <span>Audition Sample Under Administrative Review</span>
                </div>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
                  Your 30-second audition sample has been received and queued for administrative evaluation. You will receive an in-app notification as soon as it is approved so you can begin uploading your {minRequired} full videos.
                </p>
              </div>
            )}

            {(sampleStatus === 'NOT_SUBMITTED' || sampleStatus === 'REVISION_REQUESTED') && (
              <form onSubmit={handleAuditionSubmit} className="space-y-4">
                {auditionError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{auditionError}</span>
                  </div>
                )}

                <input
                  ref={auditionFileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAuditionFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onClick={() => auditionFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#FBCFE8] dark:border-[#501D36] hover:border-[#BE185D] rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-colors bg-[#FFF9FB] dark:bg-[#1C1620] text-neutral-900 dark:text-white"
                >
                  <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 mx-auto text-[#9D174D] dark:text-[#F472B6] mb-2" />
                  <div className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-full px-2" title={auditionFile?.name}>
                    {auditionFile ? auditionFile.name : 'Click to choose your 30-second audition sample video'}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-1">
                    MP4 or MOV format • Minimum 30 seconds • Max 100MB
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={auditionUploading || !auditionFile}
                  className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-[#BE185D] hover:bg-[#9D174D] text-white font-bold disabled:opacity-50 transition-colors text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Submit 30-Second Audition for Review</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Main Two-Column Grid matching Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Form & Queue (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            {/* Card 01: Add your recordings */}
            <div className="bg-white dark:bg-[#16131A] border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-xs">
              {/* Card 01 Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="font-serif text-3xl sm:text-4xl font-light text-neutral-300 dark:text-neutral-700 leading-none">
                    01
                  </span>
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                      Add your recordings.
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                      One video or a full batch. Start wherever you are.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shrink-0">
                  MP4 / MOV
                </span>
              </div>

              {/* Dropzone Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#FBCFE8] dark:border-[#421D2F] hover:border-[#BE185D] dark:hover:border-[#F472B6] bg-[#FFF9FB] dark:bg-[#1A131E] rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-colors group relative"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />

                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FCE7F0] dark:bg-[#3B1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <h3 className="font-serif text-lg sm:text-xl font-normal text-neutral-900 dark:text-white">
                  Drop your videos here.
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                  Original recordings. At least 3 minutes each.
                </p>

                <div className="mt-3 sm:mt-4">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-[11px] sm:text-xs font-bold hover:bg-black dark:hover:bg-neutral-200 transition-all shadow-xs">
                    <span>Choose videos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">
                  Select up to {minRequired} videos for this batch
                </div>
              </div>

              {/* Specs row below dropzone */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-1 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>3:00 minimum</span>
                </span>
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-neutral-400" />
                  <span>MP4 or MOV</span>
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Preview stays on your device</span>
                </span>
              </div>

              {/* Uploaded File List ("Your recordings") */}
              {queue.length > 0 && (
                <div className="space-y-3 pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        Your recordings
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#BE185D] text-white text-[10px] font-bold">
                        {queue.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAllQueue}
                      className="text-xs text-neutral-500 hover:text-black dark:hover:text-white font-medium transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {queue.map((item) => {
                      const isTooShort = Boolean(item.durationSeconds && item.durationSeconds < 180);

                      return (
                        <div
                          key={item.id}
                          className="bg-[#FFF9FB] dark:bg-[#1A131E] border border-[#FBCFE8]/60 dark:border-[#3D182A] rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-[#FCE7F0] dark:bg-[#331422] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                              <Video className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-neutral-900 dark:text-white truncate text-[11px] sm:text-xs">
                                {item.file.name}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                                <span>{formatBytes(item.file.size)}</span>
                                {item.durationSeconds ? (
                                  <span>
                                    &bull; {Math.floor(item.durationSeconds / 60)}:
                                    {String(Math.round(item.durationSeconds % 60)).padStart(2, '0')}
                                  </span>
                                ) : null}
                              </div>
                              {isTooShort && (
                                <div className="text-[10px] text-[#BE185D] dark:text-[#F472B6] font-semibold mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>Too short — full videos must be at least 3:00.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.previewUrl && (
                              <button
                                type="button"
                                onClick={() => setActivePreviewUrl(item.previewUrl || null)}
                                className="p-1.5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                                title="Preview local video"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                              title="Remove video"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smart Video Compression Bar */}
              <div className="bg-neutral-50 dark:bg-[#1A1620] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-[#BE185D] dark:text-[#F472B6] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-[11px] sm:text-xs">
                      <span>Automatic Device Compression</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#FCE7F0] dark:bg-[#3B1527] text-[#9D174D] dark:text-[#F472B6]">
                        Fast
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                      Compresses heavy files before sending for faster uploads.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compressUploads}
                      onChange={(e) => setCompressUploads(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 sm:w-9 sm:h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 sm:after:h-4 sm:after:w-4 after:transition-all peer-checked:bg-[#BE185D]"></div>
                  </label>
                  <select
                    value={compressionQuality}
                    disabled={!compressUploads}
                    onChange={(e: any) => setCompressionQuality(e.target.value)}
                    className="text-[10px] sm:text-[11px] font-semibold bg-white dark:bg-[#251F2C] border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-neutral-900 dark:text-white"
                  >
                    <option value="balanced">720p HD (~2 Mbps)</option>
                    <option value="high">1080p FHD (~3.5 Mbps)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 02: A few details */}
            <div className="bg-white dark:bg-[#16131A] border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-xs">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="font-serif text-3xl sm:text-4xl font-light text-neutral-300 dark:text-neutral-700 leading-none">
                  02
                </span>
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    A few details.
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                    Help the editorial team understand your recording.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Recording format
                  </label>
                  <div className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-neutral-50 dark:bg-[#1D1924] border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
                    <span>Thigh-flapping & gum-chewing</span>
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Batch title
                    </label>
                    <span className="text-neutral-400 text-[11px]">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={batchTitle}
                    onChange={(e) => setBatchTitle(e.target.value)}
                    placeholder="e.g. My first ASMR batch"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white dark:bg-[#1D1924] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#BE185D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Notes for the review team
                    </label>
                    <span className="text-neutral-400 text-[11px]">Optional</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="Anything you'd like the team to know about these recordings?"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white dark:bg-[#1D1924] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#BE185D]"
                  />
                  <div className="text-right text-[10px] text-neutral-400">
                    {batchNotes.length}/1,000
                  </div>
                </div>

                {/* Office Setting & Under-Desk Camera View Bonus Toggle */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#FBCFE8] dark:border-[#3D182A] bg-[#FFF9FB] dark:bg-[#1C1620] cursor-pointer transition-all hover:border-[#BE185D]">
                    <input
                      type="checkbox"
                      checked={isOfficeBonusBatch}
                      onChange={(e) => {
                        setIsOfficeBonusBatch(e.target.checked);
                        setQueue((prev) => prev.map((item) => ({ ...item, isOfficeBonus: e.target.checked })));
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#BE185D] focus:ring-[#BE185D] accent-[#BE185D]"
                    />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2 flex-wrap font-bold text-neutral-900 dark:text-white">
                        <Building2 className="w-4 h-4 text-[#BE185D] dark:text-[#F472B6] shrink-0" />
                        <span>Office Setting & Under-Desk Camera View</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#BE185D] text-white">
                          +$100.00 BONUS
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#BE185D] text-white">
                          $150.00 Total Payout / Video
                        </span>
                      </div>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed text-[11px]">
                        Check this box if this batch was recorded in an authentic office environment with the camera positioned under the desk framing the thigh-flapping & gum-chewing ASMR ($150 total payout per approved video).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Legal Checkbox & Action Area */}
            <div className="space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => {
                    setConsentConfirmed(e.target.checked);
                    setIsAdultConfirmed(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#BE185D] focus:ring-[#BE185D] accent-[#BE185D]"
                />
                <span className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                  These are my original recordings. I've followed the{' '}
                  <Link href="/creator/guidelines" className="underline font-bold text-neutral-900 dark:text-white">
                    recording guidelines
                  </Link>
                  , including the clothing requirements for my batch of eight.
                </span>
              </label>

              {/* Bottom action bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {validQueueItems.length} of {queue.length || 1} video ready
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {queue.length === 0
                      ? 'Add recordings above to prepare your batch.'
                      : validQueueItems.length < queue.length
                        ? 'Remove or replace the recordings that need attention.'
                        : 'All selected recordings meet guidelines and runtime specs.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={uploadAllPending}
                  disabled={queue.length === 0 || !consentConfirmed}
                  className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold hover:bg-[#BE185D] hover:text-white dark:hover:bg-[#BE185D] dark:hover:text-white disabled:opacity-50 transition-all text-xs inline-flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                >
                  <span>Review selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar Cards (5 Cols) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            {/* Card A: Dark Batch Summary Card ("YOUR FIRST BATCH") */}
            <div className="bg-[#130E14] text-white rounded-3xl p-5 sm:p-7 space-y-5 sm:space-y-6 shadow-sm border border-neutral-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] tracking-[0.2em] font-bold text-white/70 uppercase">
                  YOUR FIRST BATCH
                </span>
                <Video className="w-4 h-4 text-white/70" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-xl sm:text-3xl font-normal leading-tight text-white">
                  Eight recordings. <br />
                  <span className="italic font-serif text-[#F472B6]">Your first ${minRequired * ratePerVideo}.</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed font-normal pt-1">
                  Every approved full video earns ${ratePerVideo}. Build your batch at your own pace.
                </p>
              </div>

              {/* 8-slot progress row */}
              <div className="grid grid-cols-8 gap-1 sm:gap-1.5 pt-1 sm:pt-2">
                {Array.from({ length: minRequired }).map((_, idx) => {
                  const slotNum = String(idx + 1).padStart(2, '0');
                  const isReady = idx < totalReadyCount;

                  return (
                    <div
                      key={idx}
                      className={`h-7 sm:h-8 rounded-md sm:rounded-lg border text-[9px] sm:text-[10px] font-bold flex items-center justify-center transition-all ${isReady
                          ? 'bg-[#BE185D] border-[#BE185D] text-white'
                          : 'border-white/20 text-white/40 bg-white/5'
                        }`}
                    >
                      {slotNum}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70 font-medium pt-1">
                <span>{totalReadyCount} of {minRequired} ready in this selection</span>
                <Lock className="w-3.5 h-3.5 text-white/50" />
              </div>

              <div className="border-t border-white/10 pt-4 sm:pt-5 space-y-1.5 sm:space-y-2">
                <div className="text-[10px] tracking-widest font-bold text-white/60 uppercase">
                  POTENTIAL EARNINGS
                </div>
                <div className="font-serif text-2xl sm:text-4xl font-normal text-white">
                  ${totalPotentialEarnings}
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/60 leading-relaxed font-normal">
                  Credited only after editorial approval. Payouts require at least {minRequired} approved, unpaid videos.
                </p>
              </div>
            </div>

            {/* Card B: Soft Pink Guidelines Card ("A QUICK REMINDER / Before you upload.") */}
            <div className="bg-[#FDF2F4] dark:bg-[#20151B] border border-[#FBCFE8] dark:border-[#421A2E] rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 text-neutral-900 dark:text-white">
              <div className="text-[10px] tracking-[0.2em] font-bold text-[#9D174D] dark:text-[#F472B6] uppercase">
                A QUICK REMINDER
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                Before you upload.
              </h3>

              <ul className="space-y-2.5 sm:space-y-3 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>At least 3 minutes per full video</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Clear audio with no background noise</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Stable lighting and faceless framing</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>The same knee-length skirt across all 8 videos</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Different panties for each video</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCE7F0] dark:bg-[#3D1527] text-[#9D174D] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Safe, painless rhythmic pacing</span>
                </li>
              </ul>

              <div className="pt-2 border-t border-[#FBCFE8]/60 dark:border-[#3B1728]">
                <Link
                  href="/creator/guidelines"
                  className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:underline"
                >
                  <span>Read the full guidelines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card C: Step-by-Step Card ("WHAT HAPPENS NEXT") */}
            <div className="bg-white dark:bg-[#16131A] border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 text-neutral-900 dark:text-white shadow-xs">
              <div className="text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase">
                WHAT HAPPENS NEXT
              </div>

              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <span className="font-serif text-lg sm:text-xl font-normal text-neutral-400 shrink-0">
                    01
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-neutral-900 dark:text-white">
                      Submit from your account
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                      Your recording enters the review queue.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="font-serif text-lg sm:text-xl font-normal text-neutral-400 shrink-0">
                    02
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-neutral-900 dark:text-white">
                      Editorial review
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                      The team checks sound, framing, and the recording guidelines.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="font-serif text-lg sm:text-xl font-normal text-neutral-400 shrink-0">
                    03
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-neutral-900 dark:text-white">
                      Approval & earnings
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                      ${ratePerVideo} is credited for each approved full video.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Muted Note */}
        <div className="pt-4 sm:pt-6 border-t border-neutral-200/60 dark:border-neutral-800 text-center text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-medium">
          ${ratePerVideo} flat rate. &nbsp;&bull;&nbsp; {minRequired}-video minimum. &nbsp;&bull;&nbsp; Your work. Your earnings.
        </div>

        {/* Official Guideline Sample Video Modal */}
        {sampleVideoOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-[#FFF9FB] dark:bg-[#1A1520] rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#FBCFE8] dark:border-[#421A2E] max-h-[90vh] overflow-y-auto text-neutral-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-[#FBCFE8]/60 dark:border-[#3D182A] pb-3">
                <div>
                  <h4 className="font-serif text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                    {sampleVideoTitle || 'Official Sample Guideline'}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                    Reference recording for quality & framing standards
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSampleVideoOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
                {sampleVideoLoading && !sampleVideoUrl ? (
                  <div className="flex items-center justify-center text-white text-xs gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Loading official sample guideline video...</span>
                  </div>
                ) : (
                  <video
                    key={sampleVideoUrl || 'default-sample'}
                    src={sampleVideoUrl || '/api/videos/sample/stream'}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLVideoElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.sample-fallback')) {
                        const msg = document.createElement('div');
                        msg.className = 'sample-fallback flex items-center justify-center h-full text-white text-xs font-medium text-center p-4';
                        msg.textContent = 'Official sample guideline not yet uploaded. Visit the Guidelines page for reference material.';
                        parent.appendChild(msg);
                      }
                    }}
                  />
                )}
              </div>

              <div className="bg-[#FCE7F0] dark:bg-[#2C1523] p-3.5 sm:p-4 rounded-xl space-y-1 text-[11px] sm:text-xs text-neutral-900 dark:text-neutral-100 font-medium">
                <div className="font-bold uppercase tracking-wider text-[10px] text-[#9D174D] dark:text-[#F472B6]">
                  Guideline Checklist
                </div>
                <ul className="space-y-1">
                  <li>&bull; Natural thigh-flapping lap clapping — Knee length skirts worn</li>
                  <li>&bull; Crisp gum-chewing</li>
                  <li>&bull; Quiet room — zero background TV, fan, or traffic noise</li>
                  <li>&bull; Faceless framing — no face or identifying features visible</li>
                  <li>&bull; Minimum 30 seconds (30s) runtime for sample audition</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/creator/guidelines"
                  target="_blank"
                  className="text-[11px] sm:text-xs font-bold text-neutral-900 dark:text-white hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Specifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSampleVideoOpen(false)}
                  className="px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-[11px] sm:text-xs font-bold hover:bg-neutral-800 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Preview Modal */}
        {activePreviewUrl && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-[#FFF9FB] dark:bg-[#1A1520] rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#FBCFE8] dark:border-[#421A2E] text-neutral-900 dark:text-white">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  Video Playback Preview
                </h4>
                <button
                  type="button"
                  onClick={() => setActivePreviewUrl(null)}
                  className="p-1 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <video
                  src={activePreviewUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium text-center">
                Private local preview. Check audio clarity, background silence, and framing before uploading.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
