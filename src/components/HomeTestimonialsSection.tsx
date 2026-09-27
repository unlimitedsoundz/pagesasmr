'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, ArrowRight, ExternalLink, Eye, X, CheckCircle2 } from 'lucide-react';
import { Testimonial } from '@/types';
import { getLocalCurrency, formatLocalFx } from '@/lib/currency';

interface HomeTestimonialsSectionProps {
  title?: string;
  subtitle?: string;
}

export default function HomeTestimonialsSection({
  title = 'Real creators. Verified payouts.',
  subtitle = 'Every review is submitted alongside authentic receipt proof of bank, mobile money, or wallet transfer.',
}: HomeTestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<Testimonial | null>(null);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const res = await fetch('/api/testimonials', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.testimonials && Array.isArray(data.testimonials)) {
            setTestimonials(data.testimonials);
          }
        }
      } catch (err) {
        console.error('Failed to load testimonials on homepage:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTestimonials();
  }, []);

  return (
    <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 border-t border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCE7F3] dark:bg-[#2A1725] border border-[#FBCFE8] dark:border-[#4E213E] text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-300 uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COMMUNITY EXPERIENCES</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white leading-[1.12] tracking-tight">
              {title}
            </h2>
          </div>
          <div className="md:max-w-md space-y-4">
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {subtitle}
            </p>
            <div>
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#9D174D] dark:text-pink-300 hover:text-black dark:hover:text-white transition group"
              >
                <span>Browse all creator reviews & receipts</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white/60 dark:bg-[#201C24]/60 rounded-3xl p-7 h-64 border border-black/[0.04] dark:border-white/[0.05]"
              />
            ))}
          </div>
        ) : testimonials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 6).map((t) => {
              const country = t.creator_country || 'Nigeria';
              const cur = getLocalCurrency(country);
              const formattedFx = formatLocalFx(t.amount_usd, cur);

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#201C24] rounded-[28px] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] dark:border-white/[0.05] flex flex-col justify-between hover:shadow-md transition-shadow group"
                >
                  <div className="space-y-4">
                    {/* Header: Stars & Payout Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= t.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-200 dark:text-neutral-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        ${t.amount_usd.toFixed(0)} Paid
                      </span>
                    </div>

                    {/* Review text */}
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal line-clamp-4">
                      &ldquo;{t.review}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3.5">
                    {/* Receipt thumbnail button */}
                    {t.proof_image_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedProof(t)}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900 p-2.5 flex items-center gap-3 transition text-left group/btn"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shrink-0 relative">
                          <img
                            src={t.proof_image_url}
                            alt="Receipt thumbnail"
                            className="w-full h-full object-cover group-hover/btn:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-neutral-900 dark:text-white flex items-center gap-1">
                            <span>Payout Receipt</span>
                            <ExternalLink className="w-3 h-3 text-neutral-400" />
                          </div>
                          <div className="text-[10.5px] text-neutral-500 truncate">
                            {formattedFx}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#9D174D] dark:text-pink-300 group-hover/btn:underline shrink-0">
                          View
                        </span>
                      </button>
                    )}

                    {/* Creator Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FCE7F3] dark:bg-[#3D0A23] text-[#9D174D] dark:text-pink-300 font-semibold text-xs flex items-center justify-center shrink-0 border border-[#FBCFE8] dark:border-[#581335]">
                        {t.creator_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{t.creator_name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#9D174D] dark:text-pink-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {t.creator_country || 'Verified Creator'} • {t.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty / Initial State banner */
          <div className="bg-white dark:bg-[#201C24] rounded-[28px] p-8 sm:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] dark:border-white/[0.05] text-center max-w-3xl mx-auto space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FCE7F3] dark:bg-[#3D0A23] text-[#9D174D] dark:text-pink-300 flex items-center justify-center mx-auto border border-[#FBCFE8] dark:border-[#581335]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white">
                100% Verified Payout Transparency
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-lg mx-auto leading-relaxed">
                Every creator who receives a completed payout uploads their actual bank or wallet receipt before leaving a 1–5 star review. Check out our public testimonials hub.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/testimonials"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#18181B] hover:bg-black text-white text-xs sm:text-sm font-medium transition shadow-sm"
              >
                <span>Explore public testimonials</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FCEEF4] dark:bg-[#2C1927] hover:bg-[#F9E2ED] text-[#9D174D] dark:text-pink-300 text-xs sm:text-sm font-semibold transition"
              >
                <span>Start earning</span>
              </Link>
            </div>
          </div>
        )}

        {/* Bottom Callout link */}
        <div className="mt-12 text-center">
          <Link
            href="/testimonials"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white dark:bg-[#221C28] border border-neutral-300/80 dark:border-neutral-700/80 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-xs transition"
          >
            <span>See all creator reviews & payment receipts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Lightbox Receipt Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="bg-white dark:bg-[#1A1620] border border-neutral-200 dark:border-neutral-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white">
                    {selectedProof.creator_name}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                    Verified Payout Receipt
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ${selectedProof.amount_usd.toFixed(2)} USD • Disbursed via {selectedProof.payment_method?.replace(/_/g, ' ') || 'Direct Settlement'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center max-h-[65vh]">
              <img
                src={selectedProof.proof_image_url}
                alt={`${selectedProof.creator_name} Receipt`}
                className="w-full h-auto max-h-[65vh] object-contain rounded-xl"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span className="italic truncate max-w-sm sm:max-w-md">
                &ldquo;{selectedProof.review}&rdquo;
              </span>
              <span className="shrink-0 text-amber-500 font-semibold">
                ★ {selectedProof.rating}.0
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
