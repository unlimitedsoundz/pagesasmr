'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, X, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';

interface WatchOfficialSampleModalProps {
  className?: string;
}

export default function WatchOfficialSampleModal({ className = '' }: WatchOfficialSampleModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sampleUrl, setSampleUrl] = useState<string>('');
  const [sampleTitle, setSampleTitle] = useState<string>('Official Sample Guideline: Page Turning');
  const [sampleDesc, setSampleDesc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  const fetchGuidelineSample = async () => {
    try {
      setLoading(true);
      setPlaybackError(false);
      const res = await fetch('/api/guidelines/samples', { cache: 'no-store' });
      const data = await res.json();
      if (data.samples && data.samples.length > 0) {
        setSamples(data.samples);
        const s = data.samples[0];
        setSampleUrl(s.video_url || '/api/videos/sample/stream');
        if (s.title) {
          setSampleTitle(s.title.replace(/benchmark/gi, 'Guideline'));
        }
        if (s.description) {
          setSampleDesc(s.description);
        }
      }
    } catch (e) {
      console.error('Failed to load official sample', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelineSample();
    const handleUpdate = () => fetchGuidelineSample();
    window.addEventListener('guideline-sample-updated', handleUpdate);
    return () => window.removeEventListener('guideline-sample-updated', handleUpdate);
  }, []);

  const selectSample = (idx: number) => {
    if (!samples[idx]) return;
    setSelectedIndex(idx);
    setPlaybackError(false);
    const s = samples[idx];
    setSampleUrl(s.video_url || '/api/videos/sample/stream');
    if (s.title) setSampleTitle(s.title.replace(/benchmark/gi, 'Guideline'));
    if (s.description) setSampleDesc(s.description);
  };

  const handleVideoError = () => {
    // If the currently selected sample failed and there are other samples, auto-try next
    if (samples.length > 1 && selectedIndex + 1 < samples.length) {
      selectSample(selectedIndex + 1);
    } else if (sampleUrl !== '/api/videos/sample/stream') {
      setSampleUrl('/api/videos/sample/stream');
    } else {
      setPlaybackError(true);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setPlaybackError(false);
    fetchGuidelineSample();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on Escape key and lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={className}>
      {/* === WATCH OFFICIAL SAMPLE — PROMINENT BANNER === */}
      <button
        type="button"
        onClick={handleOpen}
        data-official-sample-banner="true"
        className="official-sample-banner w-full bg-neutral-950 dark:bg-[#161619] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900 dark:hover:bg-[#1f1f24] active:scale-[0.99] transition-all group text-left border border-neutral-800 dark:border-[#2E2E38] shadow-md hover:shadow-xl rounded-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#7b1e4b] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-md rounded-full">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-lg sm:text-2xl font-bold text-white tracking-tight">
                Watch the Official Sample Guideline
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7b1e4b] text-white uppercase tracking-wide">
                Official Reference
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 dark:text-neutral-400 font-medium">
              See exactly what a passing page-turning submission looks, sounds, and frames like before you record.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="px-5 py-2.5 bg-[#7b1e4b] hover:bg-[#68173e] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm rounded-full">
            <Play className="w-3.5 h-3.5 fill-white" />
            Play Sample Now
          </span>
        </div>
      </button>

      {/* === OFFICIAL SAMPLE MODAL === */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#fff9fb] rounded-2xl max-w-2xl w-full max-w-[calc(100vw-24px)] p-4 sm:p-6 space-y-4 shadow-2xl border border-[#f2e3e8] max-h-[92vh] overflow-y-auto overflow-x-hidden text-neutral-900 min-w-0 box-border">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#f2e3e8] pb-3 gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h4 className="font-serif text-lg sm:text-xl font-bold text-neutral-900 break-words">
                  {sampleTitle || 'Official Sample Guideline: Page Turning'}
                </h4>
                <p className="text-xs text-neutral-600 font-medium mt-0.5 break-words">
                  Reference recording for audio quality, camera framing, & tempo standards
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-200 transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multiple samples switcher tabs (if admin uploaded more than 1 reference) */}
            {samples.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 min-w-0 touch-pan-x scrollbar-none">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">
                  Samples:
                </span>
                {samples.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => selectSample(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                      selectedIndex === idx
                        ? 'bg-black text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Sample {idx + 1}{s.duration_seconds ? ` (${s.duration_seconds}s)` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-neutral-800 shadow-inner max-w-full">
              {loading && !sampleUrl ? (
                <div className="flex items-center justify-center text-white text-xs gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Loading official sample guideline video...</span>
                </div>
              ) : playbackError ? (
                <div className="flex flex-col items-center justify-center h-full text-white text-xs font-medium text-center p-4 sm:p-6 space-y-2">
                  <div className="text-sm font-bold text-neutral-200">Sample Preview Pending</div>
                  <p className="text-neutral-400 max-w-sm text-xs break-words">
                    Official sample video not yet uploaded by admin. Review the checklist below and visit the Recording Guidelines for specifications.
                  </p>
                </div>
              ) : (
                <video
                  key={sampleUrl || 'default-sample'}
                  src={sampleUrl || '/api/videos/sample/stream'}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onError={handleVideoError}
                />
              )}
            </div>

            {/* Video Description (if provided) */}
            {sampleDesc && (
              <p className="text-xs text-neutral-700 leading-relaxed font-medium bg-[#f8e2ec] p-3 rounded-xl border-0 break-words max-w-full">
                {sampleDesc}
              </p>
            )}

            {/* Guideline Checklist */}
            <div className="bg-[#f8e2ec] p-3.5 sm:p-4 rounded-xl border-0 space-y-2 text-xs text-neutral-900 font-medium break-words max-w-full min-w-0">
              <div className="font-bold uppercase tracking-wider text-[11px] text-neutral-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Page Turning Submission Checklist</span>
              </div>
              <ul className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-black dark:text-white font-bold">•</span>
                  <span><strong>Clear acoustic paper sounds:</strong> Gentle paper whispering, page smoothing, and page turns.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black dark:text-white font-bold">•</span>
                  <span><strong>Completely quiet room:</strong> Zero background television bleed, conversation, traffic, or loud AC hum.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black dark:text-white font-bold">•</span>
                  <span><strong>Faceless framing:</strong> Focus solely on hands, reading material, and gentle turning actions. No faces visible.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black dark:text-white font-bold">•</span>
                  <span><strong>Stationary camera setup:</strong> Tripod or fixed stand overlooking reading surface. No handheld camera movements.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black dark:text-white font-bold">•</span>
                  <span><strong>Duration:</strong> At least <strong>3 minutes (180 seconds)</strong> unbroken runtime.</span>
                </li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <Link
                href="/guidelines"
                className="text-xs text-black dark:text-white hover:underline font-bold flex items-center gap-1 self-start sm:self-auto"
                onClick={handleClose}
              >
                <span>View full guidelines & standards</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
