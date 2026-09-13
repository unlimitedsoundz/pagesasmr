'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ArrowRight,
  FileText,
  BookOpen,
  Lock,
  FileVideo,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useUpload } from '@/components/UploadProvider';
import WatchOfficialSampleModal from '@/components/WatchOfficialSampleModal';
import { supabase } from '@/lib/supabase';
import { SampleStatus } from '@/types';

export default function CreatorUploadPage() {
  const router = useRouter();
  const { toast } = useToast() as any;
  const { startUpload, uploadState } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditionFileInputRef = useRef<HTMLInputElement>(null);

  // Profile & Audition Gate State
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('NOT_SUBMITTED');
  const [sampleReviewNotes, setSampleReviewNotes] = useState<string | null>(null);
  const [sampleSubmission, setSampleSubmission] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  // Audition 30s Upload State
  const [auditionFile, setAuditionFile] = useState<File | null>(null);
  const [auditionDuration, setAuditionDuration] = useState<number | null>(null);
  const [auditionNotes, setAuditionNotes] = useState('');
  const [auditionError, setAuditionError] = useState('');

  // Full Video Upload State (Unlocked after audition approval)
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreementSigned, setAgreementSigned] = useState<boolean | null>(null);

  // Load creator status
  const loadCreatorStatus = useCallback(async () => {
    try {
      const [sampleRes, statsRes, agreementRes] = await Promise.all([
        fetch('/api/creator/sample', { cache: 'no-store' }),
        fetch('/api/creator/stats', { cache: 'no-store' }),
        fetch('/api/creator/agreement', { cache: 'no-store' }),
      ]);

      if (sampleRes.ok) {
        const sampleData = await sampleRes.json();
        setSampleStatus(sampleData.sample_status || 'NOT_SUBMITTED');
        setSampleReviewNotes(sampleData.sample_review_notes || null);
        setSampleSubmission(sampleData.submission || null);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || null);
        if (statsData.profile?.sample_status) {
          setSampleStatus(statsData.profile.sample_status);
        }
      }

      if (agreementRes.ok) {
        const agreementData = await agreementRes.json();
        setAgreementSigned(Boolean(agreementData.signed));
      }
    } catch (e) {
      console.error('Failed to load creator audition status:', e);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadCreatorStatus();

    // 1. Cross-tab instant broadcast sync
    let broadcastChan: BroadcastChannel | null = null;
    try {
      broadcastChan = new BroadcastChannel('asmr_submissions_sync');
      broadcastChan.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'AUDITION_REVIEWED' || msg.type === 'SUBMISSION_REVIEWED') {
          loadCreatorStatus();
        }
      };
    } catch { }

    // 2. Supabase Realtime broadcast channel
    let realtimeChan: any = null;
    try {
      realtimeChan = supabase
        .channel('creator-upload-sync')
        .on('broadcast', { event: 'audition_reviewed' }, () => {
          loadCreatorStatus();
        })
        .subscribe();
    } catch { }

    return () => {
      if (broadcastChan) broadcastChan.close();
      if (realtimeChan) supabase.removeChannel(realtimeChan);
    };
  }, [loadCreatorStatus]);

  // Handle 30-second audition file selection
  const handleAuditionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isMp4OrMov =
      selected.name.toLowerCase().endsWith('.mp4') || selected.name.toLowerCase().endsWith('.mov');
    if (!isMp4OrMov) {
      setAuditionError('Please select an MP4 or MOV video file for your audition sample.');
      toast.error('Only MP4 and MOV formats are accepted.', 'Invalid File Format');
      return;
    }

    setAuditionFile(selected);
    setAuditionError('');

    const url = URL.createObjectURL(selected);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = Math.round(video.duration);
      setAuditionDuration(dur);
    };
  };

  // Submit 30-second audition sample (Unpaid)
  const handleAuditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (agreementSigned === false) {
      setAuditionError('Please review and sign the Creator Agreement before uploading.');
      toast.warning('Creator Agreement signature required before uploading.');
      router.push('/creator/agreement');
      return;
    }
    if (!auditionFile) {
      setAuditionError('Please select a 30-second audition sample video.');
      return;
    }

    setAuditionError('');

    try {
      await startUpload(auditionFile, {
        title: '30s Audition Sample',
        durationSeconds: auditionDuration || 30,
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

  // Handle full video file selection (3+ min)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isMp4OrMov =
      selected.name.toLowerCase().endsWith('.mp4') || selected.name.toLowerCase().endsWith('.mov');
    if (!isMp4OrMov) {
      setErrorMsg('Please select an MP4 or MOV video file.');
      toast.error('Only MP4 and MOV formats are accepted.', 'Invalid File Format');
      return;
    }

    setFile(selected);
    setErrorMsg('');

    if (!title) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const url = URL.createObjectURL(selected);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = Math.round(video.duration);
      setDuration(dur);

      if (dur < 180) {
        setErrorMsg(
          `Detected video duration is only ${Math.floor(dur / 60)}m ${dur % 60}s (${dur}s). Full recordings must be at least 3 minutes (180s) to be approved.`
        );
      } else {
        setErrorMsg('');
      }
    };
  };

  // Submit full 3+ minute paid video ($50 USD)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (agreementSigned === false) {
      setErrorMsg('Please review and sign the Creator Agreement before uploading.');
      toast.warning('Creator Agreement signature required before uploading.');
      router.push('/creator/agreement');
      return;
    }
    if (!file) {
      setErrorMsg('Please select a video file.');
      return;
    }

    if (!consentConfirmed || !isAdultConfirmed) {
      setErrorMsg('You must agree to the copyright ownership and 18+ age verification terms.');
      return;
    }

    setErrorMsg('');

    try {
      await startUpload(file, {
        title: title.trim(),
        category: 'PAGE_TURNING',
        durationSeconds: duration || 180,
        notes: notes.trim(),
        consentConfirmed: true,
        isSample: false,
      });

      setFile(null);
      setTitle('');
      setNotes('');
      router.push('/creator/videos');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading video');
    }
  };

  const isApproved = sampleStatus === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-12 space-y-8 text-black">
      {/* Page Header */}
      <div className="border-b border-neutral-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-black">
            Upload Page-Turning Videos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
            Complete the 2-step verification: submit a 30s audition sample, then produce your 8 full videos ($50 USD each, $400 milestone).
          </p>
        </div>
        <button
          onClick={() => loadCreatorStatus()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-50 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Official Benchmark Video Guideline Modal Trigger */}
      <WatchOfficialSampleModal />

      {/* Creator Agreement Required Banner (When agreementSigned === false) */}
      {agreementSigned === false && (
        <div className="bg-[#130E14] text-white rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm border-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-medium text-base sm:text-lg text-white">
                  Creator Production Agreement Required
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#7b1e4b] text-white tracking-wider">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed max-w-3xl font-normal">
                Before uploading audition samples or full video productions, you must review and electronically sign The Pink Room Creator Agreement. This confirms your compliance with our original recording standards, faceless framing, and rate terms ($50.00 USD per approved video).
              </p>
            </div>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            <div className="text-xs text-white/70 flex items-center gap-2 font-normal">
              <Lock className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span>Video submissions remain locked until your legal signature is executed.</span>
            </div>
            <Link
              href="/creator/agreement"
              className="px-5 py-2.5 rounded-full bg-[#7b1e4b] text-white hover:bg-[#68173e] transition-colors text-xs font-bold inline-flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
            >
              <span>Review & Sign Agreement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* STEP 1: 30-SECOND AUDITION SAMPLE GATE CARD */}
      <div className="bg-white rounded-2xl border-2 border-black p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Step 1 of 2 • Quality Audition Gate
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-black flex items-center gap-2 mt-0.5">
              <span>30-Second Audition Sample</span>
              {isApproved && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black text-white text-xs font-bold font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Approved</span>
                </span>
              )}
            </h2>
          </div>
            <div className="text-xs bg-[#FDF2F4] text-[#7B1E4B] px-3.5 py-1.5 rounded-full font-bold border-0">
              Target Duration: <strong>30 to 60 Seconds</strong>
            </div>
        </div>

        <p className="text-xs sm:text-sm text-black leading-relaxed font-medium">
          Just like on our main platform, all creators must first submit an <strong>unpaid 30-second sample</strong> demonstrating crisp page-turning acoustics, clear mic proximity, and zero background room noise (TV, fan, or street audio). Once verified and approved by an administrator, you proceed immediately to record and submit your <strong>8 full paid videos</strong> ($50.00 USD each, toward your $400 milestone payout).
        </p>

        {/* Status: APPROVED Banner */}
        {isApproved && (
          <div className="p-5 rounded-2xl bg-[#130E14] text-white border-0 flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-serif font-medium text-sm text-white">
                Audition Approved — Full 8-Video Production Unlocked 🎉
              </div>
              <p className="text-xs text-white/80 font-normal leading-relaxed">
                {sampleReviewNotes || 'Your 30-second audition meets our page-turning acoustic standard! You are cleared to record and upload your 8 full paid videos ($50.00 each) below.'}
              </p>
            </div>
          </div>
        )}

        {/* Status: PENDING_REVIEW Banner */}
        {sampleStatus === 'PENDING_REVIEW' && (
          <div className="bg-[#130E14] text-white border-0 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 font-serif text-lg font-medium text-white">
              <Clock className="w-5 h-5 text-white animate-spin" />
              <span>Audition Sample Under Administrative Review</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
              Your 30-second audition sample has been received and queued for administrative evaluation. Our reviewers verify page-turning acoustics, whisper/mic clarity, and zero background noise. You will receive an in-app notification as soon as it is approved so you can begin uploading your 8 full videos.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-white/90 font-bold">
              <span>• Status: PENDING REVIEW</span>
              <span>• Average turnaround: ~1-2 hours</span>
            </div>
          </div>
        )}

        {/* Status: REVISION_REQUESTED Banner */}
        {sampleStatus === 'REVISION_REQUESTED' && (
          <div className="bg-[#130E14] text-white border-0 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 font-serif text-lg font-medium text-white">
              <AlertCircle className="w-5 h-5 text-white" />
              <span>Audition Revision Requested</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
              <strong>Admin Feedback:</strong> {sampleReviewNotes || 'Please record in a quieter room with slower, crisper page turning.'}
            </p>
            <p className="text-xs text-white font-semibold">
              Please review the feedback above, record an updated 30-second sample addressing the notes, and re-submit below.
            </p>
          </div>
        )}

        {/* Status: REJECTED Banner */}
        {sampleStatus === 'REJECTED' && (
          <div className="bg-[#130E14] text-white border-0 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 font-serif text-lg font-medium text-red-400">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Audition Sample Not Approved</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
              <strong>Admin Reason:</strong> {sampleReviewNotes || 'The sample did not meet acoustic or framing guidelines.'}
            </p>
            <p className="text-xs text-white font-semibold">
              You may record and submit a new 30-second sample following our official guidelines.
            </p>
          </div>
        )}

        {/* Audition Upload Form (shown if not yet approved) */}
        {!isApproved && sampleStatus !== 'PENDING_REVIEW' && (
          <form onSubmit={handleAuditionSubmit} className="space-y-4 pt-2">
            <h3 className="font-serif text-base font-bold text-black flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-black" />
              <span>
                {sampleStatus === 'REVISION_REQUESTED' || sampleStatus === 'REJECTED'
                  ? 'Upload Corrected 30-Second Audition Video'
                  : 'Select 30-Second Audition Video'}
              </span>
            </h3>

            {auditionError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-800 shrink-0" />
                <span>{auditionError}</span>
              </div>
            )}

            <input
              ref={auditionFileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              onChange={handleAuditionFileChange}
              className="hidden"
            />

            <div
              onClick={() => auditionFileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-black rounded-xl p-6 text-center cursor-pointer transition-colors bg-neutral-50 text-black overflow-hidden w-full"
            >
              <UploadCloud className="w-8 h-8 mx-auto text-black mb-2" />
              <div className="text-xs font-bold text-black truncate max-w-full px-2" title={auditionFile?.name}>
                {auditionFile ? auditionFile.name : 'Click to choose your 30-second audition video'}
              </div>
              <div className="text-[11px] text-neutral-600 font-medium mt-1">
                MP4 or MOV • Minimum 30 seconds • Max 100MB • Fast Auto-Compression Included
              </div>
              {auditionDuration !== null && (
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF2F4] text-[#7B1E4B] border-0">
                  <Clock className="w-3 h-3 text-[#7B1E4B]" />
                  <span>Duration: {auditionDuration}s</span>
                  {auditionDuration >= 30 && <span>• Valid</span>}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-black">
                Audition Notes (Optional)
              </label>
              <input
                type="text"
                value={auditionNotes}
                onChange={(e) => setAuditionNotes(e.target.value)}
                placeholder="e.g. Vintage hardback book, silent recording booth, whispering intro..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
              />
            </div>

            {uploadState.isUploading && uploadState.isSample && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-black">
                  <span>{uploadState.phase}</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploadState.isUploading || !auditionFile}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#7b1e4b] text-white font-bold hover:bg-[#68173e] disabled:opacity-50 transition-colors text-xs flex items-center justify-center gap-2 shadow-md"
            >
              {uploadState.isUploading && uploadState.isSample ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting Audition Sample ({uploadState.progress}%)</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Submit 30-Second Audition for Review (Free)</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* STEP 2: FULL 3+ MINUTE VIDEO UPLOAD PORTAL (LOCKED IF NOT APPROVED) */}
      {!isApproved ? (
        <div className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mx-auto border border-neutral-300 shadow-sm">
            <Lock className="w-7 h-7 text-black" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Step 2 of 2 • Currently Locked
            </div>
            <h3 className="font-serif text-2xl font-bold text-black">
              Full 3+ Minute Video Upload Portal
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              Once your 30-second audition sample is approved above by an administrator, this portal will automatically unlock so you can begin uploading your <strong>8 full paid videos ($50.00 each)</strong> toward your $400 milestone payout!
            </p>
          </div>
        </div>
      ) : (
        /* UNLOCKED STEP 2: FULL 3+ MINUTE PRODUCTION UPLOAD FORM */
        <div className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Step 2 of 2 • Full Production Portal
            </div>
            <h2 className="font-serif text-2xl font-bold text-black">
              Upload Paid Video ($50.00 USD)
            </h2>
            <p className="text-xs text-neutral-600 font-medium mt-0.5">
              Record 3+ minutes of pristine page turning. Each approved video earns $50.00 USD toward your 8-video milestone ($400).
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Upload Notice</div>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed cursor-pointer text-center space-y-4 transition-colors ${file
                  ? 'border-black bg-neutral-50'
                  : 'border-neutral-300 bg-white hover:border-black hover:bg-neutral-50'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-black border border-neutral-200">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <div className="font-serif text-lg font-bold text-black">
                  {file ? file.name : 'Select or drop your full 3+ minute video file here'}
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  MP4 or MOV • Minimum duration 3 minutes (180s+) • Max 500MB • Auto-Compressed
                </p>
              </div>

              {duration !== null && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${duration >= 180
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Detected Duration: {Math.floor(duration / 60)}m {duration % 60}s ({duration}s)
                  </span>
                  {duration >= 180 && <span>• Valid</span>}
                </div>
              )}
            </div>

            {/* Video Metadata Form */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-black">
                  Video Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vintage Leather Journal - Soft Paper Smoothing & Turning"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-black">
                  Notes for Reviewer (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Recorded with blue press nails on vintage sketch paper in silent studio room..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Verification & Consent Checkboxes */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-4">
              <div className="font-bold text-sm text-black flex items-center gap-2">
                <Shield className="w-4 h-4 text-black" />
                <span>Creator Declarations</span>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={isAdultConfirmed}
                  onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black mt-0.5 accent-black"
                />
                <span className="text-xs text-black font-medium leading-relaxed">
                  I certify that I am at least 18 years of age and hold legal capacity to participate as a creator on The Pink Room.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black mt-0.5 accent-black"
                />
                <span className="text-xs text-black font-medium leading-relaxed">
                  I declare this recording is 100% original, filmed by me in a quiet acoustic space, and meets all Recording Guidelines.
                </span>
              </label>
            </div>

            {/* Progress bar during upload */}
            {uploadState.isUploading && !uploadState.isSample && (
              <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex justify-between text-xs font-bold text-black">
                  <span>{uploadState.phase}</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
                  <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit CTA */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={uploadState.isUploading || !file || !consentConfirmed || !isAdultConfirmed}
                className="inline-flex items-center px-8 py-3.5 rounded-full bg-[#7b1e4b] text-white font-bold hover:bg-[#68173e] transition-colors shadow-md disabled:opacity-50 text-sm"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                <span>{uploadState.isUploading ? 'Uploading Video...' : 'Submit Full Video for $50 Review'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
