'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import * as tus from 'tus-js-client';
import { useToast } from './ToastProvider';
import { supabase } from '@/lib/supabase';

export interface UploadMetadata {
  title: string;
  notes?: string;
  durationSeconds: number;
  isSample?: boolean;
  consentConfirmed?: boolean;
  category?: string;
}

export type UploadPhaseStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'UPLOADING'
  | 'PAUSED'
  | 'RECONNECTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'ERROR';

export interface UploadTaskState {
  isUploading: boolean;
  submissionId?: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  transferredBytes: number;
  progress: number;
  phase: string;
  status: UploadPhaseStatus;
  error: string | null;
  isSample: boolean;
  isMinimized: boolean;
}

interface UploadContextType {
  uploadState: UploadTaskState;
  startUpload: (file: File, meta: UploadMetadata, options?: { submissionId?: string }) => Promise<any>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelUpload: () => void;
  toggleMinimize: () => void;
  dismissToast: () => void;
  savedIncompleteUpload: { submissionId: string; title: string; fileName: string; isSample: boolean } | null;
  clearSavedIncompleteUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const LOCAL_STORAGE_ACTIVE_KEY = 'pinkroom_pages_active_video_upload';

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast() as any;

  const tusUploadRef = useRef<tus.Upload | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const activeFileRef = useRef<File | null>(null);

  const [uploadState, setUploadState] = useState<UploadTaskState>({
    isUploading: false,
    title: '',
    fileName: '',
    fileSizeBytes: 0,
    transferredBytes: 0,
    progress: 0,
    phase: '',
    status: 'IDLE',
    error: null,
    isSample: false,
    isMinimized: false,
  });

  const [savedIncompleteUpload, setSavedIncompleteUpload] = useState<{
    submissionId: string;
    title: string;
    fileName: string;
    isSample: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.submissionId && parsed.fileName) {
          setSavedIncompleteUpload(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadState.isUploading && (uploadState.status === 'UPLOADING' || uploadState.status === 'VERIFYING')) {
        e.preventDefault();
        e.returnValue = 'A video upload is currently in progress. Navigating away will pause your upload.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadState.isUploading, uploadState.status]);

  const toggleMinimize = () => {
    setUploadState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  const dismissToast = () => {
    if (uploadState.isUploading) {
      setUploadState((prev) => ({ ...prev, isMinimized: true }));
    } else {
      setUploadState({
        isUploading: false,
        title: '',
        fileName: '',
        fileSizeBytes: 0,
        transferredBytes: 0,
        progress: 0,
        phase: '',
        status: 'IDLE',
        error: null,
        isSample: false,
        isMinimized: false,
      });
    }
  };

  const pauseUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      setUploadState((prev) => ({
        ...prev,
        status: 'PAUSED',
        phase: `Upload paused at ${prev.progress}% (${(prev.transferredBytes / (1024 * 1024)).toFixed(1)} MB)`,
      }));
      toast.info('Video upload paused.');
    }
  };

  const resumeUpload = () => {
    if (tusUploadRef.current && activeFileRef.current) {
      setUploadState((prev) => ({
        ...prev,
        status: 'UPLOADING',
        phase: `Resuming transfer...`,
      }));
      tusUploadRef.current.start();
      toast.info('Resuming video upload...');
    }
  };

  const cancelUpload = () => {
    if (tusUploadRef.current) {
      try {
        tusUploadRef.current.abort(true);
      } catch {}
      tusUploadRef.current = null;
    }
    if (xhrRef.current) {
      try {
        xhrRef.current.abort();
      } catch {}
      xhrRef.current = null;
    }
    activeFileRef.current = null;

    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    } catch {}

    setUploadState({
      isUploading: false,
      title: '',
      fileName: '',
      fileSizeBytes: 0,
      transferredBytes: 0,
      progress: 0,
      phase: '',
      status: 'IDLE',
      error: 'Upload cancelled by user.',
      isSample: false,
      isMinimized: false,
    });
    setSavedIncompleteUpload(null);
    toast.info('Video upload cancelled.');
  };

  const clearSavedIncompleteUpload = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    } catch {}
    setSavedIncompleteUpload(null);
  };

  const startUpload = async (
    file: File,
    meta: UploadMetadata,
    options?: { submissionId?: string }
  ): Promise<any> => {
    if (uploadState.isUploading && (uploadState.status === 'UPLOADING' || uploadState.status === 'VERIFYING')) {
      const msg = 'Another video upload is currently in progress. Please wait for it to finish.';
      toast.warning(msg);
      throw new Error(msg);
    }

    const isSample = Boolean(meta.isSample);
    const title = meta.title.trim() || (isSample ? '30s Audition Sample' : file.name);
    activeFileRef.current = file;

    setUploadState({
      isUploading: true,
      submissionId: options?.submissionId,
      title,
      fileName: file.name,
      fileSizeBytes: file.size,
      transferredBytes: 0,
      progress: 0,
      phase: 'Initializing upload session...',
      status: 'QUEUED',
      error: null,
      isSample,
      isMinimized: false,
    });

    let submissionId = options?.submissionId;
    let tusEndpoint = '';
    let storageProvider = 'hostinger';

    try {
      const initRes = await fetch(isSample ? '/api/creator/sample' : '/api/submissions/init-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSample, title, durationSeconds: meta.durationSeconds }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize upload session with server.');
      }

      const initData = await initRes.json();
      submissionId = submissionId || initData.submissionId || (initData.submission && initData.submission.id);
      tusEndpoint = initData.tusEndpoint || process.env.NEXT_PUBLIC_MEDIA_URL || '';
      storageProvider = initData.storageProvider || 'hostinger';

      try {
        localStorage.setItem(
          LOCAL_STORAGE_ACTIVE_KEY,
          JSON.stringify({
            submissionId,
            title,
            fileName: file.name,
            fileSizeBytes: file.size,
            isSample,
            timestamp: Date.now(),
          })
        );
      } catch {}

      setUploadState((prev) => ({
        ...prev,
        submissionId,
        phase: 'Connecting to storage server...',
      }));
    } catch (initErr: any) {
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        status: 'ERROR',
        error: initErr.message || 'Initialization failed',
      }));
      toast.error(initErr.message || 'Initialization failed');
      throw initErr;
    }

    const useTus = tusEndpoint.startsWith('http');

    if (useTus) {
      return new Promise(async (resolve, reject) => {
        try {
          let authToken = '';
          try {
            const { data } = await supabase.auth.getSession();
            authToken = data?.session?.access_token ? `Bearer ${data.session.access_token}` : '';
          } catch {}

          const upload = new tus.Upload(file, {
            endpoint: tusEndpoint.endsWith('/') ? tusEndpoint : `${tusEndpoint}/`,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            chunkSize: 5 * 1024 * 1024,
            storeFingerprintForResuming: true,
            removeFingerprintOnSuccess: true,
            metadata: {
              filename: file.name,
              filetype: file.type || 'video/mp4',
              submission_id: submissionId || '',
              title,
              is_sample: String(isSample),
              platform_id: 'pinkroom_pages',
            },
            headers: authToken ? { Authorization: authToken } : {},
            onError: (error) => {
              console.error('[Pages TUS] Upload error:', error);
              const errText = error?.message || 'Network error during resumable video transfer.';
              setUploadState((prev) => ({
                ...prev,
                isUploading: false,
                status: 'ERROR',
                error: errText,
              }));
              toast.error(errText);
              reject(error);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100));
              const uploadedMb = (bytesUploaded / (1024 * 1024)).toFixed(1);
              const totalMb = (bytesTotal / (1024 * 1024)).toFixed(1);

              setUploadState((prev) => ({
                ...prev,
                transferredBytes: bytesUploaded,
                fileSizeBytes: bytesTotal,
                progress: pct,
                phase: `Uploading: ${uploadedMb} MB / ${totalMb} MB (${pct}%)`,
                status: 'UPLOADING',
              }));
            },
            onSuccess: async () => {
              setUploadState((prev) => ({
                ...prev,
                progress: 100,
                phase: 'Upload received. Verifying recording on server...',
                status: 'VERIFYING',
              }));

              try {
                const urlParts = upload.url?.split('/') || [];
                const uploadId = urlParts[urlParts.length - 1] || submissionId;
                const extension = file.name.toLowerCase().endsWith('.mov') ? '.mov' : '.mp4';
                const fileKey = `${uploadId}${extension}`;
                const fileUrl = `${tusEndpoint.replace(/\/files\/?$/, '')}/media/stream/${encodeURIComponent(fileKey)}`;

                const completeRes = await fetch('/api/submissions/complete-upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    submissionId,
                    title,
                    category: 'PAGE_TURNING',
                    durationSeconds: meta.durationSeconds,
                    fileUrl,
                    fileKey,
                    fileName: file.name,
                    fileSizeBytes: file.size,
                    notes: meta.notes,
                    consentConfirmed: meta.consentConfirmed ?? true,
                    isSample,
                    storageProvider: 'hostinger',
                  }),
                });

                if (!completeRes.ok) {
                  const compErr = await completeRes.json().catch(() => ({}));
                  throw new Error(compErr.error || 'Server error finalizing submission record.');
                }

                const subData = await completeRes.json();

                try {
                  localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
                } catch {}

                setUploadState({
                  isUploading: false,
                  submissionId,
                  title,
                  fileName: file.name,
                  fileSizeBytes: file.size,
                  transferredBytes: file.size,
                  progress: 100,
                  phase: 'Submitted for admin quality review!',
                  status: 'COMPLETED',
                  error: null,
                  isSample,
                  isMinimized: false,
                });

                toast.success(
                  isSample
                    ? 'Audition sample uploaded & submitted for admin review!'
                    : `"${title}" uploaded & submitted for quality inspection!`,
                  'Upload Successful'
                );

                tusUploadRef.current = null;
                activeFileRef.current = null;
                resolve(subData);
              } catch (err: any) {
                const errText = err.message || 'Error finalizing submission record.';
                setUploadState((prev) => ({
                  ...prev,
                  isUploading: false,
                  status: 'ERROR',
                  error: errText,
                }));
                toast.error(errText);
                reject(err);
              }
            },
          });

          tusUploadRef.current = upload;
          upload.start();
        } catch (err: any) {
          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            status: 'ERROR',
            error: err.message || 'Failed to start upload',
          }));
          reject(err);
        }
      });
    }

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      if (isSample) formData.append('is_sample', 'true');
      if (submissionId) formData.append('submission_id', submissionId);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (event.total / (1024 * 1024)).toFixed(1);
          setUploadState((prev) => ({
            ...prev,
            transferredBytes: event.loaded,
            fileSizeBytes: event.total,
            progress: pct,
            phase: `Uploading: ${loadedMb} MB / ${totalMb} MB (${pct}%)`,
            status: 'UPLOADING',
          }));
        }
      };

      xhr.upload.onload = () => {
        setUploadState((prev) => ({
          ...prev,
          progress: 100,
          phase: 'Upload received. Verifying recording on server...',
          status: 'VERIFYING',
        }));
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadRes = JSON.parse(xhr.responseText);
            const fileUrl = uploadRes.fileUrl;
            const fileKey = uploadRes.fileKey;
            const fileSizeBytes = uploadRes.fileSizeBytes || file.size;

            const completeRes = await fetch('/api/submissions/complete-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId,
                title,
                category: 'PAGE_TURNING',
                durationSeconds: meta.durationSeconds,
                fileUrl,
                fileKey,
                fileName: file.name,
                fileSizeBytes,
                notes: meta.notes,
                consentConfirmed: meta.consentConfirmed ?? true,
                isSample,
                width: uploadRes.width,
                height: uploadRes.height,
                storageProvider: uploadRes.storageProvider || storageProvider,
              }),
            });

            if (!completeRes.ok) {
              const compErr = await completeRes.json().catch(() => ({}));
              throw new Error(compErr.error || 'Failed to complete submission registration.');
            }

            const subData = await completeRes.json();

            try {
              localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
            } catch {}

            setUploadState({
              isUploading: false,
              submissionId,
              title,
              fileName: file.name,
              fileSizeBytes,
              transferredBytes: fileSizeBytes,
              progress: 100,
              phase: 'Submitted for admin quality review!',
              status: 'COMPLETED',
              error: null,
              isSample,
              isMinimized: false,
            });

            toast.success(
              isSample
                ? 'Audition sample uploaded & submitted for admin review!'
                : `"${title}" uploaded & submitted for quality inspection!`,
              'Upload Successful'
            );

            xhrRef.current = null;
            activeFileRef.current = null;
            resolve(subData);
          } catch (err: any) {
            const errText = err.message || 'Error completing submission registration.';
            setUploadState((prev) => ({
              ...prev,
              isUploading: false,
              status: 'ERROR',
              error: errText,
            }));
            toast.error(errText);
            xhrRef.current = null;
            reject(err);
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            const errText = res.error || `Upload failed with status ${xhr.status}`;
            setUploadState((prev) => ({
              ...prev,
              isUploading: false,
              status: 'ERROR',
              error: errText,
            }));
            toast.error(errText);
            xhrRef.current = null;
            reject(new Error(errText));
          } catch {
            const errText = `Upload failed with HTTP status ${xhr.status}`;
            setUploadState((prev) => ({
              ...prev,
              isUploading: false,
              status: 'ERROR',
              error: errText,
            }));
            toast.error(errText);
            xhrRef.current = null;
            reject(new Error(errText));
          }
        }
      };

      xhr.onerror = () => {
        const errText = 'Network connection failed during video upload.';
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          status: 'ERROR',
          error: errText,
        }));
        toast.error(errText);
        xhrRef.current = null;
        reject(new Error(errText));
      };

      xhr.send(formData);
    });
  };

  return (
    <UploadContext.Provider
      value={{
        uploadState,
        startUpload,
        pauseUpload,
        resumeUpload,
        cancelUpload,
        toggleMinimize,
        dismissToast,
        savedIncompleteUpload,
        clearSavedIncompleteUpload,
      }}
    >
      {children}
      <FloatingUploadProgressToast />
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}

function FloatingUploadProgressToast() {
  const { uploadState, toggleMinimize, dismissToast, cancelUpload, pauseUpload, resumeUpload } = useUpload();

  if (uploadState.status === 'IDLE') return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full px-4 sm:px-0 transition-all duration-300 animate-in slide-in-from-bottom-5">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-pink-500/30">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {uploadState.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : uploadState.status === 'ERROR' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : uploadState.status === 'PAUSED' ? (
              <Pause className="w-5 h-5 text-amber-400 shrink-0" />
            ) : uploadState.status === 'VERIFYING' ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-pink-400 animate-spin shrink-0" />
            )}
            <div className="truncate text-xs font-semibold text-pink-100">
              {uploadState.title || uploadState.fileName || 'Video Upload'}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleMinimize}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title={uploadState.isMinimized ? 'Expand progress' : 'Minimize progress'}
            >
              {uploadState.isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={dismissToast}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!uploadState.isMinimized && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-300">
              <span className="truncate pr-2">{uploadState.phase}</span>
              <span className="font-mono text-pink-300 shrink-0">{uploadState.progress}%</span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  uploadState.status === 'COMPLETED'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : uploadState.status === 'ERROR'
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : uploadState.status === 'PAUSED'
                    ? 'bg-amber-500'
                    : uploadState.status === 'VERIFYING'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse'
                    : 'bg-gradient-to-r from-pink-500 via-purple-500 to-rose-400'
                }`}
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>

            {uploadState.isUploading && (
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <div className="flex items-center gap-2">
                  {uploadState.status === 'UPLOADING' && (
                    <button
                      type="button"
                      onClick={pauseUpload}
                      className="text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}
                  {uploadState.status === 'PAUSED' && (
                    <button
                      type="button"
                      onClick={resumeUpload}
                      className="text-pink-300 hover:text-pink-100 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-slate-400 hover:text-rose-300 underline font-medium transition-colors"
                >
                  Cancel Upload
                </button>
              </div>
            )}

            {uploadState.status === 'COMPLETED' && (
              <div className="text-[11px] text-emerald-300 font-medium pt-1 flex items-center justify-between">
                <span>Upload finished & verified successfully</span>
                <button
                  type="button"
                  onClick={dismissToast}
                  className="text-[11px] text-pink-300 hover:underline font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {uploadState.status === 'ERROR' && (
              <div className="text-[11px] text-rose-300 font-medium pt-1">
                {uploadState.error || 'Upload failed'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
