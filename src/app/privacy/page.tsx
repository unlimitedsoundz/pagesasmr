import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy & Video Protection | The Pink Room — Page Turning',
  description:
    'Our privacy commitments: encrypted storage, authenticated private streaming, zero face-reveal requirement, and strict creator data protection.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  const sections = [
    {
      num: '01',
      title: 'Who operates the service',
      desc: 'The Pink Room — Page Turning operates pages.pinkroom.online as a creator platform. Privacy questions and data requests can be sent to notifications@pages.pinkroom.online. This notice describes our current practices and should be reviewed with qualified legal counsel for your jurisdiction.',
    },
    {
      num: '02',
      title: 'Private Video Storage & Protected Streaming',
      desc: 'All submitted audio and video recordings are stored in private, access-controlled storage. Video assets are NEVER made publicly discoverable or indexed by search engines. Video playback is protected via authenticated endpoints with server authorization checks: only you (the contributing creator) and authenticated platform administrators can view or stream your private recordings.',
    },
    {
      num: '03',
      title: 'Faceless Anonymity & Creator Identity',
      desc: 'We celebrate and uphold faceless creators. You are never required to display your legal name publicly; your chosen Display Name is used for submission logs and communications. Your real identity and country of residence are used solely for age verification and tax/financial disbursement compliance.',
    },
    {
      num: '04',
      title: 'Financial & Payout Information Handling',
      desc: 'To deliver payouts via PayPal, Mobile Money, Local Bank Transfer, or Direct Deposit (ACH), we collect routing details, bank identifiers, phone numbers, or payment emails. We use industry-standard encryption and never store raw unencrypted sensitive banking pins or credentials. Payment details are used exclusively to process verified creator disbursements.',
    },
    {
      num: '05',
      title: 'Data Retention & Account Rights',
      desc: 'You have the right to inspect your account details, submission records, and earnings ledger at any time through your dashboard. If you choose to delete your creator account, any pending unapproved drafts will be permanently purged from our servers.',
    },
    {
      num: '06',
      title: 'What we collect and why',
      desc: 'We collect account data such as name, email, country, age confirmation, password credentials, agreement signature, referral data, support messages, and creator profile details to provide the service and secure accounts. We collect submission files and metadata to review, store, deliver, detect duplicates, and administer content. We collect payout details and transaction references to verify eligibility and process payments. We collect technical data such as IP address, device/browser information, cookies, and logs for security, reliability, authentication, and abuse prevention.',
    },
    {
      num: '07',
      title: 'Legal bases and permitted disclosures',
      desc: 'Depending on your location, we process information to perform the creator agreement, provide requested services, comply with payment, tax, fraud-prevention, and legal obligations, protect the platform, and pursue legitimate operational interests. We may disclose necessary information to hosting, storage, email, authentication, analytics, security, and payment providers, professional advisers, or public authorities when legally required. We do not sell creator personal information.',
    },
    {
      num: '08',
      title: 'Hosting, payment processors, and international transfers',
      desc: 'The service may use Supabase and other infrastructure providers for databases, authentication, storage, email, monitoring, and delivery. Payment methods may involve PayPal, banks, ACH networks, mobile-money providers, or other processors available for your country. These providers may process information outside your country under their own terms and safeguards. Check the relevant provider notice before choosing a payment method.',
    },
    {
      num: '09',
      title: 'Cookies, analytics, and security logs',
      desc: 'We use essential cookies for sessions, authentication, preferences, uploads, and security. We may retain server logs and limited analytics information to diagnose outages, understand aggregate usage, prevent abuse, and improve the service. We do not use private video content for advertising profiles.',
    },
    {
      num: '10',
      title: 'Retention, deletion, and user rights',
      desc: 'We retain information for as long as needed to provide the service, complete reviews and payments, resolve disputes, prevent fraud, meet accounting or legal obligations, and enforce agreements. Depending on applicable law, you may request access, correction, deletion, restriction, portability, or objection to processing. Requests must come from the account email so we can verify identity. Some records may need to be retained after deletion.',
    },
    {
      num: '11',
      title: 'Security incidents and children',
      desc: 'We maintain access controls, private media routes, authentication checks, and operational safeguards, but no internet service can promise absolute security. If we identify a material incident, we will investigate, contain it, and provide notices required by applicable law. The service is for adults 18 and older; we do not knowingly collect or accept creator submissions from minors.',
    },
    {
      num: '12',
      title: 'Jurisdiction and updates',
      desc: 'Privacy obligations can differ by country. This notice may be updated when the service, providers, or legal requirements change; the effective version will be posted on this page. Contact privacy support at notifications@pinkroom.online for questions, rights requests, or concerns about this notice.',
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            PRIVACY & SECURITY
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            Your privacy is <br />
            paramount.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Encrypted storage, authenticated private streaming, zero face-reveal requirement, and strict creator data protection.
          </p>
        </div>
      </section>

      {/* 2. MAIN PRIVACY CONTENT */}
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

      {/* 4. CALL TO ACTION BANNER */}
      <section className="w-full bg-[#581335] dark:bg-[#3D0A23] py-20 sm:py-24 px-4 sm:px-6 lg:px-8 text-center transition-colors">
        <div className="max-w-4xl mx-auto space-y-6 reveal-on-scroll">
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium !text-white tracking-tight leading-[1.15]">
            Ready to make your <br className="hidden sm:inline" />
            first recording?
          </h2>
          <p className="text-sm sm:text-base !text-pink-100/90 max-w-xl mx-auto leading-relaxed">
            Join free, review the guidelines, and start building toward your first $400 payout.
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
