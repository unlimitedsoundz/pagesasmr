'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, CheckCircle2, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { RATE_PER_VIDEO_USD, MIN_PAYOUT_VIDEOS } from '@/lib/constants';

interface CalculatorProps {
  initialCount?: number;
  showCta?: boolean;
}

export default function EarningsCalculator({ initialCount = 8, showCta = true }: CalculatorProps) {
  const [videoCount, setVideoCount] = useState<number>(initialCount);
  const [ratePerVideo, setRatePerVideo] = useState<number>(RATE_PER_VIDEO_USD || 50);
  const [minVideosForPayout, setMinVideosForPayout] = useState<number>(MIN_PAYOUT_VIDEOS || 8);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          if (typeof data.settings.rate_per_video_usd === 'number') {
            setRatePerVideo(data.settings.rate_per_video_usd);
          }
          if (typeof data.settings.min_payout_videos === 'number') {
            setMinVideosForPayout(data.settings.min_payout_videos);
          }
        }
      })
      .catch(() => {});
  }, []);

  const totalEarnings = videoCount * ratePerVideo;
  const isEligibleForPayout = videoCount >= minVideosForPayout;
  const remainingForPayout = Math.max(0, minVideosForPayout - videoCount);
  const minPayoutAmount = minVideosForPayout * ratePerVideo;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-bold">
            Earnings & Payout Calculator
          </h3>
        </div>

        {/* Interactive Slider & Stepper */}
        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Approved Videos
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setVideoCount(Math.max(1, videoCount - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-100 active:scale-95 transition-transform"
                aria-label="Decrease videos"
              >
                -
              </button>
              <span className="font-serif text-2xl font-bold text-neutral-900 w-12 text-center">
                {videoCount}
              </span>
              <button
                type="button"
                onClick={() => setVideoCount(Math.min(40, videoCount + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-100 active:scale-95 transition-transform"
                aria-label="Increase videos"
              >
                +
              </button>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="30"
            value={videoCount}
            onChange={(e) => setVideoCount(parseInt(e.target.value, 10))}
            className="w-full accent-neutral-900 cursor-pointer h-2 bg-neutral-200 rounded-lg appearance-none"
          />

          <div className="flex justify-between text-[11px] text-black font-bold">
            <span>1 video</span>
            <span className="text-black font-bold">{minVideosForPayout} videos (Minimum Payout)</span>
            <span>30 videos</span>
          </div>
        </div>

        {/* Computed Earnings Display */}
        <div className="text-center py-2 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-black">
            Total Estimated Earnings
          </div>
          <div className="font-serif text-5xl sm:text-6xl font-bold text-black tracking-tight">
            ${totalEarnings.toLocaleString()}
            <span className="text-xl sm:text-2xl font-normal text-black ml-1">USD</span>
          </div>
          <div className="text-xs text-black font-medium">
            {videoCount} approved video{videoCount > 1 ? 's' : ''} × ${ratePerVideo.toFixed(2)} guaranteed locked rate
          </div>
        </div>

        {/* Eligibility Banner */}
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 transition-colors ${
            isEligibleForPayout
              ? 'bg-neutral-100 border-neutral-300 text-black'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          {isEligibleForPayout ? (
            <CheckCircle2 className="w-5 h-5 text-black shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold">
              {isEligibleForPayout
                ? `Payout threshold reached ($${totalEarnings} withdrawable)`
                : `Payout threshold requires ${minVideosForPayout} approved videos`}
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {isEligibleForPayout ? (
                <>
                  You have reached the {minVideosForPayout}-video threshold ({videoCount} approved). You can request an immediate payout
                  via Direct Deposit (ACH), PayPal, Mobile Money, or Local Bank Transfer.
                </>
              ) : (
                <>
                  You have {videoCount} video{videoCount > 1 ? 's' : ''} ($
                  {totalEarnings}). You need <strong>{remainingForPayout} more approved video{remainingForPayout > 1 ? 's' : ''}</strong> to
                  unlock your first ${minPayoutAmount.toFixed(2)} payout.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Explicit Milestone Table */}
        <div className="border-t border-neutral-200 pt-4 space-y-2">
          <div className="text-[11px] font-bold text-black uppercase tracking-wider text-center">
            Standard Payout Milestones
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="font-semibold text-neutral-900">{minVideosForPayout} Videos</div>
              <div className="font-serif text-base font-bold text-neutral-900">${(minVideosForPayout * ratePerVideo).toFixed(0)} USD</div>
              <div className="text-[10px] text-black font-bold">Minimum Payout</div>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="font-semibold text-neutral-900">10 Videos</div>
              <div className="font-serif text-base font-bold text-neutral-900">${(10 * ratePerVideo).toFixed(0)} USD</div>
              <div className="text-[10px] text-black font-bold">Unlocks Payout</div>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="font-semibold text-neutral-900">16 Videos</div>
              <div className="font-serif text-base font-bold text-neutral-900">${(16 * ratePerVideo).toFixed(0)} USD</div>
              <div className="text-[10px] text-black font-bold">Unlocks Payout</div>
            </div>
          </div>
        </div>

        {/* Clear Rules Summary */}
        <div className="text-[11px] text-black font-medium space-y-1 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
          <div className="font-bold text-black flex items-center gap-1">
            <Shield className="w-3 h-3 text-black" />
            <span>Eligibility Conditions:</span>
          </div>
          <p>• Pending review, rejected, or revision-requested videos do not count toward payout eligibility.</p>
          <p>• Agreed rate of ${ratePerVideo.toFixed(0)} is stored with each submission so future platform rate updates never alter existing earnings.</p>
        </div>

        {showCta && (
          <div className="pt-2 text-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-lg bg-neutral-900 text-white font-medium hover:bg-black transition-colors"
            >
              Start Recording & Earn ${ratePerVideo.toFixed(0)}/Video
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
