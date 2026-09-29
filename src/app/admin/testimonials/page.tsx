'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Check,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Eye,
  RotateCw,
  MessageSquare,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  Receipt,
  User,
} from 'lucide-react';
import { Testimonial } from '@/types';
import { useToast } from '@/components/ToastProvider';

export default function AdminTestimonialsPage() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<Testimonial | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/testimonials', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load testimonials');
      setTestimonials(data.testimonials || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error loading testimonials queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleApprove = async (t: Testimonial) => {
    setActionLoadingId(t.id);
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, action: 'APPROVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve testimonial');
      toast.success(`Approved review by ${t.creator_name}. It is now live on the testimonials hub.`);
      await loadData(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (t: Testimonial) => {
    setActionLoadingId(t.id);
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, action: 'REJECT' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject testimonial');
      toast.warning(`Testimonial by ${t.creator_name} has been rejected.`);
      await loadData(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (t: Testimonial) => {
    if (!window.confirm(`Permanently delete testimonial from ${t.creator_name}? This cannot be undone.`)) {
      return;
    }
    setActionLoadingId(t.id);
    try {
      const res = await fetch(`/api/admin/testimonials?id=${encodeURIComponent(t.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete testimonial');
      toast.success(`Testimonial by ${t.creator_name} deleted.`);
      await loadData(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((t) => {
      if (activeTab === 'PENDING' && t.status !== 'PENDING') return false;
      if (activeTab === 'APPROVED' && t.status !== 'APPROVED') return false;
      if (activeTab === 'REJECTED' && t.status !== 'REJECTED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (t.creator_name || '').toLowerCase().includes(q);
        const matchEmail = (t.creator_email || '').toLowerCase().includes(q);
        const matchReview = (t.review || '').toLowerCase().includes(q);
        const matchCountry = (t.creator_country || '').toLowerCase().includes(q);
        const matchPayout = (t.payout_id || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchReview && !matchCountry && !matchPayout) {
          return false;
        }
      }
      return true;
    });
  }, [testimonials, activeTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      {/* Top Header Bar */}
      <div className="bg-black text-white p-6 sm:p-8 border border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Operations</span>
            </Link>
            <span className="text-neutral-600">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Community Moderation
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Testimonials & Reviews Moderation
          </h1>
          <p className="text-xs text-neutral-300 font-medium max-w-2xl">
            Review creator payout testimonials and bank receipts before they appear publicly on the public testimonials showcase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/testimonials"
            target="_blank"
            className="px-4 py-2 bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Showcase</span>
          </Link>
          <Link
            href="/admin/payouts"
            className="px-4 py-2 bg-white text-black hover:bg-neutral-100 text-xs font-semibold transition-colors"
          >
            <span>Payouts Queue</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-neutral-500">
            Pending Review
          </span>
          <div className="font-serif text-3xl font-bold text-amber-600">
            {counts.pending}
          </div>
          <div className="text-xs text-neutral-500 font-medium">
            {counts.pending > 0 ? 'Awaiting admin moderation' : 'Queue clear'}
          </div>
        </div>

        <div className="bg-white p-5 border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-neutral-500">
            Approved & Live
          </span>
          <div className="font-serif text-3xl font-bold text-emerald-600">
            {counts.approved}
          </div>
          <div className="text-xs text-neutral-500 font-medium">
            Visible on testimonials page
          </div>
        </div>

        <div className="bg-white p-5 border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-neutral-500">
            Rejected
          </span>
          <div className="font-serif text-3xl font-bold text-rose-600">
            {counts.rejected}
          </div>
          <div className="text-xs text-neutral-500 font-medium">
            Hidden from public
          </div>
        </div>

        <div className="bg-white p-5 border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-neutral-500">
            Total Submissions
          </span>
          <div className="font-serif text-3xl font-bold text-black">
            {counts.all}
          </div>
          <div className="text-xs text-neutral-500 font-medium">
            All reviews in database
          </div>
        </div>
      </div>

      {/* Search and Tabs Bar */}
      <div className="bg-white p-4 border border-neutral-200 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
              {counts.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-700 text-[10px] font-black ml-1">
                  {counts.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved ({counts.approved})</span>
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({counts.rejected})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'ALL'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <span>All ({counts.all})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search creator, review, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-black font-medium"
            />
          </div>
        </div>
      </div>

      {/* Testimonials List */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-neutral-200">
          <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium text-neutral-500">Loading testimonials queue...</p>
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="py-16 text-center bg-white border border-neutral-200 p-8 space-y-2">
          <Receipt className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-bold text-sm text-neutral-700">No testimonials found in this filter</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {activeTab === 'PENDING'
              ? 'All creator testimonials have been reviewed and moderated.'
              : 'Try selecting a different filter tab or clearing your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTestimonials.map((t) => {
            const isActing = actionLoadingId === t.id;
            const initials =
              (t.creator_name || 'CR')
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'CR';

            return (
              <div
                key={t.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors"
              >
                <div className="space-y-3.5">
                  {/* Creator Header & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {t.creator_avatar_url ? (
                        <img
                          src={t.creator_avatar_url}
                          alt={t.creator_name}
                          className="w-11 h-11 rounded-full object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#FCEBF2] text-[#7B1E4B] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F8E2EC]">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-neutral-900 truncate">
                          {t.creator_name}
                        </h4>
                        <div className="text-[11px] text-neutral-500 font-mono truncate">
                          {t.creator_email || 'No email provided'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                          {t.creator_country && (
                            <span className="font-medium text-neutral-600">
                              {t.creator_country}
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {t.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>Pending Review</span>
                        </span>
                      ) : t.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Live & Published</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating Stars & Payout Details */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-neutral-50 rounded-lg text-xs">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (t.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                      <span className="font-bold text-neutral-900 ml-1">
                        {t.rating || 5}/5 Stars
                      </span>
                    </div>

                    <div className="font-medium text-neutral-700">
                      Payout: <strong className="text-black font-mono">${(t.amount_usd || 0).toFixed(2)} USD</strong>
                    </div>
                  </div>

                  {/* Review Text Quote */}
                  <div className="p-3 bg-white rounded-lg border border-neutral-100 text-xs text-neutral-800 leading-relaxed italic border-l-4 border-rose-400">
                    &ldquo;{t.review}&rdquo;
                  </div>

                  {/* Proof Receipt Preview Button */}
                  {t.proof_image_url && (
                    <button
                      type="button"
                      onClick={() => setSelectedProof(t)}
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 p-2.5 flex items-center justify-between gap-3 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded border border-neutral-300 overflow-hidden bg-white shrink-0 relative">
                          <img
                            src={t.proof_image_url}
                            alt="Receipt"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate flex items-center gap-1">
                            <span>Uploaded Payment Receipt</span>
                            <Eye className="w-3 h-3 text-neutral-400" />
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {t.payment_method?.replace(/_/g, ' ') || 'Settlement'} • Click to view full proof image
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-[#7B1E4B] group-hover:underline shrink-0 pr-1">
                        Inspect
                      </span>
                    </button>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {t.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(t)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish</span>
                      </button>
                    )}

                    {t.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleReject(t)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{t.status === 'APPROVED' ? 'Unpublish' : 'Reject'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(t)}
                    disabled={isActing}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Testimonial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* High-Resolution Receipt Modal */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 text-neutral-900 my-8 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-black flex items-center gap-2">
                  <span>Payment Proof Receipt</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Submitted by {selectedProof.creator_name} ({selectedProof.creator_email}) • Payout #{selectedProof.payout_id.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 flex items-center justify-center max-h-[65vh]">
              <img
                src={selectedProof.proof_image_url}
                alt="Payment Proof Receipt"
                className="w-full h-auto max-h-[65vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-xs text-neutral-600">
                Amount: <strong className="text-black font-mono">${(selectedProof.amount_usd || 0).toFixed(2)} USD</strong>
              </div>
              <div className="flex items-center gap-2">
                {selectedProof.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedProof);
                      setSelectedProof(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Publish</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProof(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
