'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, DollarSign, Search, Shield, Filter, ArrowLeft } from 'lucide-react';
import { EarningsLedgerEntry } from '@/types';

export default function AdminLedgerPage() {
  const [ledger, setLedger] = useState<EarningsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetch('/api/admin/ledger')
      .then((r) => r.json())
      .then((data) => {
        setLedger(data.ledger || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filtered = ledger.filter((l) => {
    if (filterType !== 'ALL' && l.type !== filterType) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      <div className="border-b border-neutral-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Platform Operations
          </Link>
          <h1 className="font-serif text-3xl font-bold text-black">
            Platform Earnings Ledger
          </h1>
          <p className="text-xs text-neutral-600 font-medium">
            Financial ledger events for video approvals, reservation locks, and completed bank payouts.
          </p>
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-neutral-300 bg-white text-black shadow-sm"
          >
            <option value="ALL">All Event Types</option>
            <option value="CREDIT">Credits</option>
            <option value="RESERVED">Reservations</option>
            <option value="PAID">Disbursements (Paid)</option>
            <option value="RELEASED">Released Funds</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-black">
            Ledger Records ({filtered.length})
          </h2>
          <span className="text-xs font-bold text-neutral-500">Page Turning Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black text-xs font-medium">Loading ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-black text-xs font-medium">No ledger records match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-medium">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-black font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Creator ID</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((entry) => {
                  const isCredit = entry.type === 'CREDIT' || entry.type === 'RELEASED';
                  const isNegative = entry.amount_usd < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 text-black whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-neutral-300 bg-neutral-100 text-black">
                          {entry.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-black font-mono text-[11px] whitespace-nowrap">
                        {entry.creator_id}
                      </td>

                      <td className="py-3.5 px-4 text-black font-medium max-w-sm sm:max-w-md truncate">
                        {entry.description}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right font-serif text-sm font-bold whitespace-nowrap text-black">
                        {isNegative ? '-' : '+'}${Math.abs(entry.amount_usd).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
