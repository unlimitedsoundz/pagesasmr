'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Smartphone,
  Globe,
  Ban,
  Trash2,
  Plus,
  AlertOctagon,
  CheckCircle2,
  Lock,
  UserX,
  CreditCard,
  Search,
} from 'lucide-react';

interface BannedEntry {
  id: string;
  type: 'IP' | 'DEVICE' | 'EMAIL' | 'BANK_ACCOUNT' | 'NAME' | 'PHONE';
  value: string;
  reason: string;
  target_user_ids?: string[];
  created_at: string;
}

interface BannedSubject {
  name: string;
  email: string;
  id: string;
  status: string;
  beneficiary: string;
  accounts: string[];
  device?: string;
}

export default function AdminBlacklistPage() {
  const [bannedIps, setBannedIps] = useState<string[]>([]);
  const [bannedDevices, setBannedDevices] = useState<string[]>([]);
  const [bannedEntries, setBannedEntries] = useState<BannedEntry[]>([]);
  const [bannedSubjects, setBannedSubjects] = useState<BannedSubject[]>([]);
  const [staticBlacklist, setStaticBlacklist] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add form states
  const [newIp, setNewIp] = useState('');
  const [ipReason, setIpReason] = useState('');
  const [newDevice, setNewDevice] = useState('');
  const [deviceReason, setDeviceReason] = useState('');

  // Test tool states
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<{ matches: string[] } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blacklist');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch blacklist data');
      setBannedIps(data.bannedIps || []);
      setBannedDevices(data.bannedDevices || []);
      setBannedEntries(data.bannedEntries || []);
      setBannedSubjects(data.bannedSubjects || []);
      setStaticBlacklist(data.staticBlacklist || null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'IP', value: newIp.trim(), reason: ipReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ban IP');
      setSuccessMsg(`IP ${newIp.trim()} successfully banned.`);
      setNewIp('');
      setIpReason('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.trim()) return;
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEVICE', value: newDevice.trim(), reason: deviceReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ban device');
      setSuccessMsg(`Device signature ${newDevice.trim()} successfully banned.`);
      setNewDevice('');
      setDeviceReason('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEntry = async (id: string) => {
    if (!confirm('Are you sure you want to lift this ban?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/blacklist?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove entry');
      setSuccessMsg('Ban entry removed.');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunTest = (q: string) => {
    setTestQuery(q);
    if (!q.trim()) {
      setTestResult(null);
      return;
    }
    const clean = q.toLowerCase().trim();
    const matches: string[] = [];

    if (bannedIps.includes(q.trim())) matches.push(`Matches Banned IP list: ${q.trim()}`);
    if (bannedDevices.some((d) => clean.includes(d.toLowerCase()))) matches.push(`Matches Banned Device signature`);
    if (staticBlacklist?.emails?.some((e: string) => e.toLowerCase() === clean)) matches.push(`Matches Blacklisted Email`);
    if (staticBlacklist?.bankAccounts?.some((a: string) => clean.includes(a))) matches.push(`Matches Blacklisted Bank Account / NUBAN`);
    if (staticBlacklist?.names?.some((n: string) => clean.includes(n.toLowerCase()))) matches.push(`Matches Blacklisted Identity / Beneficiary`);
    if (staticBlacklist?.phoneNumbers?.some((p: string) => clean.includes(p))) matches.push(`Matches Blacklisted Phone Number`);
    if (staticBlacklist?.hardwareSignatures?.some((h: string) => clean.includes(h.toLowerCase()))) matches.push(`Matches Banned Phone Model (TECNO KM4)`);

    setTestResult({ matches });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Security & Compliance
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Blacklist & Sanction Engine
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Enforce IP bans, hardware signatures (TECNO KM4), and anti-circumvention identity locks across Pinkroom Main.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Section 1: Target Banned Subjects (Olivia & Loveth) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <UserX className="w-5 h-5 text-rose-500" />
          Permanently Banned Subjects (Pinkroom Main)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bannedSubjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-[#18121B] border border-rose-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    {sub.name}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      PERMANENTLY BANNED
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">{sub.email}</p>
                </div>
                <Ban className="w-6 h-6 text-rose-500 shrink-0" />
              </div>

              <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-[#110C13] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div>
                  <span className="text-neutral-400 font-medium">User ID:</span>{' '}
                  <code className="font-mono text-[11px] text-rose-500 dark:text-rose-400">{sub.id}</code>
                </div>
                <div>
                  <span className="text-neutral-400 font-medium">Linked Beneficiary:</span>{' '}
                  <strong>{sub.beneficiary}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 font-medium">Flagged Accounts:</span>
                  <ul className="list-disc list-inside mt-0.5 text-neutral-500 dark:text-neutral-400 space-y-0.5">
                    {sub.accounts.map((acc, i) => (
                      <li key={i}>{acc}</li>
                    ))}
                  </ul>
                </div>
                {sub.device && (
                  <div className="pt-1 border-t border-neutral-200 dark:border-neutral-800">
                    <span className="text-neutral-400 font-medium">Hardware Model:</span>{' '}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{sub.device}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: IP Ban Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add IP Ban Form */}
        <div className="bg-white dark:bg-[#18141C] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Add IP to Ban List
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Immediately cuts off all website, API, and auth access for any client matching this IP address.
          </p>
          <form onSubmit={handleAddIp} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g. 102.89.45.12"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500 text-neutral-900 dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reason / Subject Note
              </label>
              <input
                type="text"
                value={ipReason}
                onChange={(e) => setIpReason(e.target.value)}
                placeholder="e.g. Olivia/Loveth network access"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500 text-neutral-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ban IP Address
            </button>
          </form>
        </div>

        {/* Live Banned IP List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18141C] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />
              Active IP Ban Registry ({bannedIps.length})
            </h3>
            <span className="text-xs text-neutral-400">Auto-captured + Static</span>
          </div>

          {bannedIps.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800">
              No individual IP addresses logged yet. Active session honeypots are primed to auto-capture client IPs.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold">
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Enforcement Reason</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {bannedIps.map((ip) => {
                    const entry = bannedEntries.find((e) => e.type === 'IP' && e.value === ip);
                    return (
                      <tr key={ip} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">{ip}</td>
                        <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400">
                          {entry?.reason || 'Sanctioned IP block'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {entry ? (
                            <button
                              onClick={() => handleRemoveEntry(entry.id)}
                              className="text-neutral-400 hover:text-rose-500 p-1 transition-colors"
                              title="Lift IP ban"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400">System</span>
                          )}
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

      {/* Section 3: Device & Phone Model Banning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#18141C] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            Add Device Signature
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Ban a browser device token or hardware model string (e.g. TECNO KM4).
          </p>
          <form onSubmit={handleAddDevice} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Device Token or Model
              </label>
              <input
                type="text"
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                placeholder="e.g. dev_xxxx or TECNO KM4"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={deviceReason}
                onChange={(e) => setDeviceReason(e.target.value)}
                placeholder="e.g. Loveth hardware phone ban"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ban Device
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-[#18141C] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            Banned Devices & Signatures ({bannedDevices.length + (staticBlacklist?.hardwareSignatures?.length || 0)})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {staticBlacklist?.hardwareSignatures?.map((sig: string) => (
              <div
                key={sig}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{sig}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Static Phone Model Ban (Loveth / Olivia)</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 uppercase">
                  Hardware
                </span>
              </div>
            ))}

            {bannedDevices.map((dev) => {
              const entry = bannedEntries.find((e) => e.type === 'DEVICE' && e.value === dev);
              return (
                <div
                  key={dev}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <div className="font-mono text-xs font-bold text-neutral-900 dark:text-white truncate">{dev}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{entry?.reason || 'Device block'}</div>
                  </div>
                  {entry && (
                    <button
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1 transition-colors"
                      title="Lift device ban"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 4: Live Search & Verification Tester */}
      <div className="bg-white dark:bg-[#18141C] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-500" />
          Blacklist Rule Tester
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Verify whether an email, IP address, device model, or bank account is blocked by the anti-circumvention system.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => handleRunTest(e.target.value)}
            placeholder="Test email, bank account, IP, or name..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-neutral-900 dark:text-white"
          />
        </div>

        {testResult && (
          <div className="mt-3">
            {testResult.matches.length > 0 ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  BLOCKED: This query triggers active blacklist rules:
                </div>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {testResult.matches.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                CLEAR: No blacklist rules triggered for this query.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
