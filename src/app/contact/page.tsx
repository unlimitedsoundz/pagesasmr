'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, ArrowRight, Send } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'RECORDING_GUIDELINES',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-14 pb-16 sm:pt-20 sm:pb-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 reveal-on-scroll">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#9D174D] dark:text-pink-300">
            SUPPORT & COMMUNICATIONS
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
            We're here <br />
            to help.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Need clarification on page-turning guidelines, acoustic requirements, or payouts? Contact our studio team.
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTACT SECTION */}
      <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-y border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Direct Contact Sidebar */}
            <div className="md:col-span-4 space-y-6 reveal-on-scroll">
              <div className="bg-[#FAFAFA] dark:bg-[#221C28] p-7 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-4">
                <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#1C1520] dark:text-white">
                  Direct Contact
                </h3>
                <div className="space-y-3.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#9D174D] dark:text-pink-400 shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold text-[#1C1520] dark:text-white">Official Platform Email</div>
                      <a
                        href="mailto:notifications@pinkroom.online"
                        className="text-[#9D174D] dark:text-pink-400 font-medium hover:underline break-all"
                      >
                        notifications@pinkroom.online
                      </a>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Editorial, guidelines, reviews & creator inquiries
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Operating hours: Monday – Friday (9:00 AM – 6:00 PM EST).
                </div>
              </div>

              <div className="bg-[#FDF2F7] dark:bg-[#2A1725] p-6 rounded-2xl border border-[#FCE7F3] dark:border-[#4E213E] text-xs text-[#5B1B38] dark:text-pink-200 space-y-2">
                <div className="font-bold text-sm">Quick Checklist</div>
                <p>• Videos must be at least 180 seconds unbroken.</p>
                <p>• Payout unlocks at 8 approved videos ($80).</p>
                <p>• 100% original, faceless page turning recorded with care.</p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-8 reveal-on-scroll reveal-delay-1">
              <div className="bg-[#FAFAFA] dark:bg-[#221C28] p-7 sm:p-10 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
                {submitted ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[#FDF2F7] dark:bg-[#2A1725] text-[#9D174D] dark:text-pink-300 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white">
                      Inquiry Received
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
                      Thank you for reaching out. An editorial review representative will review your message and reply to{' '}
                      <strong className="text-[#1C1520] dark:text-white">{formData.email}</strong> within 1 business day.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="px-6 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-white text-xs font-medium transition-colors"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1620] text-[#1C1520] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#BE185D]/40 transition-shadow"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1620] text-[#1C1520] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#BE185D]/40 transition-shadow"
                          placeholder="creator@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Inquiry Topic
                      </label>
                      <select
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1620] text-[#1C1520] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#BE185D]/40 transition-shadow"
                      >
                        <option value="RECORDING_GUIDELINES">Page Turning Guidelines & Standards</option>
                        <option value="SUBMISSION_REVIEW">Submission Review & Revisions</option>
                        <option value="EARNINGS_PAYOUT">Earnings & Payout Methods</option>
                        <option value="ACCOUNT_ACCESS">Creator Account & Sign In</option>
                        <option value="OTHER">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1A1620] text-[#1C1520] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#BE185D]/40 transition-shadow"
                        placeholder="Provide details about your question..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-white text-sm font-medium transition-all shadow-sm active:scale-[0.99]"
                    >
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
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
