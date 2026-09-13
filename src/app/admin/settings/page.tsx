'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Save, CheckCircle2, AlertCircle, Shield, Sliders, ArrowLeft } from 'lucide-react';
import { PlatformSettings } from '@/types';
import GuidelineSamplePlayer from '@/components/GuidelineSamplePlayer';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [ratePerVideo, setRatePerVideo] = useState(50);
  const [minPayoutVideos, setMinPayoutVideos] = useState(8);
  const [minDurationSeconds, setMinDurationSeconds] = useState(180);
  const [maxUploadMb, setMaxUploadMb] = useState(500);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        const s: PlatformSettings = data.settings;
        if (s) {
          setSettings(s);
          setRatePerVideo(s.rate_per_video_usd || 50);
          setMinPayoutVideos(s.min_payout_videos || 8);
          setMinDurationSeconds(s.min_duration_seconds || 180);
          setMaxUploadMb(Math.round((s.max_upload_size_bytes || 524288000) / (1024 * 1024)));
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate_per_video_usd: Number(ratePerVideo),
          min_payout_videos: Number(minPayoutVideos),
          min_duration_seconds: Number(minDurationSeconds),
          max_upload_size_bytes: Number(maxUploadMb) * 1024 * 1024,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setSettings(data.settings);
      setSuccessMsg('Platform business rules updated successfully.');
      setSaving(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-black font-medium">
        <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm font-medium">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
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
            Platform Configuration & Business Rules
          </h1>
          <p className="text-xs text-neutral-600 font-medium">
            Manage per-video payout rates, duration gating, file limits, and official recording benchmark videos.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 text-black text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 text-black text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-black shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-5 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-black border-b border-neutral-200 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-black" />
            <span>Economic & Validation Parameters</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Base Rate Per Approved Video (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-black font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={ratePerVideo}
                  onChange={(e) => setRatePerVideo(parseFloat(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white font-serif font-bold text-black"
                />
              </div>
              <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                Stored permanently on each submission upon creation.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Minimum Approved Videos for Payout
              </label>
              <input
                type="number"
                min="1"
                required
                value={minPayoutVideos}
                onChange={(e) => setMinPayoutVideos(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white font-bold text-black"
              />
              <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                Currently {minPayoutVideos} videos (${(minPayoutVideos * ratePerVideo).toFixed(2)} minimum threshold).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Minimum Video Duration (Seconds)
              </label>
              <input
                type="number"
                min="30"
                required
                value={minDurationSeconds}
                onChange={(e) => setMinDurationSeconds(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white font-bold text-black"
              />
              <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                {minDurationSeconds} seconds ({Math.floor(minDurationSeconds / 60)}m {minDurationSeconds % 60}s). Shorter files are rejected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Max Upload File Size (MB)
              </label>
              <input
                type="number"
                min="50"
                required
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white font-bold text-black"
              />
              <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                Displayed in uploader before file selection.
              </p>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-xl text-xs text-black border border-neutral-200 flex items-start gap-2 font-medium">
            <Shield className="w-4 h-4 text-black shrink-0 mt-0.5" />
            <span>
              Changes to the base rate take effect only for newly created submissions. Existing submissions retain their locked agreed rate so historical creator balances are protected.
            </span>
          </div>

          {/* Email Notification Dispatch Status */}
          <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-300 space-y-2 text-xs text-black">
            <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>Email & Notification Sender Identity</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                <div className="text-[10px] uppercase font-bold text-neutral-500">Official Sender Email</div>
                <div className="font-bold text-xs text-black select-all">notifications@pages.pinkroom.online</div>
                <div className="text-[10px] text-neutral-600 mt-0.5">Transactional notifications & alerts</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                <div className="text-[10px] uppercase font-bold text-neutral-500">Official Admin Escalations</div>
                <div className="font-bold text-xs text-black select-all">opheliaadeleke@gmail.com</div>
                <div className="text-[10px] text-neutral-600 mt-0.5">Administrator escalations & review alerts</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 rounded-lg bg-black text-white font-bold hover:bg-neutral-800 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating Parameters...' : 'Save Configuration Changes'}</span>
          </button>
        </div>
      </form>

      {/* Official Guideline Sample Video Management */}
      <div className="space-y-4 pt-8 border-t border-neutral-200">
        <div>
          <h2 className="font-serif text-2xl font-bold text-black">
            Official Page-Turning Guideline Reference Video
          </h2>
          <p className="text-xs text-neutral-600">
            Administrators can upload or link the master sample benchmark video displayed to creators on the guidelines page.
          </p>
        </div>

        <GuidelineSamplePlayer isAdmin={true} />
      </div>
    </div>
  );
}
