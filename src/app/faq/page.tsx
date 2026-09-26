'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqPage() {
  const faqs: FaqItem[] = [
    {
      q: 'What does "faceless" mean for creators on this platform?',
      a: '“Faceless” refers to content framing that preserves your personal privacy: you are never required to show your full face. For page-turning ASMR, the camera is pointed downward at your hands, long press nails, and the physical book pages while seated. Your eyes, forehead, and full facial profile remain completely off-camera.',
    },
    {
      q: 'Why is there an eight-video minimum threshold for payouts?',
      a: 'To keep payment processing sustainable and minimize transaction overhead, earnings accumulate until you reach at least 8 approved, unpaid videos (8 × $10 = $80.00). Once reached, you can request a payout immediately for 8, 10 ($100), 16 ($160), or more approved submissions.',
    },
    {
      q: 'Can I request a payout if I have 7 approved videos ($350)?',
      a: 'No. The platform strictly enforces the 8-video threshold ($80). If you have 7 approved videos, you simply need 1 more approved video to unlock your payout. Pending, rejected, or revision-requested videos do not count toward this minimum.',
    },
    {
      q: 'Why was my video rejected for duration if it was 2 minutes and 55 seconds?',
      a: 'Our recording guidelines strictly mandate a minimum duration of 180 seconds (3:00 minutes). When you upload, our server inspects the container header metadata directly. Files shorter than 180 seconds are automatically rejected. We recommend recording at least 3 minutes and 15 seconds to ensure you easily clear the cutoff.',
    },
    {
      q: 'Who owns the copyright in my videos?',
      a: 'You retain copyright in all original recordings you submit. By submitting, you grant The Pink Room a non-exclusive license to review, store, and commercially distribute the audio/video. We do not take ownership of your intellectual property.',
    },
    {
      q: 'What happens if an admin requests a revision?',
      a: 'If a recording has high potential but contains an addressable issue (e.g., an AC hum in the background, low lighting, or clipping audio), the admin will not reject it. Instead, they will mark it as "Revision Requested" with detailed guidance. You can upload an updated version directly from your dashboard without forfeiting your spot in the review queue.',
    },
    {
      q: 'What equipment do I need to get started?',
      a: 'A modern smartphone mounted on a stable tripod or desktop arm looking down at the book is all you need: do not hold your camera while recording. Record in an acoustically quiet room with fans and air conditioning turned off during recording.',
    },
    {
      q: 'What reading materials should I use for page-turning videos?',
      a: 'You can use classic hardcover books, vintage paperbacks, art journals, notebooks, or sketchbooks. Ensure pages are clean, non-confidential, and non-explicit.',
    },
    {
      q: 'How does the agreed $10 rate work if platform rates change?',
      a: 'Every submission permanently stores the agreed rate ($10.00 USD) at the moment of upload. If the platform ever adjusts rates in the future, existing submissions are immutable and will still be paid out at the rate agreed upon when uploaded.',
    },
    {
      q: 'How are payouts sent to creators?',
      a: 'Payouts are disbursed via Direct Deposit (ACH for US creators), PayPal, Mobile Money (M-Pesa, MTN, Airtel), Local Bank Transfer, or Wire Transfer. Every completed payout is logged with an official bank reference or transaction code.',
    },
    {
      q: 'Are there any fees or hidden subscription costs to join?',
      a: 'No. The Pink Room is 100% free for creators. There are no registration fees, platform monthly charges, or equipment deductions.',
    },
    {
      q: 'Who can join?',
      a: 'Adults aged 18 or older who can record original page-turning ASMR in a quiet setting may apply. You must be able to accept the creator agreement and provide accurate payout information when you become eligible.',
    },
    {
      q: 'Which countries are supported?',
      a: 'Creators may apply from countries where The Pink Room can legally review content and send a supported payout. Available payment methods vary by country, so confirm your destination during onboarding or contact support before recording a full batch.',
    },
    {
      q: 'What information is required to register?',
      a: 'Registration requires your name, email address, country, date of birth or adult confirmation, password, and acceptance of the creator terms. Payout details are requested separately when you prepare to withdraw.',
    },
    {
      q: 'How is identity verified?',
      a: 'We use account, age, agreement, and payout information to verify eligibility and prevent fraud. We may request additional information when required for payment compliance. Never send passwords, PINs, or full banking credentials by email.',
    },
    {
      q: 'How long does approval take?',
      a: 'Review timing depends on queue volume and recording quality. The dashboard shows whether a submission is awaiting review, approved, rejected, or needs revision. We do not guarantee a fixed review time.',
    },
    {
      q: 'What causes rejection?',
      a: 'Common reasons include recordings under three minutes, background noise, speech or music, unstable framing, poor lighting, unsupported content, duplicate files, copyright concerns, or failure to follow the recording guidelines.',
    },
    {
      q: 'Can rejected submissions be resubmitted?',
      a: 'A submission marked Revision Requested can be re-uploaded from your creator dashboard and keeps its version history. A rejected submission may not be resubmittable; follow the admin note or contact support for clarification.',
    },
    {
      q: 'How are earnings calculated?',
      a: 'Each approved full video earns the agreed $10 USD rate recorded with that submission. Pending, rejected, duplicate, and revision-requested videos do not count toward the payout balance.',
    },
    {
      q: 'When can I withdraw?',
      a: 'You can request a payout once you have at least 8 approved, unpaid full videos, equal to the $80 minimum threshold. The payout page shows your eligible balance and whether the request button is available.',
    },
    {
      q: 'How long do payouts take?',
      a: 'Payout requests are reviewed and processed during normal payment operations. Timing depends on verification, your payment method, country, weekends, and banking networks. A completed payout is recorded with a payment reference.',
    },
    {
      q: 'Are there payout fees?',
      a: 'The Pink Room does not add a creator subscription fee. Third-party payment, bank, currency-conversion, or receiving fees may apply depending on your chosen method and country; any known deductions are shown before confirmation where possible.',
    },
    {
      q: 'What happens if payment fails?',
      a: 'The payout is not treated as completed. We may ask you to correct the destination or provide updated information, and the eligible earnings remain subject to the payout status shown in your account.',
    },
    {
      q: 'How can I delete my account?',
      a: 'Contact support from the email associated with your account and request deletion. We will verify the request, explain any records we must retain for legal, fraud, accounting, or payment reasons, and remove or anonymize eligible data.',
    },
    {
      q: 'How is personal information protected?',
      a: 'We restrict access to account, submission, and payout information, use authenticated access controls for private recordings, and disclose data only as described in the Privacy Policy or when required to operate the service or comply with law.',
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            QUESTIONS & ANSWERS
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Everything you <br />
            need to know.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Clear answers about faceless recording, editorial review cycles, and payout processing.
          </p>
        </div>
      </section>

      {/* 2. FAQ ACCORDION SECTION */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          {faqs.map((faq, idx) => {
            return (
              <div
                key={idx}
                className="border-b border-neutral-200/80 dark:border-neutral-800/80 last:border-b-0 pb-5 pt-3 reveal-on-scroll"
              >
                <div className="w-full text-left flex items-start justify-between gap-4 py-2">
                  <span className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white group-hover:text-[#9D174D] dark:group-hover:text-pink-300 transition-colors leading-snug">
                    {faq.q}
                  </span>
                </div>
                <div className="pt-2 pb-3 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 leading-relaxed pr-8">
                  <p>{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. THREE RULES SECTION */}
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
            Still have questions? <br className="hidden sm:inline" />
            We're here to help.
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Reach out directly to notifications@pinkroom.online for personal creator support.
          </p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-pink-50 text-[#581335] font-semibold text-sm sm:text-base transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
