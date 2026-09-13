'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Shield, User, Clock, Tag, ArrowLeft } from 'lucide-react';
import { AuditEvent } from '@/types';

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.auditEvents || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

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
            Platform Audit Trail
          </h1>
          <p className="text-xs text-neutral-600 font-medium">
            Immutable log of administrative operations, reviews, configuration changes, and payouts.
          </p>
        </div>

        <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-lg border border-neutral-300 text-black">
          Recorded Events: {events.length}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-black">
            Audit Events
          </h2>
          <span className="text-xs font-bold text-neutral-500">Page Turning Platform</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black text-xs font-medium">Loading audit trail...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-black text-xs font-medium">No audit events logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-medium">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-black font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4 sm:px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 text-black whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-black">{ev.actor_name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">ID: {ev.actor_id}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-black border border-neutral-300">
                        {ev.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-black">{ev.target_type}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{ev.target_id}</div>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-black max-w-xs truncate">
                      {ev.details ? JSON.stringify(ev.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
