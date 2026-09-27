'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  ExternalLink,
  Search,
  Eye,
  X,
  ArrowRight,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { Testimonial } from '@/types';
import { getLocalCurrency, formatLocalFx } from '@/lib/currency';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<Testimonial | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'ALL'>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'AMOUNT' | 'RATING'>('NEWEST');

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
        console.error('Failed to load testimonials', err);
      } finally {
        setLoading(false);
      }
    }
    loadTestimonials();
  }, []);

  const countries = useMemo(() => {
    const set = new Set<string>();
    testimonials.forEach((t) => {
      if (t.creator_country) set.add(t.creator_country);
    });
    return Array.from(set).sort();
  }, [testimonials]);

  const filteredTestimonials = useMemo(() => {
    return testimonials
      .filter((t) => {
        if (selectedRating !== 'ALL' && Math.round(t.rating) !== selectedRating) {
          return false;
        }
        if (selectedCountry !== 'ALL' && t.creator_country?.toLowerCase() !== selectedCountry.toLowerCase()) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.creator_name.toLowerCase().includes(q);
          const matchCountry = (t.creator_country || '').toLowerCase().includes(q);
          const matchReview = t.review.toLowerCase().includes(q);
          if (!matchName && !matchCountry && !matchReview) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'AMOUNT') return (b.amount_usd || 0) - (a.amount_usd || 0);
        if (sortBy === 'RATING') return (b.rating || 0) - (a.rating || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [testimonials, selectedRating, selectedCountry, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = testimonials.length;
    const totalPaid = testimonials.reduce((acc, curr) => acc + (curr.amount_usd || 0), 0);
    const avgRating = total > 0 ? (testimonials.reduce((acc, curr) => acc + (curr.rating || 5), 0) / total).toFixed(1) : '5.0';
    return {
      total,
      totalPaid,
      avgRating,
    };
  }, [testimonials]);

  // Close lightbox on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProof(null);
    };
    if (selectedProof) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedProof]);

  return (
    <div className="w-full flex flex-col bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <main className="w-full flex flex-col">
        {/* 1. HERO SECTION (Identical theme & layout to Home page) */}
        <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] pt-16 pb-20 sm:pt-24 sm:pb-28 transition-colors border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
            {/* Eyebrow Tag */}
            <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
              Verified Community Proof
            </span>

            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-[1.08]">
              Real creators.<br />
              Real payout proofs.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Every review on this page is authentic and submitted directly by creators alongside their uploaded payment receipt after receiving completed payouts.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-white text-sm sm:text-base font-medium transition-all shadow-sm hover:shadow active:scale-[0.99] group"
              >
                <span>Start creating</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/earnings-and-payments"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm sm:text-base font-medium transition-all shadow-xs"
              >
                <span>How earnings work</span>
              </Link>
            </div>

            {/* Trust markers */}
            <div className="pt-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              <span>{stats.avgRating} ★ Creator Rating</span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span>100% Compulsory Payout Proofs</span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span>Bank & Mobile Money</span>
            </div>
          </div>
        </section>

        {/* 2. REVIEWS & PROOFS GALLERY (Styled like Home's Pricing/Tiers Section) */}
        <section className="w-full bg-white dark:bg-[#1A1620] py-16 sm:py-24 border-b border-neutral-200/60 dark:border-neutral-800/60 transition-colors">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header 2 columns */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1520] dark:text-white leading-[1.12]">
                  Transparent.<br />
                  Verified.<br />
                  Every settlement.
                </h2>
              </div>
              <div className="md:max-w-md">
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Upon completion of every payout, creators must upload their actual bank alert, mobile wallet receipt, or PayPal confirmation before continuing.
                </p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 rounded-2xl bg-[#FDF0F5] dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search creator, country, or review..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Rating Filter */}
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-1 text-xs">
                  {(['ALL', 5, 4] as const).map((r) => (
                    <button
                      key={String(r)}
                      onClick={() => setSelectedRating(r)}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        selectedRating === r
                          ? 'bg-[#18181B] dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {r === 'ALL' ? 'All Stars' : `${r} ★`}
                    </button>
                  ))}
                </div>

                {/* Country Select */}
                {countries.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="appearance-none bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:border-rose-400 transition cursor-pointer"
                    >
                      <option value="ALL">All Countries</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                {/* Sort By */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:border-rose-400 transition cursor-pointer"
                  >
                    <option value="NEWEST">Most Recent</option>
                    <option value="AMOUNT">Highest Amount</option>
                    <option value="RATING">Highest Rating</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Testimonials Grid or Clean Empty State */}
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#18181B] dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs text-neutral-500">Loading verified testimonials...</div>
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-[#FDF0F5] dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 p-8 sm:p-12 space-y-4">
                <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
                  Creator Proofs
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[#1C1520] dark:text-white">
                  {searchQuery || selectedRating !== 'ALL' || selectedCountry !== 'ALL'
                    ? 'No matching reviews found'
                    : 'Verified Creator Reviews & Receipts'}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
                  {searchQuery || selectedRating !== 'ALL' || selectedCountry !== 'ALL'
                    ? 'Try clearing your search query or adjusting your star rating filter.'
                    : 'Whenever an admin marks a creator payout as completed, the creator is required to drop their star rating and upload their official payment receipt before accessing their dashboard. Their verified review and receipt will appear here.'}
                </p>
                {searchQuery || selectedRating !== 'ALL' || selectedCountry !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRating('ALL');
                      setSelectedCountry('ALL');
                    }}
                    className="mt-2 px-6 py-2.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <div className="pt-2">
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#18181B] hover:bg-black text-white text-sm font-medium transition shadow-xs"
                    >
                      <span>Join as creator</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTestimonials.map((t) => {
                  const currency = t.creator_country ? getLocalCurrency(t.creator_country, t.payment_method) : null;
                  const localFxString = currency && currency.code !== 'USD' && t.amount_usd
                    ? formatLocalFx(t.amount_usd, currency)
                    : null;

                  const initials = t.creator_name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'CR';

                  return (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-[#221C28] border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                    >
                      {/* Top: Creator & Stars */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {t.creator_avatar_url ? (
                              <img
                                src={t.creator_avatar_url}
                                alt={t.creator_name}
                                className="w-12 h-12 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-[#FCEBF2] dark:bg-[#2F212D] text-[#7B1E4B] dark:text-[#F472B6] font-bold text-sm flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif font-medium text-lg text-neutral-900 dark:text-white">
                                  {t.creator_name}
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              </div>

                              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {t.creator_country && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                                    {t.creator_country}
                                  </span>
                                )}
                                <span>•</span>
                                <span>{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Star Rating Badge */}
                          <div className="flex items-center gap-1 shrink-0 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{(t.rating || 5).toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Verified Payout Pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            Verified Payout: ${t.amount_usd.toFixed(2)} USD
                            {localFxString ? ` (${localFxString})` : ''}
                          </span>
                        </div>

                        {/* Review text */}
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic border-l-2 border-rose-300 dark:border-rose-800 pl-3">
                          &ldquo;{t.review}&rdquo;
                        </p>
                      </div>

                      {/* Uploaded Receipt Preview */}
                      {t.proof_image_url && (
                        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setSelectedProof(t)}
                            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900 p-3 flex items-center gap-3 transition text-left group"
                          >
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shrink-0 relative">
                              <img
                                src={t.proof_image_url}
                                alt="Uploaded Payment Receipt"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
                                <span>Uploaded Payout Receipt</span>
                                <ExternalLink className="w-3 h-3 text-neutral-400" />
                              </div>
                              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                                {t.payment_method ? t.payment_method.replace(/_/g, ' ') : 'Settlement Receipt'} • Click to view full proof
                              </div>
                            </div>

                            <span className="text-xs font-medium text-[#9D174D] dark:text-pink-300 group-hover:underline shrink-0 pr-1">
                              View Receipt
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 3. BOTTOM CTA SECTION (Identical theme & layout to Home page) */}
        <section className="w-full bg-[#FDF0F5] dark:bg-[#16111A] py-16 sm:py-24 transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
            <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-[#9D174D] dark:text-pink-300 uppercase">
              Join Our Roster
            </span>

            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#1C1520] dark:text-white leading-tight">
              Ready to start earning with<br />
              The Pink Room?
            </h2>

            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Record simple faceless ASMR videos according to our guidelines. Get approved, receive reliable weekly payouts, and join our global creator community.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-white text-sm sm:text-base font-medium transition-all shadow-sm hover:shadow"
              >
                <span>Start creating</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/guidelines"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm sm:text-base font-medium transition-all shadow-xs"
              >
                <span>Recording guidelines</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Zoom Modal for Uploaded Receipt */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white dark:bg-[#1A1620] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-900 dark:text-neutral-100 my-8 cursor-default"
          >
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-4 pr-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Uploaded Receipt</span>
              </div>
              <h3 className="text-xl font-serif font-medium text-neutral-900 dark:text-white">
                {selectedProof.creator_name}&apos;s Payout Receipt
              </h3>
              <p className="text-xs text-neutral-500">
                ${selectedProof.amount_usd.toFixed(2)} USD • Disbursed via {selectedProof.payment_method?.replace(/_/g, ' ') || 'Direct Settlement'}
              </p>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center max-h-[65vh]">
              <img
                src={selectedProof.proof_image_url}
                alt={`${selectedProof.creator_name} Receipt`}
                className="w-full h-auto max-h-[65vh] object-contain rounded-xl"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= selectedProof.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-700'}`}
                  />
                ))}
                <span className="ml-1 text-neutral-600 dark:text-neutral-400 italic truncate max-w-xs sm:max-w-md">
                  &ldquo;{selectedProof.review}&rdquo;
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 shrink-0">
                Submitted on {new Date(selectedProof.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
