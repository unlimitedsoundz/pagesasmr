import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BrickWall,
  CheckCircle2,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Turn Pages. Create Calming ASMR. Earn Beautifully. | The Pink Room',
  description:
    'Join The Pink Room. Record authentic faceless page-turning ASMR. Earn $50 USD per approved video with reliable direct bank, Mobile Money & PayPal payouts.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-20 sm:pt-20 sm:pb-28 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 reveal-on-scroll">
          {/* Eyebrow Tag */}
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
            An Exclusive Creator Studio
          </span>

          {/* Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Turn pages. <br />
            Earn beautifully.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            A quiet, respectful creator studio. Keep 100% of your copyright while earning $50 per approved 3-minute video.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white text-sm sm:text-base font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.99] group"
            >
              <span>Start creating</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm sm:text-base font-medium transition-all shadow-xs"
            >
              <span>How earnings work</span>
            </Link>
          </div>

          {/* Trust markers */}
          <div className="pt-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <span>3-minute minimum</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>8 videos = $400 payout</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>100% face-free option</span>
          </div>
        </div>
      </section>

      {/* 2. PRICING & TIERS SECTION */}
      <section id="pricing" className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header 2 columns */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 reveal-on-scroll">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white leading-[1.12]">
                $50. Every<br />
                approved video.<br />
                No mystery math.
              </h2>
            </div>
            <div className="md:max-w-md">
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                We pay $50 for every accepted faceless video. Direct bank deposits via PayPal, Mobile Money, or local bank transfer. Payout threshold is 8 approved videos ($400).
              </p>
            </div>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Starter Batch (Dark Highlighted) */}
            <div className="bg-[#18181B] !text-white rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden group reveal-on-scroll reveal-delay-1">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-neutral-300">
                  STARTER BATCH
                </span>
                <div className="font-serif text-5xl sm:text-6xl font-medium !text-white tracking-tight my-4">
                  $400
                </div>
              </div>
              <div className="text-xs sm:text-sm text-neutral-300 font-medium">
                8 approved videos
              </div>
            </div>

            {/* Card 2: 10 Videos */}
            <div className="bg-white dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-2">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  10 VIDEOS
                </span>
                <div className="font-serif text-5xl sm:text-6xl font-medium text-[#1C1520] dark:text-white tracking-tight my-4">
                  $500
                </div>
              </div>
              <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                10 approved videos
              </div>
            </div>

            {/* Card 3: Steady Creator */}
            <div className="bg-white dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-3">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  STEADY CREATOR
                </span>
                <div className="font-serif text-5xl sm:text-6xl font-medium text-[#1C1520] dark:text-white tracking-tight my-4">
                  $800
                </div>
              </div>
              <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                16 approved videos
              </div>
            </div>
          </div>

          {/* Copyright ribbon callout */}
          <div className="bg-[#FDF2F7] dark:bg-[#2A1725] border border-[#FCE7F3] dark:border-[#4E213E] rounded-xl p-4 sm:p-5 mt-8 flex items-center gap-3.5 text-xs sm:text-sm text-[#5B1B38] dark:text-pink-200 reveal-on-scroll reveal-delay-2">
            <BrickWall className="w-5 h-5 text-[#BE185D] shrink-0" />
            <span>
              Every accepted video remains your intellectual property. The Pink Room receives non-exclusive distribution rights.
            </span>
          </div>
        </div>
      </section>

      {/* 3. TWO SIGNATURE FORMATS SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-12 reveal-on-scroll">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-[#9D174D] dark:text-pink-300">
              TWO SIGNATURE FORMATS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white tracking-tight">
              Quiet mood, recorded with care.
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Two distinct ASMR styles. Choose whichever suits your comfort, setup, and aesthetic. No face framing required for either.
            </p>
          </div>

          {/* 2 Format Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Page-turning */}
            <div className="bg-white dark:bg-[#201C24] rounded-[28px] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] dark:border-white/[0.05] flex flex-col justify-between reveal-on-scroll reveal-delay-1">
              <div>
                <div className="flex items-baseline gap-2.5 mb-5">
                  <span className="font-serif text-3xl sm:text-4xl font-medium text-[#9D174D] dark:text-pink-400">
                    01
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
                    RHYTHM
                  </span>
                </div>
                <h3 className="font-serif text-3xl sm:text-4xl font-medium text-[#1C1520] dark:text-white tracking-tight mb-4">
                  Page-turning
                </h3>
                <p className="text-sm sm:text-[15px] text-[#585868] dark:text-neutral-300 leading-relaxed mb-8">
                  Gentle page turning, smoothing, and book handling with long press nails. Recorded in a quiet room with zero background noise.
                </p>
              </div>

              <Link
                href="/guidelines"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FCEEF4] dark:bg-[#2C1927] hover:bg-[#F9E2ED] dark:hover:bg-[#382032] flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-[#9D174D] dark:text-pink-400 shrink-0" />
                <span className="text-xs sm:text-[13px] font-medium text-[#2E2E38] dark:text-[#E8D8E2]">
                  Stable overhead tripod framing, hands only
                </span>
              </Link>
            </div>

            {/* Card 2: Paper-handling */}
            <div className="bg-white dark:bg-[#201C24] rounded-[28px] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] dark:border-white/[0.05] flex flex-col justify-between reveal-on-scroll reveal-delay-2">
              <div>
                <div className="flex items-baseline gap-2.5 mb-5">
                  <span className="font-serif text-3xl sm:text-4xl font-medium text-[#9D174D] dark:text-pink-400">
                    02
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
                    SOUND
                  </span>
                </div>
                <h3 className="font-serif text-3xl sm:text-4xl font-medium text-[#1C1520] dark:text-white tracking-tight mb-4">
                  Paper-handling
                </h3>
                <p className="text-sm sm:text-[15px] text-[#585868] dark:text-neutral-300 leading-relaxed mb-8">
                  Crisp page flips, textured paper tracing, and rhythmic turning sounds. Framed closely on book pages with clean acoustic focus.
                </p>
              </div>

              <Link
                href="/guidelines"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FCEEF4] dark:bg-[#2C1927] hover:bg-[#F9E2ED] dark:hover:bg-[#382032] flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-[#9D174D] dark:text-pink-400 shrink-0" />
                <span className="text-xs sm:text-[13px] font-medium text-[#2E2E38] dark:text-[#E8D8E2]">
                  No music, television, or background noise
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUR STEPS SECTION */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header 2 columns */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 reveal-on-scroll">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white leading-[1.12]">
                Four steps from<br />
                quiet room to payout.
              </h2>
            </div>
            <div className="md:max-w-md">
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                From your quiet bedroom to your first direct transfer, our streamlined submission workflow is built for privacy, fairness, and speed.
              </p>
            </div>
          </div>

          {/* 2x2 Grid of Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/90 dark:border-neutral-700/60 rounded-[24px] p-7 sm:p-8 space-y-2.5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-2xl font-medium text-[#9D174D] dark:text-pink-400">01</span>
                <span className="text-[10.5px] font-bold tracking-[0.16em] text-[#9D174D] dark:text-pink-400 uppercase">SETUP</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                Set the room
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Prepare lighting and microphone in a quiet space with zero bleed. Keep camera fixed on a stable tripod or table.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/90 dark:border-neutral-700/60 rounded-[24px] p-7 sm:p-8 space-y-2.5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-2">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-2xl font-medium text-[#9D174D] dark:text-pink-400">02</span>
                <span className="text-[10.5px] font-bold tracking-[0.16em] text-[#9D174D] dark:text-pink-400 uppercase">SUBMIT</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                Send it securely
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Upload your MP4 or MOV file directly. We verify duration and video container details automatically upon receipt.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/90 dark:border-neutral-700/60 rounded-[24px] p-7 sm:p-8 space-y-2.5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-2xl font-medium text-[#9D174D] dark:text-pink-400">03</span>
                <span className="text-[10.5px] font-bold tracking-[0.16em] text-[#9D174D] dark:text-pink-400 uppercase">REVIEW</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                Earn the credit
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Editorial review for audio quality and sound compliance. Each approved video adds $50 credit to your creator balance.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/90 dark:border-neutral-700/60 rounded-[24px] p-7 sm:p-8 space-y-2.5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors reveal-on-scroll reveal-delay-4">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-2xl font-medium text-[#9D174D] dark:text-pink-400">04</span>
                <span className="text-[10.5px] font-bold tracking-[0.16em] text-[#9D174D] dark:text-pink-400 uppercase">PAYOUT</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                Request your money
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Reach 8 approved videos to request your $400 payout via PayPal, Mobile Money, local bank transfer, or direct deposit straight to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DARK WINE / PLUM BANNER */}
      <section className="w-full bg-[#581335] dark:bg-[#3D0A23] py-20 sm:py-24 px-4 sm:px-6 lg:px-8 text-center transition-colors">
        <div className="max-w-4xl mx-auto space-y-6 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase !text-pink-200">
            GET STARTED
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium !text-white tracking-tight leading-[1.15]">
            Your quiet room could be <br className="hidden sm:inline" />
            your next income stream.
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Studio approval in 24 hours. Keep 100% of your rights and earn $50 per approved recording.
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
