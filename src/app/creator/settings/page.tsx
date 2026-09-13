'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Bell,
  Moon,
  Sun,
  CreditCard,
  Shield,
  Check,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function CreatorSettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active section for sidebar navigation
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'appearance' | 'payment' | 'account'>('profile');

  // Form states
  const [displayName, setDisplayName] = useState('Ada Wunor');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Notification toggles
  const [submissionReviews, setSubmissionReviews] = useState(true);
  const [payoutUpdates, setPayoutUpdates] = useState(true);
  const [recordingReminders, setRecordingReminders] = useState(false);

  // Appearance theme
  const [isDark, setIsDark] = useState(false);

  // Payment preference
  const [paymentMethod, setPaymentMethod] = useState('');

  // Initial load
  useEffect(() => {
    // Check current theme
    const darkActive = document.documentElement.classList.contains('dark');
    setIsDark(darkActive);

    // Load stored settings from localStorage if present
    try {
      const storedNotifs = localStorage.getItem('pinkroom_notif_prefs');
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        if (typeof parsed.submissionReviews === 'boolean') setSubmissionReviews(parsed.submissionReviews);
        if (typeof parsed.payoutUpdates === 'boolean') setPayoutUpdates(parsed.payoutUpdates);
        if (typeof parsed.recordingReminders === 'boolean') setRecordingReminders(parsed.recordingReminders);
      }

      const storedMethod = localStorage.getItem('pinkroom_payment_method');
      if (storedMethod) setPaymentMethod(storedMethod);

      const storedName = localStorage.getItem('pinkroom_display_name');
      if (storedName) setDisplayName(storedName);
    } catch {}

    fetch('/api/creator/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile) {
          setProfile(data.profile);
          if (data.profile.display_name && !localStorage.getItem('pinkroom_display_name')) {
            setDisplayName(data.profile.display_name);
          }
          if (data.profile.email) {
            setEmail(data.profile.email);
          }
          if (data.profile.payment_method && !localStorage.getItem('pinkroom_payment_method')) {
            setPaymentMethod(data.profile.payment_method);
          }
        }
      })
      .catch((err) => console.error('Failed to load profile', err))
      .finally(() => setLoading(false));
  }, []);

  // Theme toggle function
  const setThemeMode = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      localStorage.setItem('pinkroom_display_name', displayName.trim());
      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      toast.success('Your display name has been updated for this preview.', 'Profile saved');
    } catch {
      toast.success('Preview profile updated.', 'Preferences saved');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem(
        'pinkroom_notif_prefs',
        JSON.stringify({ submissionReviews, payoutUpdates, recordingReminders })
      );
    } catch {}
    toast.success('Your notification choices are up to date.', 'Notification preferences saved');
  };

  const handleSavePaymentPreference = () => {
    try {
      localStorage.setItem('pinkroom_payment_method', paymentMethod);
    } catch {}
    toast.success('Your payout method has been saved for this preview.', 'Payment preference saved');
  };

  const handleResetPreferences = () => {
    setSubmissionReviews(true);
    setPayoutUpdates(true);
    setRecordingReminders(false);
    setPaymentMethod('');
    setDisplayName('Ada Wunor');
    try {
      localStorage.removeItem('pinkroom_notif_prefs');
      localStorage.removeItem('pinkroom_payment_method');
      localStorage.removeItem('pinkroom_display_name');
    } catch {}
    toast.success('All preview settings restored to defaults.', 'Preferences reset');
  };

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AW';

  const scrollToSection = (id: string, section: typeof activeSection) => {
    setActiveSection(section);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* ─── Page Header ─────────────────────────────────────────── */}
        <div className="space-y-1.5 pb-1">
          <div className="text-[10px] sm:text-[11px] tracking-[0.22em] font-bold text-[#7B1E4B] dark:text-[#F472B6] uppercase">
            MAKE YOURSELF AT HOME
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-normal tracking-tight text-neutral-900 dark:text-white leading-tight">
            Your space.{' '}
            <span className="italic font-serif text-[#7B1E4B] dark:text-[#F472B6]">
              Your preferences.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Keep your profile and creator preferences in one place.
          </p>
        </div>

        {/* ─── Main 2-Column Section (Sidebar + Settings Content) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Sidebar Navigation (col-span-3) */}
          <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => scrollToSection('section-profile', 'profile')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeSection === 'profile'
                    ? 'bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Creator profile</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-notifications', 'notifications')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeSection === 'notifications'
                    ? 'bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Notifications</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-appearance', 'appearance')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeSection === 'appearance'
                    ? 'bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-payment', 'payment')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeSection === 'payment'
                    ? 'bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Payment preference</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-account', 'account')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  activeSection === 'account'
                    ? 'bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Account & security</span>
              </button>
            </nav>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1 text-xs">
              <div className="text-neutral-400 font-medium">Need a hand?</div>
              <Link
                href="/contact"
                className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-[#7B1E4B] dark:hover:text-[#F472B6] transition-colors inline-flex items-center gap-1"
              >
                <span>Contact creator support</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Right Main Content (col-span-9) */}
          <div className="lg:col-span-9 space-y-6">

            {/* Top Pink Notice Banner */}
            <div className="bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F5D5E3] dark:border-[#3D2132] rounded-xl p-3.5 sm:p-4 flex items-center gap-2.5 text-xs text-[#7B1E4B] dark:text-[#F472B6] shadow-2xs">
              <FileText className="w-4 h-4 shrink-0 opacity-90" />
              <span className="leading-relaxed">
                Preview settings are saved on this device only. They don't change your live creator account or email delivery.
              </span>
            </div>

            {/* ─── Section 01: Creator Profile ──────────────────────── */}
            <div
              id="section-profile"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  01
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Creator profile
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    The name you use in this preview.
                  </p>
                </div>
              </div>

              {/* Avatar + Badge Row */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-full bg-[#FCEBF2] dark:bg-[#2A1624] text-[#7B1E4B] dark:text-[#F472B6] border border-[#F3D3E1] dark:border-[#3D2132] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {displayName || 'Creator'}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Audition approved</span>
                  </div>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter creator name"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#FDFBFD] dark:bg-[#141217] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B] transition-all"
                />
                <p className="text-[11px] text-neutral-400 font-normal">
                  Applies to this preview's profile display. Existing submission titles stay as-recorded.
                </p>
              </div>

              {/* Email address row */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Email address</span>
                <span className="text-neutral-400 dark:text-neutral-500 font-medium">
                  {email || 'Account connection required'}
                </span>
              </div>

              {/* Save profile button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-full bg-[#130E14] hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                >
                  {savingProfile ? 'Saving...' : 'Save preview profile'}
                </button>
              </div>
            </div>

            {/* ─── Section 02: Notifications (All Functioning Toggles) ── */}
            <div
              id="section-notifications"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  02
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Notifications
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    Choose the updates you'd like to receive.
                  </p>
                </div>
              </div>

              {/* Toggle Rows */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 pt-1">
                {/* Toggle 1: Submission reviews */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Submission reviews
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Approval updates and editorial revision notes.
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={submissionReviews}
                    onClick={() => setSubmissionReviews((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      submissionReviews ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        submissionReviews ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: Payout updates */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Payout updates
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Updates when a payout is requested or completed.
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={payoutUpdates}
                    onClick={() => setPayoutUpdates((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      payoutUpdates ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        payoutUpdates ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 3: Recording reminders */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Recording reminders
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      A gentle reminder to keep your next batch moving.
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={recordingReminders}
                    onClick={() => setRecordingReminders((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      recordingReminders ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        recordingReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Save notifications button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="px-6 py-2.5 rounded-full bg-[#130E14] hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                >
                  Save preview preferences
                </button>
              </div>
            </div>

            {/* ─── Section 03: Appearance (Functioning Theme Selector) ── */}
            <div
              id="section-appearance"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  03
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Appearance
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    Choose a look that feels right. Applies across this preview.
                  </p>
                </div>
              </div>

              {/* Light & Dark Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Light Mode Card */}
                <div
                  onClick={() => setThemeMode(false)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    !isDark
                      ? 'border-[#7B1E4B] bg-[#FDF7FA] dark:bg-neutral-800/80 ring-1 ring-[#7B1E4B]'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FCEBF2] text-[#7B1E4B] flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Light
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Soft pink, bright surfaces
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      !isDark
                        ? 'bg-[#7B1E4B] text-white'
                        : 'border border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {!isDark && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => setThemeMode(true)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isDark
                      ? 'border-[#7B1E4B] bg-[#FDF7FA] dark:bg-neutral-800/80 ring-1 ring-[#7B1E4B]'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#18141D] text-white flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Dark
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Deep tones, softer light
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isDark
                        ? 'bg-[#7B1E4B] text-white'
                        : 'border border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isDark && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 font-normal">
                Changes save automatically on this device.
              </p>
            </div>

            {/* ─── Section 04: Payment Preference ───────────────────── */}
            <div
              id="section-payment"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  04
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Payment preference
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    Choose your preferred payout method for this preview.
                  </p>
                </div>
              </div>

              {/* Preferred method select */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Preferred method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#FDFBFD] dark:bg-[#141217] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B] transition-all"
                >
                  <option value="">No preference selected</option>
                  <option value="NIGERIA_BANK">Direct Bank Transfer (Nigeria / NGN)</option>
                  <option value="MOBILE_MONEY">Mobile Money (M-Pesa, MTN, Airtel)</option>
                  <option value="WISE">Wise (TransferWise)</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="ACH">US ACH / Direct Deposit</option>
                  <option value="WIRE">International Wire Transfer</option>
                </select>
              </div>

              {/* Notice banner */}
              <div className="bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F5D5E3] dark:border-[#3D2132] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#7B1E4B] dark:text-[#F472B6]">
                <Lock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>
                  No bank or payment account is connected here. Set up recipient details in your existing creator account.
                </span>
              </div>

              {/* Save payment preference button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePaymentPreference}
                  className="px-6 py-2.5 rounded-full bg-[#130E14] hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                >
                  Save preview preference
                </button>
              </div>
            </div>

            {/* ─── Section 05: Account & Security ──────────────────── */}
            <div
              id="section-account"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  05
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Account & security
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    Keep your personal details and access up to date.
                  </p>
                </div>
              </div>

              {/* Row 1: Your creator account */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-5">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Your creator account
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Manage your email, password, and account security on The Pink Room.
                  </div>
                </div>

                <Link
                  href="/creator"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shrink-0 self-start sm:self-auto"
                >
                  <span>Open account</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Row 2: Reset preview preferences */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Reset preview preferences
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Clear this device's preview settings and restore the defaults.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPreferences}
                  className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline self-start sm:self-auto"
                >
                  Reset preferences
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ─── Bottom Summary Bar ──────────────────────────────────── */}
        <div className="pt-8 border-t border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 font-medium tracking-wide">
            <span>$50 flat rate.</span>
            <span>·</span>
            <span>8-video minimum.</span>
            <span>·</span>
            <span>Your work. Your earnings.</span>
          </div>
        </div>

      </main>
    </div>
  );
}
