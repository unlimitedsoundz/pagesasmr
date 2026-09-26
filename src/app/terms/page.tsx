import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Terms of Service | The Pink Room — Page Turning',
  description:
    'Terms of service and legal agreement for contributing faceless page-turning ASMR creators on The Pink Room platform. Clear IP rights, compensation, and quality standards.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  const sections = [
    {
      num: '01',
      title: 'Eligibility & Age Requirement (18+)',
      desc: 'You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to apply as a creator, submit videos, or receive financial disbursements. By checking the age confirmation during onboarding or submission, you warrant that you are 18 or older. Minors are strictly prohibited from contributing or appearing in any video.',
    },
    {
      num: '02',
      title: 'Intellectual Property & Content Ownership',
      desc: 'You retain full copyright and moral rights in your original recordings. We do not take ownership or transfer intellectual property away from creators. By uploading a submission, you grant The Pink Room a non-exclusive, worldwide, royalty-free (subject to the agreed compensation described herein), transferable license to host, review, transcode, and distribute the approved submission.',
    },
    {
      num: '03',
      title: 'Acoustic Quality & Overhead Framing Standards',
      desc: 'The Pink Room is dedicated solely to sound relaxation and ASMR content. Submissions must feature gentle, authentic page turns and paper acoustics in an acoustically quiet room. Hands-only framing overlooking books, journals, or sketchbooks is required. No background music, television noise, or speech is permitted.',
    },
    {
      num: '04',
      title: 'Guaranteed Compensation & Minimum Threshold',
      desc: 'Every accepted video earns a guaranteed, flat rate of $10.00 USD, permanently stored with your submission record. First withdrawal unlocks upon accumulating at least 8 approved, unpaid videos ($80.00 USD). Subsequent payouts also require 8 approved videos.',
    },
    {
      num: '05',
      title: 'Non-Reversible Finality of Paid Videos',
      desc: 'Once a payout is released and confirmed with an official banking transaction reference, paid videos are marked Final and cannot be revoked, clawed back, or deducted. You own your earnings permanently.',
    },
    {
      num: '06',
      title: 'Content Revisions & Editorial Review',
      desc: 'Our editorial team reserves the right to review submissions for audio quality, framing, and guidelines. When an issue is addressable (such as a temporary background sound or minor lighting adjustment), we issue a Revision Request allowing you to re-upload without penalty.',
    },
    {
      num: '07',
      title: 'Account Creation & Verification',
      desc: 'You must provide accurate information, keep your password secure, and maintain only accounts you are authorized to use. We may verify age, identity, account ownership, payout details, and anti-fraud signals before accepting content or releasing funds.',
    },
    {
      num: '08',
      title: 'Creator Obligations & Content Standards',
      desc: 'You are responsible for recording original, lawful content that follows the current guidelines. Do not submit copyrighted material you cannot license, private or confidential pages, deceptive recordings, explicit material, harmful content, background music, speech, or content made by someone else. You must promptly correct inaccurate account or payout information.',
    },
    {
      num: '09',
      title: 'Copyright License and Distribution',
      desc: 'You grant the platform the limited non-exclusive license needed to receive, store, review, transcode, display internally, distribute, and promote approved submissions. You retain ownership. The license does not allow us to claim authorship of your work and ends for rejected material except where retention is required for records, disputes, security, or law.',
    },
    {
      num: '10',
      title: 'Approval, Rejection, and Revision Process',
      desc: 'Submission is not acceptance. We may approve, reject, request a revision, hold, or remove a submission based on quality, safety, rights, duplication, fraud, technical validity, or business needs. A revision request preserves the submission history but does not guarantee approval or payment.',
    },
    {
      num: '11',
      title: 'Duplicate Submissions and Fraud',
      desc: 'We may compare files, metadata, accounts, devices, payout details, and other signals to detect duplicates, impersonation, manipulation, collusion, or abuse. Duplicate or fraudulent submissions may be rejected, removed from payout calculations, or referred to the appropriate authorities.',
    },
    {
      num: '12',
      title: 'Payment Requests, Taxes, and Processing',
      desc: 'An approved video earns the agreed rate recorded at upload. A payout request is subject to the displayed threshold, review, available funds, account verification, processor rules, and applicable law. You are responsible for taxes and reporting on your earnings. Payment processors, banks, currency conversion, or receiving institutions may impose their own fees or delays.',
    },
    {
      num: '13',
      title: 'Failed Payments and Corrections',
      desc: 'If a payment fails, is returned, is sent to incorrect details supplied by you, or contains an administrative error, we may pause processing, request corrected information, retry the payment, or correct the ledger. A payout is final only when the platform records a completed transfer reference, subject to rights and remedies required by law.',
    },
    {
      num: '14',
      title: 'Suspension and Termination',
      desc: 'We may restrict, suspend, or terminate an account for breaches, fraud risk, unsafe or unlawful content, repeated quality failures, payment issues, inactivity, or legal obligations. We may preserve necessary records after termination. You may request account deletion, but deletion does not erase records we must retain for legal, accounting, payment, security, or dispute purposes.',
    },
    {
      num: '15',
      title: 'Disputes, Liability, and Service Availability',
      desc: 'Contact support first so we can investigate account, review, or payment concerns. To the extent allowed by law, the service is provided without a guarantee of uninterrupted availability, review timing, acceptance, income, or processor availability. Nothing in these terms excludes liability that cannot legally be excluded, including fraud or rights that apply to consumers in your jurisdiction.',
    },
    {
      num: '16',
      title: 'Governing Law and Changes',
      desc: 'Applicable governing law, venue, consumer protections, and dispute procedures may depend on where you live and where the platform operates. We may update these terms as the service changes. Material updates will be posted with a revised date; continued use after the effective date means you accept the updated terms to the extent permitted by law.',
    },
    {
      num: '17',
      title: 'Contact',
      desc: 'Questions about these terms, a review decision, account access, or payments can be sent to notifications@pinkroom.online. Do not email passwords, full payment credentials, or identity documents unless support gives you a secure, specific process.',
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            CREATOR AGREEMENT
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Creator terms of <br />
            service.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Transparent legal commitments: complete copyright retention, guaranteed $10 rates, and ethical standards.
          </p>
        </div>
      </section>

      {/* 2. MAIN TERMS CONTENT */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
          {sections.map((sec, idx) => (
            <div
              key={sec.num}
              className={`flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-12 pb-16 border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-b-0 last:pb-0 reveal-on-scroll reveal-delay-${(idx % 3) + 1}`}
            >
              <div className="md:w-5/12">
                <span className="block font-serif text-5xl sm:text-6xl font-medium text-[#F472B6] dark:text-pink-400 mb-2">
                  {sec.num}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white tracking-tight leading-snug">
                  {sec.title}
                </h2>
              </div>
              <div className="md:w-7/12">
                <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {sec.desc}
                </p>
              </div>
            </div>
          ))}
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
