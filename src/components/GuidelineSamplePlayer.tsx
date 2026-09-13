'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  UploadCloud,
  FileVideo,
  X,
} from 'lucide-react';
import { GuidelineSample } from '@/types';

interface GuidelineSamplePlayerProps {
  isAdmin?: boolean;
  onSampleUpdated?: () => void;
}

export default function GuidelineSamplePlayer({ isAdmin = false, onSampleUpdated }: GuidelineSamplePlayerProps) {
  const [samples, setSamples] = useState<GuidelineSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<GuidelineSample | null>(null);

  // Official guideline sample video URL (fetched from admin-managed DB)
  const [guidelineSampleUrl, setGuidelineSampleUrl] = useState<string>('');
  const [guidelineSampleTitle, setGuidelineSampleTitle] = useState<string>('');

  // Client hydration flag for portals
  const [mounted, setMounted] = useState(false);

  // Admin upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newDuration, setNewDuration] = useState('180');
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError('');

    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      const objUrl = URL.createObjectURL(file);
      v.src = objUrl;
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(objUrl);
        if (v.duration && !isNaN(v.duration)) {
          setNewDuration(Math.round(v.duration).toString());
        }
      };
    } catch {}

    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_admin_sample', 'true');
      formData.append('is_sample', 'true');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (res.status === 413 || text.includes('Request Entity Too Large')) {
          throw new Error('Video file exceeds server proxy size limit. Please enter the video URL directly or use a smaller file.');
        }
        throw new Error(text.slice(0, 120) || 'Failed to upload video file.');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to upload video file.');

      setNewVideoUrl(data.fileUrl || data.streamUrl || data.previewUrl || '');
      if (data.durationSeconds) {
        setNewDuration(Math.round(data.durationSeconds).toString());
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading video file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const loadSamples = async () => {
    try {
      const res = await fetch('/api/guidelines/samples');
      const data = await res.json();
      if (data.samples && data.samples.length > 0) {
        const validSamples = data.samples.filter(
          (s: any) =>
            s.id !== 'b0000000-0000-4000-8000-000000000001' &&
            !s.video_url?.includes('ForBiggerBlazes.mp4') &&
            !s.title?.includes('Official Reference: Faceless Page-Turning ASMR Sample') &&
            Boolean(s.video_url)
        );

        setSamples(validSamples);
        setSelectedSample(validSamples[0] || null);
      } else {
        setSamples([]);
        setSelectedSample(null);
      }
    } catch (e) {
      console.error('Failed to load guideline samples', e);
      setSamples([]);
      setSelectedSample(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoError = () => {
    // If video fails to load, mark selectedSample video as invalid
    setSelectedSample(null);
  };

  useEffect(() => {
    loadSamples();
    const handleUpdate = () => loadSamples();
    window.addEventListener('guideline-sample-updated', handleUpdate);
    return () => window.removeEventListener('guideline-sample-updated', handleUpdate);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showUploadModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUploadModal(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUploadModal]);

  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadError('');

    try {
      const res = await fetch('/api/guidelines/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          video_url: newVideoUrl,
          duration_seconds: parseInt(newDuration, 10) || 180,
          file_name: 'admin_guideline_reference.mp4',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setShowUploadModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewVideoUrl('');
      loadSamples();
      window.dispatchEvent(new CustomEvent('guideline-sample-updated'));
      if (onSampleUpdated) onSampleUpdated();
    } catch (err: any) {
      setUploadError(err.message || 'Error saving sample.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-md border border-neutral-200 animate-pulse flex items-center justify-center min-h-[300px]">
        <div className="text-xs text-black font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin text-black" />
          <span>Loading official reference video...</span>
        </div>
      </div>
    );
  }

  if (!selectedSample && !isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-md border border-neutral-200 overflow-hidden space-y-0 text-black shadow-sm">
      {/* Header Bar */}
      <div className="bg-black text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg sm:text-2xl font-bold text-white">
            {selectedSample?.title || 'Page Turning Sample Reference'}
          </h3>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-white text-black hover:bg-neutral-100 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" />
            <span>Upload Reference Sample</span>
          </button>
        )}
      </div>

      {/* Video Viewport Container */}
      <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
        {selectedSample ? (
          <video
            key={selectedSample.video_url || selectedSample.id}
            src={selectedSample.video_url || '/api/videos/sample/stream'}
            playsInline
            controls
            onError={handleVideoError}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center text-white p-8 space-y-2">
            <FileVideo className="w-12 h-12 mx-auto text-neutral-400 opacity-60" />
            <p className="text-sm font-medium">No official video configured in database.</p>
          </div>
        )}
      </div>

      {/* Multiple Sample Selector (if more than 1 sample is published) */}
      {samples.length > 1 && (
        <div className="flex items-center gap-2 p-3 bg-neutral-100 border-b border-neutral-200 overflow-x-auto text-xs font-medium">
          <span className="text-[10px] uppercase font-bold text-neutral-500 shrink-0">Sample Versions:</span>
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSample(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedSample?.id === s.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-black hover:bg-neutral-200 border border-neutral-300'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Details Footer */}
      <div className="p-6 space-y-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div className="font-serif text-xl font-bold text-black">
            Page Turning ASMR Standards
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
          {selectedSample?.description ||
            'Demonstration of authentic page-turning ASMR featuring clear paper whispering sounds, long press nails gently turning pages of a book, stationary overhead camera framing, and completely silent background.'}
        </p>

        <div className="space-y-1 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
          <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
            <span>•</span>
            <span>Platform Specification Standards</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed font-medium">
            Submissions must maintain continuous, calming page-turning acoustics for at least <strong>3 minutes (180 seconds)</strong>. Once 8 approved videos are accumulated, you are eligible to withdraw your <strong>$400+ payout</strong> directly to your designated bank account.
          </p>
        </div>
      </div>

      {/* Admin Upload Modal */}
      {showUploadModal && mounted && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden"
          onClick={() => setShowUploadModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-reference-modal-title"
        >
          <div
            className="bg-[#fff9fb] rounded-xl max-w-lg w-full max-w-[calc(100vw-24px)] shadow-2xl border border-[#f2e3e8] flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden my-auto animate-fade-in text-neutral-900 min-w-0 box-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f2e3e8] px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-[#fff9fb] gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h3 id="upload-reference-modal-title" className="font-serif text-base sm:text-lg font-bold text-neutral-900 leading-snug break-words">
                  Upload Guideline Reference Video
                </h3>
                <p className="text-[11px] text-neutral-500 hidden sm:block truncate">
                  Publish an official benchmark video for page-turning creators.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 -mr-1 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-lg transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-neutral-700" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAdminUpload} className="flex flex-col flex-1 overflow-hidden bg-[#fff9fb] min-w-0">
              <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 flex-1 text-left bg-[#fff9fb] min-w-0">
                {uploadError && (
                  <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium break-words">
                    {uploadError}
                  </div>
                )}

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                    Sample Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Master Reference: Crisp Page Whispering & Long Press Nails"
                    className="w-full max-w-full min-w-0 px-3 py-1.5 sm:py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white text-neutral-900 box-border"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                    Upload Video File (.mp4 or .mov)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 max-w-full">
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      disabled={uploadingFile || saving}
                      onChange={handleFileSelect}
                      className="w-full max-w-full min-w-0 text-xs overflow-hidden file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-black file:text-white hover:file:bg-neutral-800 cursor-pointer disabled:opacity-50"
                    />
                    {uploadingFile && (
                      <span className="text-[11px] text-neutral-700 font-bold animate-pulse shrink-0 flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 break-words">
                    Or provide an external stream/video URL directly below.
                  </p>
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                    Video URL (or Stream Path)
                  </label>
                  <input
                    type="text"
                    required
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://.../video.mp4 or auto-filled from file upload"
                    className="w-full max-w-full min-w-0 px-3 py-1.5 sm:py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white text-neutral-900 box-border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0 max-w-full">
                  <div className="min-w-0">
                    <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                      Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      min="30"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full max-w-full min-w-0 px-3 py-1.5 sm:py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white text-neutral-900 box-border"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                      Category
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Page Turning"
                      className="w-full max-w-full min-w-0 px-3 py-1.5 sm:py-2 rounded-lg border border-neutral-300 text-xs bg-neutral-100 text-neutral-700 font-medium truncate box-border"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 truncate">
                    Editorial Guidance Notes / Audio Description
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Explain the camera angle, quietness, nail contact acoustics, and page pacing..."
                    className="w-full max-w-full min-w-0 px-3 py-1.5 sm:py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white text-neutral-900 resize-none box-border"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[#f2e3e8] px-4 py-3 sm:px-6 sm:py-3.5 bg-[#fdf2f6] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0 rounded-b-xl min-w-0">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-200 transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="w-full sm:w-auto px-4 py-2 sm:py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-center"
                >
                  {saving ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish to Guidelines</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
