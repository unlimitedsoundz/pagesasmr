'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, ShieldCheck, UploadCloud, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ArrowRight } from 'lucide-react';
import { PayoutRequest } from '@/types';

interface MandatoryTestimonialModalProps {
  onSuccess?: () => void;
}

export default function MandatoryTestimonialModal({ onSuccess }: MandatoryTestimonialModalProps) {
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const markPayoutPrompted = (payoutId: string) => {
    try {
      localStorage.setItem(`pinkroom_prompted_payout_${payoutId}`, '1');
      fetch('/api/creator/pending-testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_id: payoutId }),
      }).catch(() => {});
    } catch {}
  };

  const checkPending = async () => {
    try {
      const res = await fetch('/api/creator/pending-testimonial', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.pendingPayouts && Array.isArray(data.pendingPayouts)) {
        // Filter out payouts already prompted on this client session
        const unprompted = data.pendingPayouts.filter((p: PayoutRequest) => {
          try {
            return !localStorage.getItem(`pinkroom_prompted_payout_${p.id}`);
          } catch {
            return true;
          }
        });

        if (unprompted.length > 0) {
          setPendingPayouts(unprompted);
          // Immediately mark the first payout as prompted so it never appears again
          markPayoutPrompted(unprompted[0].id);
        } else {
          setPendingPayouts([]);
        }
      }
    } catch (err) {
      console.error('Failed to check pending testimonials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPending();

    const handleRefresh = () => checkPending();
    const handleOpenModal = (e: any) => {
      if (e.detail?.payout) {
        setPendingPayouts([e.detail.payout]);
        setCurrentIdx(0);
        setSubmittedSuccess(false);
      }
    };

    window.addEventListener('payout-updated', handleRefresh);
    window.addEventListener('open-payout-review', handleOpenModal as EventListener);
    return () => {
      window.removeEventListener('payout-updated', handleRefresh);
      window.removeEventListener('open-payout-review', handleOpenModal as EventListener);
    };
  }, []);

  const activePayout = pendingPayouts[currentIdx];

  const handleDismiss = () => {
    if (activePayout) {
      markPayoutPrompted(activePayout.id);
    }
    setPendingPayouts([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 12MB limit.');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please drop an image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 12MB limit.');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayout) return;
    setErrorMsg('');

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg('Please select a star rating between 1 and 5 stars.');
      return;
    }

    if (!review.trim() || review.trim().length < 10) {
      setErrorMsg('Please write at least 10 characters describing your payout experience.');
      return;
    }

    if (!proofFile) {
      setErrorMsg('Proof of payout is required. Please upload a screenshot of your bank, wallet, or mobile money receipt.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('payout_id', activePayout.id);
      formData.append('rating', rating.toString());
      formData.append('review', review.trim());
      formData.append('proof', proofFile);

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      markPayoutPrompted(activePayout.id);
      setSubmittedSuccess(true);
      window.dispatchEvent(new CustomEvent('testimonial-submitted'));

      // If more pending payouts remain, move to next after brief delay
      setTimeout(() => {
        if (currentIdx + 1 < pendingPayouts.length) {
          const nextIdx = currentIdx + 1;
          setCurrentIdx(nextIdx);
          markPayoutPrompted(pendingPayouts[nextIdx].id);
          setReview('');
          setRating(5);
          setProofFile(null);
          setProofPreview(null);
          setSubmittedSuccess(false);
        } else {
          setPendingPayouts([]);
          if (onSuccess) onSuccess();
        }
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || pendingPayouts.length === 0 || !activePayout) {
    return null;
  }

  const starLabels: Record<number, string> = {
    5: '⭐⭐⭐⭐⭐ Excellent (Fast & Smooth)',
    4: '⭐⭐⭐⭐ Very Good experience',
    3: '⭐⭐⭐ Satisfactory',
    2: '⭐⭐ Needs Improvement',
    1: '⭐ Unsatisfactory',
  };

  const currentStarVal = hoverRating ?? rating;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1A1620] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-neutral-900 dark:text-neutral-100 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Close"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccess ? (
          <div className="py-12 text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-serif font-medium text-neutral-900 dark:text-white">Review & Receipt Verified!</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-sm mx-auto leading-relaxed">
              Thank you for uploading your proof of payout. Your review is now published on the public testimonials page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="space-y-2 text-center pt-1">
              <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
                Payout Completed
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#1C1520] dark:text-white tracking-tight">
                Your Payout Is Here! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto">
                We'd love to hear how your payout went! Drop a quick rating, review, and upload your payment receipt below.
              </p>
            </div>

            {/* Payout Summary Badge */}
            <div className="p-4 rounded-2xl bg-[#FDF0F5] dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">Completed Payout</div>
                <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ${activePayout.amount_usd.toFixed(2)} USD
                </div>
              </div>
              <div className="text-right">
                <div className="text-neutral-800 dark:text-neutral-200 font-medium">
                  {activePayout.payment_method?.replace(/_/g, ' ') || 'Direct Deposit'}
                </div>
                {activePayout.payment_reference && (
                  <div className="text-[11px] text-neutral-500 font-mono truncate max-w-[170px]">
                    Ref: {activePayout.payment_reference}
                  </div>
                )}
              </div>
            </div>

            {/* Stars Selector */}
            <div className="space-y-1.5 text-center">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Rate Your Experience *
              </label>
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        star <= currentStarVal
                          ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                          : 'text-neutral-300 dark:text-neutral-700 hover:text-neutral-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-medium text-amber-600 dark:text-amber-300 h-4">
                {starLabels[currentStarVal]}
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-1.5">
              <label htmlFor="review-text" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Your Review *
              </label>
              <textarea
                id="review-text"
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience receiving your payout (e.g. payout speed, helpful support, reliability)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 text-xs sm:text-sm focus:outline-none focus:border-rose-400 transition"
                required
              />
              <div className="flex justify-between items-center text-[10px] text-neutral-500 px-1">
                <span>Minimum 10 characters</span>
                <span>{review.length} characters</span>
              </div>
            </div>

            {/* Proof of Payout Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Upload Payout Receipt * (Screenshot / SMS)
              </label>

              {proofPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-2.5 flex items-center gap-3">
                  <img
                    src={proofPreview}
                    alt="Payout Receipt Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-neutral-900 dark:text-white truncate">{proofFile?.name}</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready to upload ({(proofFile!.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-xl p-4 sm:p-5 text-center cursor-pointer bg-[#FDF0F5]/40 dark:bg-neutral-900/40 hover:bg-[#FDF0F5]/70 dark:hover:bg-neutral-900/70 transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 mx-auto text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors mb-1.5" />
                  <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    Click to select or drag & drop payout receipt
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Bank SMS alert, mobile banking screenshot, or wallet receipt (PNG, JPG, WebP max 12MB)
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Actions: Submit + Maybe Later */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#18181B] hover:bg-black text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Review & Receipt...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Review & Receipt</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 text-center">
              Your review and receipt will appear on The Pink Room public testimonials page.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
