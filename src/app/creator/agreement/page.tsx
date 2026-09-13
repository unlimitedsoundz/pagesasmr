'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Lock,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Video,
  FileCheck2,
  AlertCircle,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function CreatorAgreementPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState<{
    signed: boolean;
    signed_at: string | null;
    signature_name: string | null;
    creator_name?: string;
  } | null>(null);

  // Review checklist states
  const [formatConfirmed, setFormatConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    // Check localStorage for previously confirmed review
    try {
      const storedReview = localStorage.getItem('pinkroom_agreement_reviewed');
      if (storedReview === 'true') {
        setFormatConfirmed(true);
        setTermsConfirmed(true);
        setReviewSubmitted(true);
      }
    } catch {}

    fetch('/api/creator/agreement', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setAgreementData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const creatorName =
    agreementData?.creator_name ||
    agreementData?.signature_name ||
    (typeof window !== 'undefined' ? localStorage.getItem('pinkroom_display_name') : null) ||
    'Ada Wunor';

  const isSigned = agreementData?.signed;
  const canConfirm = formatConfirmed && termsConfirmed;

  const handleConfirmReview = () => {
    if (!canConfirm) return;
    setSubmittingReview(true);
    try {
      localStorage.setItem('pinkroom_agreement_reviewed', 'true');
    } catch {}

    setTimeout(() => {
      setReviewSubmitted(true);
      setSubmittingReview(false);
      toast.success(
        'Review confirmed. You are ready to record and upload your video batch.',
        'Terms review confirmed'
      );
    }, 400);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <main className="max-w-[1100px] mx-auto px-3 sm:px-4 lg:px-4 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* ─── Top Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-1">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              BEFORE YOU CREATE
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 dark:text-white">
              Clear terms.{' '}
              <span className="italic font-serif text-[#8E2848] dark:text-pink-400">
                Confident creating.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              Review the recording requirements and how your work earns.
            </p>
          </div>

          <Link
            href="/creator/upload"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
          >
            <span>Back to upload</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ─── Top 3-Stat Metric Row (Creator Dashboard Connected Grid) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:border-neutral-800 overflow-hidden shadow-2xs">
          {/* Metric 1: Rate */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
              YOUR RATE
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 dark:text-white flex items-baseline gap-1.5">
              <span>$50</span>
              <span className="font-sans text-xs font-bold text-neutral-400 tracking-wider">USD</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Per approved full video
            </div>
          </div>

          {/* Metric 2: Payout Minimum */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
              YOUR PAYOUT
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 dark:text-white flex items-baseline gap-1.5">
              <span>8</span>
              <span className="font-sans text-xs font-medium text-neutral-400">videos</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              $400 minimum · approved and unpaid
            </div>
          </div>

          {/* Metric 3: Recording Duration */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
              YOUR RECORDING
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 dark:text-white flex items-baseline gap-1.5">
              <span>3:00</span>
              <span className="font-sans text-xs font-medium text-neutral-400">minimum</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Original, faceless ASMR
            </div>
          </div>
        </div>

        {/* ─── Main Two-Column Layout ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">

          {/* ── Left Column: Agreement Content & Checklist (8 cols) ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Document Container Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xs">

              {/* Document Header */}
              <div className="space-y-4 border-b border-neutral-100 dark:border-neutral-800 pb-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FCEBF2] dark:bg-[#23151F] text-[#7B1E4B] dark:text-[#F472B6] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 bg-[#FDFBFD] dark:bg-neutral-800">
                    Terms summary · Preview
                  </span>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
                    Creator agreement
                  </h2>
                  <p className="text-xs text-neutral-400 font-medium mt-0.5">
                    Thigh-flapping & gum-chewing
                  </p>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed">
                  A summary of the requirements shown in your creator dashboard. The full agreement and any signed acceptance record have not been connected to this preview.
                </p>

                {/* Jump Navigation Links */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px]">
                  <span className="font-bold tracking-wider text-neutral-400 uppercase text-[10px]">
                    IN THIS SUMMARY
                  </span>
                  <div className="flex items-center gap-3 sm:gap-4 font-semibold text-[#7B1E4B] dark:text-[#F472B6]">
                    <button
                      type="button"
                      onClick={() => scrollToSection('summary-recording')}
                      className="hover:underline transition-all"
                    >
                      Recording
                    </button>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection('summary-review')}
                      className="hover:underline transition-all"
                    >
                      Review
                    </button>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection('summary-earnings')}
                      className="hover:underline transition-all"
                    >
                      Earnings
                    </button>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection('summary-payouts')}
                      className="hover:underline transition-all"
                    >
                      Payouts
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 01: What you create */}
              <div id="summary-recording" className="space-y-4 pt-2">
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl sm:text-3xl font-normal text-neutral-300 dark:text-neutral-600 shrink-0 select-none">
                    01
                  </span>
                  <div className="space-y-3 flex-1">
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                      What you create.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Original, faceless ASMR recordings combining rhythmic thigh-flapping with gum-chewing sounds. Each full video must be at least three minutes long.
                    </p>

                    <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-neutral-400 text-base leading-none">•</span>
                        <span>Keep framing steady and faceless, with consistent lighting.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-neutral-400 text-base leading-none">•</span>
                        <span>Capture clear original audio without music, television, voices, or other background noise.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-neutral-400 text-base leading-none">•</span>
                        <span>Maintain safe, painless rhythmic pacing. Stop if you experience discomfort.</span>
                      </li>
                    </ul>

                    {/* Highlight Pill Container: Eight-video batch rule */}
                    <div className="bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F5D5E3] dark:border-[#3D2132] rounded-xl p-4 flex items-start gap-3 text-xs text-[#7B1E4B] dark:text-[#F472B6]">
                      <Video className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
                      <div className="space-y-0.5">
                        <span className="font-bold">The eight-video batch rule:</span>
                        <p className="font-medium text-[11px] opacity-90">
                          Wear the same knee-length skirt across all eight videos, with different panties for each submission.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Link
                        href="/guidelines"
                        className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>Read the full recording guidelines</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 02: How your work is reviewed */}
              <div id="summary-review" className="space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl sm:text-3xl font-normal text-neutral-300 dark:text-neutral-600 shrink-0 select-none">
                    02
                  </span>
                  <div className="space-y-3 flex-1">
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                      How your work is reviewed.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Each submission is reviewed for sound quality, background noise, lighting, framing, and compliance with the recording guidelines.
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      A submitted video earns only after it is approved. If changes are needed, editorial notes explain what to revise before you resubmit.
                    </p>

                    <div>
                      <Link
                        href="/creator/videos"
                        className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>View your submissions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 03: What you earn */}
              <div id="summary-earnings" className="space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl sm:text-3xl font-normal text-neutral-300 dark:text-neutral-600 shrink-0 select-none">
                    03
                  </span>
                  <div className="space-y-3 flex-1">
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                      What you earn.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Each approved full video earns <strong>$50 USD</strong>. Your dashboard displays this as your locked-in rate.
                    </p>

                    {/* Highlight Pill Container: Audition samples are non-billable */}
                    <div className="bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F5D5E3] dark:border-[#3D2132] rounded-xl p-4 flex items-start gap-3 text-xs text-[#7B1E4B] dark:text-[#F472B6]">
                      <FileText className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Audition samples are non-billable.</span>
                        <p className="font-medium text-[11px] opacity-90">
                          Your approved audition lets you move on to full recordings. It does not earn $50 or count toward the payout minimum.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 04: When you get paid */}
              <div id="summary-payouts" className="space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl sm:text-3xl font-normal text-neutral-300 dark:text-neutral-600 shrink-0 select-none">
                    04
                  </span>
                  <div className="space-y-3 flex-1">
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                      When you get paid.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      A payout becomes available with at least <strong>eight approved, unpaid full videos</strong>, for a minimum of <strong>$400 USD</strong>. Additional approved, unpaid videos can be included in the same request.
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Earnings allocated to a processing payout are shown as reserved. Confirmed payments appear in your payout history, and the same video cannot be paid twice.
                    </p>

                    <div>
                      <Link
                        href="/creator/payouts"
                        className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>See your payout progress</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Bottom Action Card: YOUR REVIEW CHECKLIST ────────── */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="space-y-1">
                <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-400 uppercase">
                  YOUR REVIEW CHECKLIST
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
                  Ready for the next step?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                  Confirm you've reviewed the summary before returning to your recordings.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3.5 pt-1">
                <label className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={formatConfirmed}
                    onChange={(e) => setFormatConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#7B1E4B] focus:ring-[#7B1E4B] accent-[#7B1E4B]"
                  />
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    I have reviewed the recording format, quality standards, and eight-video batch requirements.
                  </span>
                </label>

                <label className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={(e) => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#7B1E4B] focus:ring-[#7B1E4B] accent-[#7B1E4B]"
                  />
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    I understand the $50 rate, non-billable audition, and eight-approved-video payout minimum.
                  </span>
                </label>
              </div>

              {/* Confirmation CTA Row */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-neutral-400 font-medium">
                  {reviewSubmitted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      All items confirmed for this visit.
                    </span>
                  ) : canConfirm ? (
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                      All items checked. Ready to proceed.
                    </span>
                  ) : (
                    'Review both items to continue.'
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReview}
                  disabled={!canConfirm || submittingReview}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-sm active:scale-95 ${
                    canConfirm
                      ? 'bg-[#130E14] hover:bg-black text-white cursor-pointer'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <span>{submittingReview ? 'Confirming...' : 'Confirm review'}</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-400 font-normal">
                This checklist applies only to this visit. It does not sign or accept a contract.
              </p>
            </div>

          </div>

          {/* ── Right Column: Agreement Status & Support (4 cols) ────── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Dark Card: YOUR AGREEMENT */}
            <div className="bg-[#130E14] text-white rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
                  YOUR AGREEMENT
                </span>
                <FileText className="w-4 h-4 text-neutral-400" />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-normal leading-snug text-white">
                  One place for <br />
                  <span className="italic font-serif text-pink-300">
                    your agreement.
                  </span>
                </h3>
              </div>

              {/* Status Badge */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/90 border border-white/15">
                  <Lock className="w-3 h-3" />
                  <span>{isSigned ? 'Account connected' : 'Account not connected'}</span>
                </span>
              </div>

              {/* Metadata rows */}
              <div className="space-y-3 pt-2 text-xs border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Creator</span>
                  <span className="font-medium text-white">{creatorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Agreement status</span>
                  <span className="font-medium text-neutral-300">
                    {isSigned ? 'Active & Signed' : 'Unavailable in preview'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Signed on</span>
                  <span className="font-medium text-neutral-300">
                    {agreementData?.signed_at
                      ? new Date(agreementData.signed_at).toLocaleDateString()
                      : 'Not available'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 font-normal leading-relaxed pt-1">
                Your audition approval and your agreement acceptance are separate records.
              </p>

              <div className="pt-2">
                <Link
                  href="/creator"
                  className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-100 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Open creator account</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Soft Pink Card: A question about the terms? */}
            <div className="bg-[#FCEEF3] dark:bg-[#23151F] border border-[#F8D7E3] dark:border-[#3D2132] rounded-2xl p-6 sm:p-7 space-y-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-white/10 text-[#7B1E4B] dark:text-pink-300 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>

              <h4 className="font-serif text-xl font-normal text-neutral-900 dark:text-white">
                A question about the terms?
              </h4>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                Ask the creator support team before accepting the full agreement.
              </p>

              <div className="pt-1">
                <a
                  href="mailto:notifications@pinkroom.online?subject=Question%20about%20Creator%20Agreement"
                  className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1"
                >
                  <span>Contact creator support</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* SIGNED DOCUMENTS Card */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                SIGNED DOCUMENTS
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <FileText className="w-4 h-4 text-neutral-400" />
                  <span>No document connected</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                  Your complete agreement, version, and acceptance history will appear when your account is connected.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* ─── Bottom Summary Bar ──────────────────────────────────── */}
        <div className="pt-8 border-t border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 font-medium tracking-wide">
            <span>$50 flat rate.</span>
            <span>·</span>
            <span>8-video minimum.</span>
            <span>·</span>
            <span>Your work. Your earnings.</span>
          </div>
        </div>

      </main>
    </div>
  );
}
