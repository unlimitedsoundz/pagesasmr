import React from 'react';
import Link from 'next/link';
import {
  Clock,
  BrickWall,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import GuidelineSamplePlayer from '@/components/GuidelineSamplePlayer';

export const metadata: Metadata = {
  title: 'Recording Guidelines & Standards | The Pink Room — Page Turning',
  description:
    'Comprehensive recording and audio quality standards for faceless page-turning ASMR creators. Sample specifications for paper acoustics, framing, and minimum duration.',
  alternates: {
    canonical: '/guidelines',
  },
};

export default function RecordingGuidelinesPage() {
  const coreRules = [
    {
      num: '01',
      title: 'Acoustic Paper Sounds & Sound Quality',
      desc: 'The Pink Room is a sound relaxation and ASMR platform. All submissions must feature clear, crisp paper turns and page brushing in an acoustically quiet room.',
      dos: [
        'Record with long press nails gently turning and brushing against pages for signature ASMR acoustic texture.',
        'Ensure the room is completely quiet with zero television, conversation, or background hum.',
        'Keep microphone gain clean and close to the reading surface without distortion.',
        'Maintain a calming, gentle pace throughout the recording.',
      ],
      donts: [
        'Zero background music, synthetic ambient beats, or television bleed.',
        'No talking or whispering unless specifically requested for a project.',
        'No aggressive ripping, loud slamming, or jarring sudden movements.',
      ],
    },
    {
      num: '02',
      title: 'Duration: At Least 3 Minutes (180s+)',
      desc: 'Every submitted video must have an unbroken runtime of at least 3 minutes. Our server automatically validates container metadata upon upload. Files under 3 minutes are rejected with an explicit error message.',
      dos: [
        'Record 3 minutes and 15 seconds to leave a safe margin.',
        'Keep page-turning actions active and continuous throughout the 3+ minutes.',
      ],
      donts: [
        'Do not upload loops or repeated clips to pad duration.',
        'Do not rely solely on user-entered duration or browser length estimates.',
      ],
    },
    {
      num: '03',
      title: 'Seating & Camera Setup (Tripod & Overhead Framing)',
      desc: 'To keep consistent video framing and clear audio quality, creators must record from a stationary seated position with fixed camera height.',
      dos: [
        'Sit on a chair and table setup with the reading material flat or gently propped.',
        'Keep the camera mounted on a tripod or stable stand overlooking the pages.',
        'Focus completely on hands, long press nails, and reading material.',
        'Use soft, balanced lighting so pages are clearly visible with no harsh glare.',
      ],
      donts: [
        'Do not hold your camera while recording (hand-held camera work is strictly prohibited).',
        'Do not show confidential personal information, bank details, or addresses.',
      ],
    },
    {
      num: '04',
      title: 'Original Content & Rights Ownership',
      desc: 'All recordings must be 100% original, created and recorded by you. Materials featured should be public domain books, journals, or personal notebooks.',
      dos: [
        'Record your own original performance in your personal environment.',
        'Confirm adult status (18+) for creator account registration.',
        'Feature books, art notebooks, sketchbooks, or magazines you have permission to show.',
      ],
      donts: [
        'Do not use third-party video clips, stock footage, or re-uploads.',
        'Never upload content featuring minors under 18 years old.',
        'No watermarks or social media handles burned into the video.',
      ],
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            STANDARDS & PRACTICES
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Recording & quality <br />
            guidelines.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Simple, non-negotiable rules for clean paper acoustics, tranquil mood, and hands-only framing.
          </p>
        </div>
      </section>

      {/* 2. MAIN GUIDELINES CONTENT */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Official Benchmark Sample Player */}
          <div className="reveal-on-scroll">
            <GuidelineSamplePlayer />
          </div>

          {/* Core Rules List */}
          <div className="space-y-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#1C1520] dark:text-white tracking-tight reveal-on-scroll">
              Submission Requirements
            </h2>

            {coreRules.map((rule) => (
              <div
                key={rule.num}
                className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-12 pb-14 border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-b-0 last:pb-0 reveal-on-scroll"
              >
                <div className="md:w-5/12">
                  <span className="block font-serif text-5xl sm:text-6xl font-medium text-[#F472B6] dark:text-pink-400 mb-2">
                    {rule.num}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white tracking-tight leading-snug">
                    {rule.title}
                  </h3>
                </div>

                <div className="md:w-7/12 space-y-5">
                  <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {rule.desc}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Dos */}
                    <div className="bg-[#FDF2F7] dark:bg-[#2A1725] p-4 rounded-xl border border-[#FCE7F3] dark:border-[#4E213E] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D174D] dark:text-pink-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        What We Look For
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#5B1B38] dark:text-pink-200">
                        {rule.dos.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-bold shrink-0">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Don'ts */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Common Rejection Causes
                      </span>
                      <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        {rule.donts.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-bold shrink-0">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revision Note */}
          <div className="bg-[#FAFAFA] dark:bg-[#221C28] border border-neutral-200/90 dark:border-neutral-700/60 rounded-2xl p-6 sm:p-8 space-y-2.5 reveal-on-scroll">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1520] dark:text-white">
              <HelpCircle className="w-4 h-4 text-[#9D174D] dark:text-pink-400 shrink-0" />
              <span>What Happens If a Video Needs Changes?</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              If our review team spots an addressable issue (such as temporary mic distortion or duration falling short), we issue a <strong>Revision Request</strong> with specific notes. You can re-upload an updated file directly from your dashboard, preserving your submission history without penalty.
            </p>
          </div>
        </div>
      </section>

      {/* 3. THREE RULES SUMMARY SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white text-center mb-12 tracking-tight reveal-on-scroll">
            Three rules. Nothing hidden.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* 4. CALL TO ACTION BANNER */}
      <section className="w-full bg-[#581335] dark:bg-[#3D0A23] py-20 sm:py-24 px-4 sm:px-6 lg:px-8 text-center transition-colors">
        <div className="max-w-4xl mx-auto space-y-6 reveal-on-scroll">
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium !text-white tracking-tight leading-[1.15]">
            Ready to upload your <br className="hidden sm:inline" />
            first recording?
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Record at least 3 minutes, verify page sound clarity, and submit directly to your dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/creator/upload"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-pink-50 text-[#581335] font-semibold text-sm sm:text-base transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
            >
              <span>Go to Video Uploader</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
