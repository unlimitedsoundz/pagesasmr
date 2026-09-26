import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | From First Recording to First Payout | The Pink Room',
  description:
    'Five clear stages. No fees, no subscription, and no hidden rate changes. You create original faceless page-turning ASMR; we verify, review, and pay $10 per approved video.',
  alternates: {
    canonical: '/how-it-works',
  },
};

export default function HowItWorksPage() {
  const stages = [
    {
      num: '01',
      title: 'Creator Onboarding',
      desc: 'Sign up with your display name, country of residence, and age verification. Confirm familiarity with the faceless page-turning and book-handling ASMR format. No fee or subscription is ever required.',
      meta: ['18+ with legal capacity', 'Faceless overhead format', 'Recording guidelines accepted'],
    },
    {
      num: '02',
      title: 'Recording to Specification',
      desc: 'Record original, high quality ASMR featuring authentic page flips, paper smoothing, and book sounds. Each video file must be at least 3 minutes in length with clean audio and zero background noise.',
      meta: ['3+ minutes duration', 'Overhead hands-only framing', 'Long press nails with clean book focus'],
    },
    {
      num: '03',
      title: 'Server-Verified Upload',
      desc: 'Upload MP4 or MOV files in the creator dashboard. Automatic validation inspects file integrity and duration, identifying files under three minutes immediately.',
      meta: ['Resumable multi-video uploads', 'Automatic duration inspection', 'Real-time Submitted and Under Review status'],
    },
    {
      num: '04',
      title: 'Editorial Quality Review',
      desc: 'The review team checks sound quality, background noise, lighting, framing, and guideline compliance. Approval immediately credits $10 to your ledger.',
      meta: ['$10 rate locks permanently', 'Specific revision notes when needed', 'Re-upload revisions without losing submission history'],
    },
    {
      num: '05',
      title: 'Reach 8 Videos & Request Payout',
      desc: 'At eight approved, unpaid videos, your $80 payout button unlocks. Request payment for eight, ten, sixteen, or more approved videos.',
      meta: ['8 videos = $80 minimum', 'Direct Deposit, PayPal, Mobile Money, or Local Bank', 'Earnings reserved during processing', 'Official transaction reference recorded'],
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            THE CREATOR JOURNEY
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            From first recording <br />
            to first payout.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Five clear stages. No fees, no subscription, and no hidden rate changes. You create original faceless ASMR; we verify, review, and pay.
          </p>
        </div>
      </section>

      {/* 2. THE 5 STAGES SECTION */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
          {stages.map((stage, idx) => (
            <div
              key={stage.num}
              className={`flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-12 pb-16 border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-b-0 last:pb-0 reveal-on-scroll reveal-delay-${(idx % 3) + 1}`}
            >
              <div className="md:w-5/12">
                <span className="block font-serif text-5xl sm:text-6xl font-medium text-[#F472B6] dark:text-pink-400 mb-2">
                  {stage.num}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white tracking-tight leading-snug">
                  {stage.title}
                </h3>
              </div>
              <div className="md:w-7/12 space-y-4">
                <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {stage.desc}
                </p>
                <div className="text-xs text-neutral-400 dark:text-neutral-500 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {stage.meta.map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">•</span>}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. THREE RULES. NOTHING HIDDEN. SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white text-center mb-12 tracking-tight reveal-on-scroll">
            Three rules. Nothing hidden.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#221C28] border border-neutral-200/80 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs reveal-on-scroll reveal-delay-1">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white mb-3">
                  $10 flat rate
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  The agreed rate is locked onto every submission when uploaded.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#221C28] border border-neutral-200/80 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs reveal-on-scroll reveal-delay-2">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white mb-3">
                  8-video minimum
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Every withdrawal unlocks with at least eight approved, unpaid videos.
                </p>
              </div>
            </div>

            {/* Card 3 (Signature Dark Card) */}
            <div className="bg-[#18181B] !text-white rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden group reveal-on-scroll reveal-delay-3">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium !text-white mb-3">
                  Paid means final
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Once paid, a video cannot be reversed or deducted. You own your earnings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION BANNER */}
      <section className="w-full bg-[#581335] dark:bg-[#3D0A23] py-20 sm:py-24 px-4 sm:px-6 lg:px-8 text-center transition-colors">
        <div className="max-w-4xl mx-auto space-y-6 reveal-on-scroll">
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium !text-white tracking-tight leading-[1.15]">
            Ready to make your <br className="hidden sm:inline" />
            first recording?
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Join free, review the guidelines, and start building toward your first $80 payout.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-pink-50 text-[#581335] font-semibold text-sm sm:text-base transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
            >
              <span>Become a creator</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
