'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  Shield,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { PayoutRequest } from '@/types';
import { useToast } from '@/components/ToastProvider';

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [modalMode, setModalMode] = useState<'CONFIRM' | 'CANCEL' | null>(null);
  const [bankRef, setBankRef] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadPayouts = () => {
    setLoading(true);
    fetch('/api/payouts')
      .then((r) => r.json())
      .then((data) => {
        setPayouts(data.payouts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handlePayoutAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !modalMode) return;

    setActionLoading(true);
    setActionError('');

    try {
      const res = await fetch(`/api/payouts/${selectedPayout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: modalMode === 'CONFIRM' ? 'CONFIRM_PAID' : 'CANCEL',
          paymentReference: bankRef.trim(),
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout');

      toast.success(
        modalMode === 'CONFIRM' ? 'Payout confirmed with bank reference.' : 'Payout request cancelled.'
      );
      setSelectedPayout(null);
      setModalMode(null);
      setBankRef('');
      setCancelReason('');
      loadPayouts();
    } catch (err: any) {
      setActionError(err.message || 'Error processing payout');
      toast.error(err.message || 'Error processing payout');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-black">
        <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading payout requests...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      <div className="border-b border-neutral-200 pb-6">
        <h1 className="font-serif text-3xl font-bold text-black">
          Admin Payout Processing
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
          Confirm bank transfers, log official transaction references, or release reservations.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        {payouts.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-neutral-500">
            No payout requests in system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 uppercase font-bold text-neutral-600">
                <tr>
                  <th className="p-4">Creator</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Videos</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method & Account</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Bank Ref</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="p-4">
                      <div className="font-bold text-black flex items-center gap-1.5">
                        <span>{p.creator_name || 'Creator'}</span>
                        <VerifiedBadge size={16} />
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">{p.creator_email}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-black">{p.id.substring(0, 8)}...</td>
                    <td className="p-4 text-neutral-600">{new Date(p.created_at || p.requested_at).toLocaleDateString()}</td>
                    <td className="p-4 text-black font-bold">{p.video_count} videos</td>
                    <td className="p-4 font-serif font-bold text-sm text-black">
                      ${p.amount_usd.toFixed(2)} USD
                    </td>
                    <td className="p-4 text-black">
                      <div className="font-bold">
                        {p.payment_method === 'MOBILE_MONEY' ? 'Mobile Money (M-Pesa/MoMo)' : (p.payment_method === 'NIGERIA_BANK' ? 'Nigerian Bank Transfer' : p.payment_method)}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate max-w-xs">{p.payment_destination}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="p-4 font-mono text-[11px] text-neutral-600">
                      {p.bank_payment_reference || '—'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {p.status === 'REQUESTED' || p.status === 'PROCESSING' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayout(p);
                              setModalMode('CONFIRM');
                              setActionError('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800"
                          >
                            Confirm Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayout(p);
                              setModalMode('CANCEL');
                              setActionError('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span className="text-neutral-400 font-bold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation / Cancellation Modal */}
      {selectedPayout && modalMode && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#fff9fb] max-w-md w-full rounded-2xl border border-[#f2e3e8] p-6 sm:p-8 space-y-5 shadow-2xl relative text-neutral-900">
            <button
              type="button"
              onClick={() => {
                setSelectedPayout(null);
                setModalMode(null);
              }}
              className="absolute top-5 right-5 p-1 text-neutral-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-black">
                {modalMode === 'CONFIRM' ? 'Confirm Payment Disbursement' : 'Cancel Payout Request'}
              </h3>
              <p className="text-xs text-neutral-600 font-medium">
                Amount: ${selectedPayout.amount_usd.toFixed(2)} USD • Destination: {selectedPayout.payment_destination}
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {actionError}
              </div>
            )}

            <form onSubmit={handlePayoutAction} className="space-y-4">
              {modalMode === 'CONFIRM' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Official Bank Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="e.g. WIRE-894218-ACH / TXN_987123"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                  <p className="text-[11px] text-neutral-500 font-medium">
                    This reference code is permanently stored and visible to the creator.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Cancellation Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide explanation for releasing reserved videos..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayout(null);
                    setModalMode(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-neutral-300 hover:bg-neutral-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 text-xs font-bold rounded-lg bg-black text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
