'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  AlertCircle,
  ArrowRight,
  Lock,
  Download,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function CreatorAgreementPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState<{
    signed: boolean;
    signed_at: string | null;
    signature_name: string | null;
    creator_name?: string;
    creator_email?: string;
  } | null>(null);

  // Form State
  const [signatureName, setSignatureName] = useState('');
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [confirmedTerms, setConfirmedTerms] = useState(false);
  const [confirmedOriginal, setConfirmedOriginal] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('/api/creator/agreement')
      .then((res) => res.json())
      .then((data) => {
        setAgreementStatus(data);
        if (data.creator_name) {
          setSignatureName(data.creator_name);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!signatureName.trim()) {
      setFormError('Please enter your full legal name as your electronic signature.');
      return;
    }

    if (!confirmedAdult || !confirmedTerms || !confirmedOriginal) {
      setFormError('You must check all three declarations before executing this agreement.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/creator/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_name: signatureName.trim(),
          confirmed_adult: confirmedAdult,
          confirmed_terms: confirmedTerms,
          confirmed_original: confirmedOriginal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign agreement.');
      }

      setAgreementStatus({
        signed: true,
        signed_at: data.signed_at,
        signature_name: data.signature_name,
        creator_name: data.profile?.display_name || signatureName,
        creator_email: data.profile?.email,
      });

      toast.success(
        'You are now certified to create and upload videos to The Pink Room.',
        'Agreement Signed Successfully'
      );
    } catch (err: any) {
      setFormError(err.message || 'Error executing agreement.');
      toast.error(err.message || 'Could not complete signature.', 'Signing Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 px-4">
        <div className="w-8 h-8 border-2 border-neutral-800 dark:border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">Loading Creator Agreement...</div>
      </div>
    );
  }

  const isSigned = agreementStatus?.signed;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-2 text-center sm:text-left border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-neutral-900 dark:text-[#F0F0F6]">
          Master Creator & Independent Contractor Agreement
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
          This legally binding agreement outlines production guidelines, content ownership, faceless privacy
          guarantees, and guaranteed payouts ($50.00/approved video with $400.00 minimum disbursements).
        </p>
      </div>

      {/* Signed Status Banner (if already executed) */}
      {isSigned && (
        <div className="p-6 rounded-xl bg-neutral-100 dark:bg-[#1C1C21] border border-neutral-300 dark:border-[#383842] space-y-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-[#F0F0F6]">
              Agreement Executed & Active
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Electronically signed by{' '}
              <strong className="font-semibold underline text-neutral-900 dark:text-white">
                {agreementStatus?.signature_name || 'Creator'}
              </strong>{' '}
              on {agreementStatus?.signed_at ? new Date(agreementStatus.signed_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : 'file'}.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-200 dark:border-[#2E2E38] flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
              Certificate ID: <code className="font-mono bg-neutral-200 dark:bg-[#2A2A33] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-[#3E3E4D] text-neutral-800 dark:text-[#F0F0F6]">{agreementStatus?.signature_name?.toLowerCase().replace(/\s+/g, '-')}-cert</code>
            </div>
            <Link
              href="/creator/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white text-xs font-bold transition-all shadow-sm"
            >
              <span>Proceed to Video Upload</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Agreement Terms Document View */}
      <div className="bg-white dark:bg-[#1C1C21] rounded-2xl border border-neutral-200 dark:border-[#2E2E38] shadow-sm overflow-hidden">
        {/* Document Header */}
        <div className="bg-neutral-50 dark:bg-[#161619] px-6 py-4 border-b border-neutral-200 dark:border-[#2E2E38] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Document Ref: TPR-CREATOR-AGR-2026
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
            Effective Immediately Upon Electronic Execution
          </span>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 sm:p-8 space-y-8 text-xs sm:text-sm text-neutral-700 dark:text-[#D2D2DE] leading-relaxed max-h-[550px] overflow-y-auto">
          {/* Preamble */}
          <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-6">
            <h2 className="text-base font-bold text-neutral-900 dark:text-[#F0F0F6] font-serif">
              Preamble & Parties
            </h2>
            <p>
              This Creator Agreement (&quot;Agreement&quot;) is made and entered into by and between{' '}
              <strong>The Pink Room</strong> (&quot;Platform&quot;, &quot;Company&quot;, &quot;We&quot;) and the individual
              accessing and executing this document (&quot;Creator&quot;, &quot;You&quot;). By electronically signing below,
              you agree to all terms, policies, payment structures, and content standards established herein.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              1. Independent Contractor Status
            </h3>
            <p>
              Creator operates exclusively as an independent contractor and not as an employee, agent, partner, or
              joint venturer of The Pink Room. Creator is solely responsible for determining the manner and means of
              recording, subject only to Platform quality standards and technical specifications. Creator is solely
              responsible for all local, state, and federal taxes arising from compensation received.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              2. Content Production & Quality Standards
            </h3>
            <p>
              All video submissions submitted through the Creator Portal must strictly satisfy the following minimum
              criteria:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 pt-1 text-neutral-600 dark:text-neutral-300">
              <li>
                <strong>Category Focus:</strong> Original faceless page-turning ASMR using long press-on nails, flipping from the edges of pages with 2 middle fingers like the sample.
              </li>
              <li>
                <strong>Duration Requirement:</strong> Every submission must be at least <strong>three (3) full minutes</strong> (180 seconds)
                of uninterrupted, continuous recording.
              </li>
              <li>
                <strong>Audio Quality:</strong> Clean audio with crisp page-turning and nail sound acoustics without
                distorting background static, blaring music, or third-party background voices.
              </li>
              <li>
                <strong>Faceless Protection & Clothing:</strong> Full faces are strictly not required and discouraged for
                creator anonymity. Appropriate attire (e.g., shorts, skirts, pants) must be maintained at all times.
                Sexually explicit, naked, or pornographic content is strictly prohibited and results in immediate permanent bans.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              3. Compensation & Payout Structure
            </h3>
            <p>
              The Pink Room guarantees a fixed-rate compensation model for content meeting our quality review:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#161619] space-y-1">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  USD $50.00 / Approved Video
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Credited to your creator ledger upon formal review and approval by platform administrators.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#161619] space-y-1">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  8 Approved Videos = $400.00 Payout
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Minimum withdrawal threshold is 8 approved videos ($400.00). Payments are disbursed via PayPal, Mobile Money, Local Bank Transfer, or Direct Deposit.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              4. Commercial Rights & Licensing
            </h3>
            <p>
              Upon receipt of compensation, Creator grants The Pink Room a perpetual, worldwide, irrevocable,
              exclusive commercial license to publish, stream, distribute, syndicate, and monetize the approved
              video content across all media platforms. Creator retains moral rights and the right to remain completely
              faceless and anonymous.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              5. Warranties & Originality
            </h3>
            <p>
              Creator warrants that: (a) Creator is at least 18 years old; (b) Creator is the sole and original author
              of all audio and video recorded; (c) the content contains zero copyrighted audio, third-party watermarks, or
              unauthorized material; and (d) the content does not violate any law or third-party right.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-[#F0F0F6] uppercase tracking-wide">
              6. Term & Termination
            </h3>
            <p>
              This Agreement remains active until terminated by either party with written notice. Any approved videos
              and disbursed payments prior to termination remain governed under the commercial license provisions in
              Section 4.
            </p>
          </div>
        </div>

        {/* Signing Area */}
        {!isSigned ? (
          <form onSubmit={handleSignAgreement} className="bg-neutral-50 dark:bg-[#161619] p-6 sm:p-8 border-t border-neutral-200 dark:border-[#2E2E38] space-y-6">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-[#F0F0F6]">
                Execute Agreement & Certify Creator Status
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Please review each required certification below and enter your legal name to complete signature.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1C1C21] border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-neutral-400 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedAdult}
                  onChange={(e) => setConfirmedAdult(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                  <strong>Age Verification:</strong> I confirm and certify under penalty of perjury that I am at least 18 years old and legally competent to enter into this contract.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1C1C21] border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-neutral-400 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedOriginal}
                  onChange={(e) => setConfirmedOriginal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                  <strong>Original Creation Guarantee:</strong> I certify that all video and audio submitted will be 100% original, recorded solely by me, lasting at least 3 minutes, with no nudity or copyrighted media.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1C1C21] border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-neutral-400 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedTerms}
                  onChange={(e) => setConfirmedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                  <strong>Terms & Payment Agreement:</strong> I have read and agree to all terms of this Master Creator Agreement, including the $50/video rate, $400 payout threshold, and commercial rights terms.
                </span>
              </label>
            </div>

            {/* Signature Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-900 dark:text-[#F0F0F6]">
                  Full Legal Name (Electronic Signature)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181D] text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Typing your legal name constitutes a binding legal signature.
                </span>
              </div>

              {/* Digital Preview */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#1C1C21] border border-neutral-200 dark:border-neutral-800 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  Signature Preview
                </span>
                <div className="font-serif italic text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 truncate pt-1">
                  {signatureName.trim() ? signatureName.trim() : 'Your Signature'}
                </div>
                <span className="text-[10px] text-neutral-400 pt-0.5">
                  Timestamp: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                256-bit encrypted audit log stored
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-bold text-sm disabled:opacity-50 transition-colors shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Executing Agreement...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>Execute & Sign Agreement</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-neutral-50 dark:bg-[#161619] p-6 sm:p-8 border-t border-neutral-200 dark:border-[#2E2E38] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                Signature on File: {agreementStatus?.signature_name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Executed on {agreementStatus?.signed_at ? new Date(agreementStatus.signed_at).toLocaleString() : 'Active'}
              </div>
            </div>

            <Link
              href="/creator/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-bold text-xs transition-colors"
            >
              Start Creating Videos →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
