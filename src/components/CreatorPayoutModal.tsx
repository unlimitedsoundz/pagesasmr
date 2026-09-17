'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Copy,
  Check,
  Building2,
  User,
  Hash,
  Mail,
  Phone,
  FileText,
  Code,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Ban,
} from 'lucide-react';
import { formatCreatorPayoutInfo, FormattedPayoutInfo } from '@/lib/payoutDetails';

interface CreatorPayoutModalProps {
  creator?: any;
  payout?: any;
  isOpen: boolean;
  onClose: () => void;
  onBan?: (creator: any) => void;
}

export default function CreatorPayoutModal({
  creator,
  payout,
  isOpen,
  onClose,
  onBan,
}: CreatorPayoutModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!isOpen) return null;

  const info: FormattedPayoutInfo = formatCreatorPayoutInfo(creator, payout);

  const handleCopy = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const creatorName = creator?.display_name || payout?.creator_name || 'Creator';
  const creatorEmail = creator?.email || payout?.creator_email || '';
  const creatorCountry = creator?.country || '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#fff9fb] rounded-2xl border border-[#f2e3e8] max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative text-neutral-900 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#f2e3e8] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-[#7B1E4B] flex items-center justify-center font-bold text-xs border border-[#F8E2EC]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-black flex items-center gap-2">
                  <span>Creator Payout Details</span>
                </h3>
                <p className="text-xs text-neutral-600 font-medium">
                  {creatorName} {creatorEmail ? `• ${creatorEmail}` : ''} {creatorCountry ? `(${creatorCountry})` : ''}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Badge & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Disbursement Channel:
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${info.badgeColor}`}
            >
              {info.badgeLabel}
            </span>
          </div>
          <span className="text-xs font-semibold text-neutral-600">
            {info.methodLabel}
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {!info.isConfigured ? (
            <div className="p-6 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <div className="font-bold text-sm text-neutral-700">No Payout Details Configured</div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                This creator has not yet submitted their bank or electronic account details in their profile settings.
              </p>
            </div>
          ) : (
            <>
              {/* Primary Account Card */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs divide-y divide-neutral-100">
                {info.lines.map((line, idx) => {
                  const isAccountNum =
                    line.label.toLowerCase().includes('account') ||
                    line.label.toLowerCase().includes('nuban') ||
                    line.label.toLowerCase().includes('routing');
                  const copyKey = `line_${idx}`;
                  const isCopied = copiedKey === copyKey;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50/70 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                          {line.label}
                        </div>
                        <div
                          className={`text-black select-all ${
                            isAccountNum
                              ? 'font-mono text-sm sm:text-base font-bold text-[#7B1E4B]'
                              : 'text-xs sm:text-sm font-semibold'
                          }`}
                        >
                          {line.value}
                        </div>
                      </div>

                      {line.copyable && (
                        <button
                          type="button"
                          onClick={() => handleCopy(copyKey, line.value)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-[#FDF2F4] text-[#7B1E4B] border-[#F8E2EC] hover:bg-[#F8E2EC]'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy {line.label.includes('Number') ? 'Number' : ''}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action: Copy All Banking Details */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy('all', info.fullCopyText)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border shadow-xs ${
                    copiedKey === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-[#7B1E4B] text-white border-[#63183C] hover:bg-[#63183C]'
                  }`}
                >
                  {copiedKey === 'all' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>All Banking Details Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Full Account Information</span>
                    </>
                  )}
                </button>
              </div>

              {/* Optional Payout Request Context */}
              {payout && (
                <div className="bg-[#fcf3f6] p-3 rounded-xl border border-[#f5dbe4] text-xs space-y-1">
                  <div className="font-bold text-[#7B1E4B] text-[11px] uppercase tracking-wider">
                    Associated Payout Request
                  </div>
                  <div className="text-neutral-700 font-medium">
                    Requested Amount: <strong className="text-black">${payout.amount_usd?.toFixed(2)} USD</strong> ({payout.video_count} videos)
                  </div>
                  {payout.payment_destination && (
                    <div className="text-[11px] text-neutral-600 font-mono break-all">
                      Recorded destination: {payout.payment_destination}
                    </div>
                  )}
                </div>
              )}

              {/* Raw JSON Debugger Accordion */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Raw Storage Payload (Audit)</span>
                  </span>
                  {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawJson && (
                  <div className="p-3 bg-neutral-900 text-neutral-100 text-[11px] font-mono overflow-x-auto max-h-40">
                    <pre>{JSON.stringify(info.rawDetails || {}, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#f2e3e8] pt-3 flex items-center justify-between gap-3">
          <div>
            {onBan && creator && !creator.is_banned && (
              <button
                type="button"
                onClick={() => onBan(creator)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                title="Permanently ban this creator and blacklist their accounts"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Ban & Blacklist</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
