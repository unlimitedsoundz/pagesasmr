'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';

export interface UploadMetadata {
  title: string;
  notes?: string;
  durationSeconds: number;
  isSample?: boolean;
  consentConfirmed?: boolean;
  category?: string;
}

export interface UploadTaskState {
  isUploading: boolean;
  title: string;
  fileName: string;
  progress: number;
  phase: string;
  status: 'IDLE' | 'UPLOADING' | 'OPTIMIZING' | 'COMPLETED' | 'ERROR';
  error: string | null;
  isSample: boolean;
  isMinimized: boolean;
}

interface UploadContextType {
  uploadState: UploadTaskState;
  startUpload: (file: File, meta: UploadMetadata) => Promise<any>;
  cancelUpload: () => void;
  toggleMinimize: () => void;
  dismissToast: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast() as any;
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [uploadState, setUploadState] = useState<UploadTaskState>({
    isUploading: false,
    title: '',
    fileName: '',
    progress: 0,
    phase: '',
    status: 'IDLE',
    error: null,
    isSample: false,
    isMinimized: false,
  });

  // Warn on browser tab closure while uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadState.isUploading) {
        e.preventDefault();
        e.returnValue = 'A video upload is currently in progress. Leaving this page will interrupt your upload.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadState.isUploading]);

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
        progress: 0,
        phase: '',
        status: 'IDLE',
        error: null,
        isSample: false,
        isMinimized: false,
      });
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploadState({
      isUploading: false,
      title: '',
      fileName: '',
      progress: 0,
      phase: '',
      status: 'IDLE',
      error: 'Upload cancelled by user.',
      isSample: false,
      isMinimized: false,
    });
    toast.info('Video upload cancelled.');
  };

  const startUpload = (file: File, meta: UploadMetadata): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (uploadState.isUploading) {
        const msg = 'Another video upload is currently in progress. Please wait for it to complete.';
        toast.warning(msg);
        return reject(new Error(msg));
      }

      const isSample = Boolean(meta.isSample);
      const title = meta.title.trim() || (isSample ? '30s Audition Sample' : file.name);

      setUploadState({
        isUploading: true,
        title,
        fileName: file.name,
        progress: 0,
        phase: 'Preparing upload payload...',
        status: 'UPLOADING',
        error: null,
        isSample,
        isMinimized: false,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_sample', isSample ? 'true' : 'false');
      if (meta.durationSeconds) {
        formData.append('duration_seconds', String(meta.durationSeconds));
      }

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.min(85, Math.round((event.loaded / event.total) * 85));
          const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (event.total / (1024 * 1024)).toFixed(1);
          setUploadState((prev) => ({
            ...prev,
            progress: pct,
            phase: `Uploading ${loadedMb} MB / ${totalMb} MB (${pct}%)`,
            status: 'UPLOADING',
          }));
        }
      };

      xhr.upload.onload = () => {
        setUploadState((prev) => ({
          ...prev,
          progress: 90,
          phase: 'Server ultrafast optimization & waveform verification...',
          status: 'OPTIMIZING',
        }));
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadRes = JSON.parse(xhr.responseText);
            const fileUrl = uploadRes.fileUrl;
            const fileSizeBytes = uploadRes.fileSizeBytes || file.size;
            const resolvedDuration = Number(uploadRes.durationSeconds) || meta.durationSeconds || 30;

            setUploadState((prev) => ({
              ...prev,
              progress: 95,
              phase: 'Registering submission records...',
              status: 'OPTIMIZING',
            }));

            // Register submission record via API
            const submitEndpoint = isSample ? '/api/creator/sample' : '/api/submissions';
            const payload = isSample
              ? {
                  fileUrl,
                  fileName: file.name,
                  fileSizeBytes,
                  durationSeconds: resolvedDuration,
                  notes: meta.notes,
                }
              : {
                  title,
                  category: meta.category || 'PAGE_TURNING',
                  durationSeconds: resolvedDuration,
                  fileUrl,
                  fileName: file.name,
                  fileSizeBytes,
                  notes: meta.notes,
                  consentConfirmed: meta.consentConfirmed ?? true,
                };

            const subRes = await fetch(submitEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const subData = await subRes.json();
            if (!subRes.ok) {
              throw new Error(subData.error || 'Failed to finalize submission record.');
            }

            setUploadState({
              isUploading: false,
              title,
              fileName: file.name,
              progress: 100,
              phase: 'Upload & submission completed successfully!',
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

            // Broadcast update across tabs
            try {
              const syncChan = new BroadcastChannel('asmr_submissions_sync');
              syncChan.postMessage({
                type: isSample ? 'AUDITION_SUBMITTED' : 'NEW_SUBMISSION',
                timestamp: Date.now(),
              });
              syncChan.close();
            } catch {}

            xhrRef.current = null;
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
        cancelUpload,
        toggleMinimize,
        dismissToast,
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
  const { uploadState, toggleMinimize, dismissToast, cancelUpload } = useUpload();

  if (uploadState.status === 'IDLE') return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full px-4 sm:px-0 transition-all duration-300 animate-in slide-in-from-bottom-5">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-pink-500/30">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {uploadState.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : uploadState.status === 'ERROR' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-pink-400 animate-spin shrink-0" />
            )}
            <div className="truncate text-xs font-semibold text-pink-100">
              {uploadState.title || uploadState.fileName || 'Video Upload'}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleMinimize}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title={uploadState.isMinimized ? 'Expand progress' : 'Minimize progress'}
            >
              {uploadState.isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={dismissToast}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Progress Body */}
        {!uploadState.isMinimized && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-300">
              <span className="truncate pr-2">{uploadState.phase}</span>
              <span className="font-mono text-pink-300 shrink-0">{uploadState.progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  uploadState.status === 'COMPLETED'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : uploadState.status === 'ERROR'
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : 'bg-gradient-to-r from-pink-500 via-purple-500 to-rose-400 animate-pulse'
                }`}
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>

            {/* Action Buttons */}
            {uploadState.isUploading && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={cancelUpload}
                  className="text-[11px] text-slate-400 hover:text-rose-300 underline font-medium transition-colors"
                >
                  Cancel Upload
                </button>
              </div>
            )}

            {uploadState.status === 'COMPLETED' && (
              <div className="text-[11px] text-emerald-300 font-medium pt-1 flex items-center justify-between">
                <span>Upload finished successfully</span>
                <button
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
