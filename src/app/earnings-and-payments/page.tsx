import React from 'react';
import Link from 'next/link';
import {
  BrickWall,
  ArrowRight,
  Landmark,
  CreditCard,
  Building2,
  Globe2,
  Smartphone,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earnings & Payments | Guaranteed $50/Video Payouts | The Pink Room — Page Turning',
  description:
    'Transparent compensation model: Earn flat $50 USD per approved page-turning video. Minimum 8-video ($400) payout threshold via PayPal, Mobile Money, Local Bank Transfer, or Direct Deposit.',
  alternates: {
    canonical: '/earnings-and-payments',
  },
};

export default function EarningsAndPaymentsPage() {
  const pillars = [
    {
      num: '01',
      title: '$50.00 Rate Locked Per Submission',
      desc: 'When you upload a video, the agreed platform rate ($50.00 USD) is permanently recorded with that submission. Even if platform rates fluctuate in the future, existing submissions are guaranteed their locked rate.',
      meta: ['Immutable rate ledger', 'Never affected by market rate updates', 'Zero platform fees deducted'],
    },
    {
      num: '02',
      title: '8 Approved Videos Minimum Payout ($400)',
      desc: 'To ensure sustainable banking batch transfers, creators accumulate at least 8 approved, unpaid videos before submitting a withdrawal request. 8 approved videos = $400.00; 10 = $500.00; 16 = $800.00.',
      meta: ['8 videos = $400 minimum', '10 videos = $500 payout', '16 videos = $800 payout'],
    },
    {
      num: '03',
      title: 'Concurrency & Reservation Protection',
      desc: 'When you request a payout, those specific approved video IDs are atomically reserved. They cannot be submitted in another withdrawal, double-spent, or duplicated while pending bank processing.',
      meta: ['Atomic database locking', 'Zero double-spend risk', 'Real-time ledger audit trail'],
    },
    {
      num: '04',
      title: 'Direct Disbursements With Bank Reference',
      desc: 'Once your payout is released, your creator transaction ledger records the official bank confirmation number, PayPal transaction reference, Mobile Money reference, or local bank transfer ID for complete auditability.',
      meta: ['Official transaction reference', 'ACH, PayPal, Mobile Money, Local Bank & Wire', 'Non-reversible paid earnings'],
    },
  ];

  const paymentMethods = [
    {
      name: 'Local Bank Transfer',
      icon: Landmark,
      desc: 'Direct electronic funds transfer straight to your local commercial bank in your domestic currency without intermediary fees.',
    },
    {
      name: 'Mobile Money (M-Pesa, MTN, Airtel)',
      icon: Smartphone,
      desc: 'Instant direct cellular wallet disbursements across Africa, Southeast Asia, and emerging markets via M-Pesa, MTN MoMo, Airtel Money, and local networks.',
    },
    {
      name: 'Direct Deposit (ACH / US Bank)',
      icon: Building2,
      desc: 'Direct electronic funds transfer to any US checking or savings account with zero creator fees.',
    },
    {
      name: 'PayPal',
      icon: CreditCard,
      desc: 'Instant direct transfer to your verified PayPal email address worldwide.',
    },
    {
      name: 'International Wire Transfer',
      icon: Globe2,
      desc: 'Available for larger accumulated balances ($1,000+ USD) via SWIFT/BIC global banking networks.',
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            TRANSPARENT COMPENSATION
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Guaranteed rates. <br />
            Direct payouts.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            We pay $50 for every accepted faceless video. Direct bank deposits via PayPal, Mobile Money, or local bank transfer. Payout threshold is 8 approved videos ($400).
          </p>
        </div>
      </section>

      {/* 2. MILESTONE TIERS */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 reveal-on-scroll">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white leading-[1.12]">
                Standard payout <br />
                milestones.
              </h2>
            </div>
            <div className="md:max-w-md">
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Earnings accumulate automatically with every approved submission. Request payout as soon as you reach the 8-video minimum.
              </p>
            </div>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                8 approved videos (Minimum Payout)
              </div>
            </div>

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

      {/* 3. FOUR PILLARS SECTION */}
      <section className="w-full bg-[#FAFAFA] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 reveal-on-scroll">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-[#9D174D] dark:text-pink-300">
              PAYMENT ARCHITECTURE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white tracking-tight">
              Four pillars of our payment model.
            </h2>
          </div>

          <div className="space-y-16">
            {pillars.map((pillar) => (
              <div
                key={pillar.num}
                className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-12 pb-14 border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-b-0 last:pb-0 reveal-on-scroll"
              >
                <div className="md:w-5/12">
                  <span className="block font-serif text-5xl sm:text-6xl font-medium text-[#F472B6] dark:text-pink-400 mb-2">
                    {pillar.num}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white tracking-tight leading-snug">
                    {pillar.title}
                  </h3>
                </div>

                <div className="md:w-7/12 space-y-4">
                  <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {pillar.desc}
                  </p>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {pillar.meta.map((item, i) => (
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
        </div>
      </section>

      {/* 4. PAYMENT METHODS SECTION */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12 reveal-on-scroll">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-[#9D174D] dark:text-pink-300">
              DISBURSEMENT CHANNELS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white tracking-tight">
              Supported payout methods.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paymentMethods.map((method, idx) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.name}
                  className={`bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/80 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 space-y-3 reveal-on-scroll reveal-delay-${(idx % 2) + 1}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FDF2F7] dark:bg-[#2A1725] text-[#9D174D] dark:text-pink-300 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                    {method.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {method.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. THREE RULES SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white text-center mb-12 tracking-tight reveal-on-scroll">
            Three rules. Nothing hidden.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#221C28] border border-neutral-200/80 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs reveal-on-scroll reveal-delay-1">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white mb-3">
                  $50 flat rate
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  The agreed rate is locked onto every submission when uploaded.
                </p>
              </div>
            </div>

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

      {/* 6. CALL TO ACTION BANNER */}
      <section className="w-full bg-[#581335] dark:bg-[#3D0A23] py-20 sm:py-24 px-4 sm:px-6 lg:px-8 text-center transition-colors">
        <div className="max-w-4xl mx-auto space-y-6 reveal-on-scroll">
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium !text-white tracking-tight leading-[1.15]">
            Start building toward your <br className="hidden sm:inline" />
            first $400 payout.
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Record original 3-minute ASMR. Earn $50 per approved video with reliable direct bank deposits.
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
