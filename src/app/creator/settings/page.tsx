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
  Landmark,
  Smartphone,
  Building2,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { NIGERIAN_BANKS } from '@/lib/nigerian-banks';

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

  // Payment preference & Payout Details
  const [paymentMethod, setPaymentMethod] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [nigerianBankName, setNigerianBankName] = useState('Access Bank');
  const [nigerianAccountNumber, setNigerianAccountNumber] = useState('');
  const [mobileNetwork, setMobileNetwork] = useState('M-Pesa');
  const [mobileNumber, setMobileNumber] = useState('');
  const [wiseEmail, setWiseEmail] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

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

      const storedDetails = localStorage.getItem('pinkroom_payment_details');
      if (storedDetails) {
        try {
          const d = JSON.parse(storedDetails);
          if (d.beneficiaryName) setBeneficiaryName(d.beneficiaryName);
          if (d.nigerianBankName) setNigerianBankName(d.nigerianBankName);
          if (d.nigerianAccountNumber) setNigerianAccountNumber(d.nigerianAccountNumber);
          if (d.mobileNetwork) setMobileNetwork(d.mobileNetwork);
          if (d.mobileNumber) setMobileNumber(d.mobileNumber);
          if (d.wiseEmail) setWiseEmail(d.wiseEmail);
          if (d.paypalEmail) setPaypalEmail(d.paypalEmail);
          if (d.bankName) setBankName(d.bankName);
          if (d.routingNumber) setRoutingNumber(d.routingNumber);
          if (d.accountNumber) setAccountNumber(d.accountNumber);
        } catch {}
      }

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
          if (data.profile.payment_details && !localStorage.getItem('pinkroom_payment_details')) {
            const d = data.profile.payment_details;
            if (d.beneficiaryName) setBeneficiaryName(d.beneficiaryName);
            if (d.nigerianBankName) setNigerianBankName(d.nigerianBankName);
            if (d.nigerianAccountNumber) setNigerianAccountNumber(d.nigerianAccountNumber);
            if (d.mobileNetwork) setMobileNetwork(d.mobileNetwork);
            if (d.mobileNumber) setMobileNumber(d.mobileNumber);
            if (d.wiseEmail) setWiseEmail(d.wiseEmail);
            if (d.paypalEmail) setPaypalEmail(d.paypalEmail);
            if (d.bankName) setBankName(d.bankName);
            if (d.routingNumber) setRoutingNumber(d.routingNumber);
            if (d.accountNumber) setAccountNumber(d.accountNumber);
          }
        }
      })
      .catch((err) => console.error('Failed to load profile', err))
      .finally(() => setLoading(false));
    // Listen to theme-change event from Navbar ThemeToggle
    const handleThemeChange = (e: CustomEvent<{ theme: 'light' | 'dark' }>) => {
      setIsDark(e.detail.theme === 'dark');
    };
    window.addEventListener('theme-change' as any, handleThemeChange);

    return () => {
      window.removeEventListener('theme-change' as any, handleThemeChange);
    };
  }, []);

  // Theme toggle function with event dispatch
  const setThemeMode = (dark: boolean) => {
    setIsDark(dark);
    const mode = dark ? 'dark' : 'light';
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(
      new CustomEvent('theme-change', { detail: { theme: mode } })
    );
  };

  // Immediate toggle helpers for notification switches
  const toggleSubmissionReviews = () => {
    setSubmissionReviews((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          'pinkroom_notif_prefs',
          JSON.stringify({
            submissionReviews: next,
            payoutUpdates,
            recordingReminders,
          })
        );
      } catch {}
      toast.success(
        next ? 'Submission review notifications enabled.' : 'Submission review notifications disabled.',
        'Notification preference updated'
      );
      return next;
    });
  };

  const togglePayoutUpdates = () => {
    setPayoutUpdates((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          'pinkroom_notif_prefs',
          JSON.stringify({
            submissionReviews,
            payoutUpdates: next,
            recordingReminders,
          })
        );
      } catch {}
      toast.success(
        next ? 'Payout update notifications enabled.' : 'Payout update notifications disabled.',
        'Notification preference updated'
      );
      return next;
    });
  };

  const toggleRecordingReminders = () => {
    setRecordingReminders((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          'pinkroom_notif_prefs',
          JSON.stringify({
            submissionReviews,
            payoutUpdates,
            recordingReminders: next,
          })
        );
      } catch {}
      toast.success(
        next ? 'Recording reminders enabled.' : 'Recording reminders disabled.',
        'Notification preference updated'
      );
      return next;
    });
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

  const handleSavePaymentPreference = async () => {
    setSavingPayment(true);
    const details = {
      beneficiaryName: beneficiaryName.trim(),
      nigerianBankName,
      nigerianAccountNumber: nigerianAccountNumber.trim(),
      mobileNetwork,
      mobileNumber: mobileNumber.trim(),
      wiseEmail: wiseEmail.trim(),
      paypalEmail: paypalEmail.trim(),
      bankName: bankName.trim(),
      routingNumber: routingNumber.trim(),
      accountNumber: accountNumber.trim(),
    };

    try {
      localStorage.setItem('pinkroom_payment_method', paymentMethod);
      localStorage.setItem('pinkroom_payment_details', JSON.stringify(details));

      await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          payment_details: details,
        }),
      });
      toast.success('Your payout method and details have been saved.', 'Payout details saved');
    } catch {
      toast.success('Payout preferences saved on this device.', 'Preferences saved');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleResetPreferences = () => {
    setSubmissionReviews(true);
    setPayoutUpdates(true);
    setRecordingReminders(false);
    setPaymentMethod('');
    setBeneficiaryName('');
    setNigerianBankName('Access Bank');
    setNigerianAccountNumber('');
    setMobileNetwork('M-Pesa');
    setMobileNumber('');
    setWiseEmail('');
    setPaypalEmail('');
    setBankName('');
    setRoutingNumber('');
    setAccountNumber('');
    setDisplayName('Ada Wunor');
    try {
      localStorage.removeItem('pinkroom_notif_prefs');
      localStorage.removeItem('pinkroom_payment_method');
      localStorage.removeItem('pinkroom_payment_details');
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
                <div
                  onClick={toggleSubmissionReviews}
                  className="py-4 flex items-center justify-between gap-4 cursor-pointer select-none group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-[#7B1E4B] dark:group-hover:text-[#F472B6] transition-colors">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubmissionReviews();
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E4B] ${
                      submissionReviews ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                    style={{
                      backgroundColor: submissionReviews ? '#7B1E4B' : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
                      style={{
                        transform: submissionReviews ? 'translateX(20px)' : 'translateX(0px)',
                      }}
                    />
                  </button>
                </div>

                {/* Toggle 2: Payout updates */}
                <div
                  onClick={togglePayoutUpdates}
                  className="py-4 flex items-center justify-between gap-4 cursor-pointer select-none group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-[#7B1E4B] dark:group-hover:text-[#F472B6] transition-colors">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePayoutUpdates();
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E4B] ${
                      payoutUpdates ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                    style={{
                      backgroundColor: payoutUpdates ? '#7B1E4B' : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
                      style={{
                        transform: payoutUpdates ? 'translateX(20px)' : 'translateX(0px)',
                      }}
                    />
                  </button>
                </div>

                {/* Toggle 3: Recording reminders */}
                <div
                  onClick={toggleRecordingReminders}
                  className="py-4 flex items-center justify-between gap-4 cursor-pointer select-none group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-[#7B1E4B] dark:group-hover:text-[#F472B6] transition-colors">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecordingReminders();
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E4B] ${
                      recordingReminders ? 'bg-[#7B1E4B]' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                    style={{
                      backgroundColor: recordingReminders ? '#7B1E4B' : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
                      style={{
                        transform: recordingReminders ? 'translateX(20px)' : 'translateX(0px)',
                      }}
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

            {/* ─── Section 04: Payout Details & Preferences ───────── */}
            <div
              id="section-payment"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl font-normal text-neutral-300 dark:text-neutral-600">
                  04
                </span>
                <div className="space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                    Payout details & preferences
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                    Choose your preferred payout method and enter verified recipient details.
                  </p>
                </div>
              </div>

              {/* Method Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Default payout method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#FDFBFD] dark:bg-[#141217] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B] transition-all"
                >
                  <option value="">No preference selected</option>
                  <option value="NIGERIA_BANK">Nigerian Local Bank Transfer (NGN Direct Deposit / NUBAN)</option>
                  <option value="MOBILE_MONEY">African Mobile Money (M-Pesa, MTN MoMo, Airtel)</option>
                  <option value="WISE">Wise (TransferWise)</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="ACH">US ACH / Direct Deposit</option>
                  <option value="WIRE">International Wire Transfer</option>
                </select>
              </div>

              {/* Beneficiary Legal Full Name (Universal across all methods) */}
              {paymentMethod && (
                <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Legal Beneficiary Full Name
                  </label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Full legal name matching the recipient bank account or wallet"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#FDFBFD] dark:bg-[#141217] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B] transition-all"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Must match government-issued identification and recipient account holder name.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for Nigerian Bank Transfer */}
              {paymentMethod === 'NIGERIA_BANK' && (
                <div className="space-y-4 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <Landmark className="w-4 h-4" />
                    <span>Nigerian Bank Transfer Details (NUBAN)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Commercial Bank Name
                      </label>
                      <select
                        value={nigerianBankName}
                        onChange={(e) => setNigerianBankName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      >
                        {NIGERIAN_BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        10-Digit NUBAN Account Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        value={nigerianAccountNumber}
                        onChange={(e) => setNigerianAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 0123456789"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono tracking-wider text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Direct automated settlement in Nigerian Naira (NGN) via instant NUBAN interbank clearing.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for Mobile Money */}
              {paymentMethod === 'MOBILE_MONEY' && (
                <div className="space-y-4 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <Smartphone className="w-4 h-4" />
                    <span>African Mobile Money Details (M-Pesa / MTN MoMo / Airtel)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Mobile Network Provider
                      </label>
                      <select
                        value={mobileNetwork}
                        onChange={(e) => setMobileNetwork(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      >
                        <option value="M-Pesa">Safaricom / Vodacom M-Pesa</option>
                        <option value="MTN MoMo">MTN Mobile Money (MoMo)</option>
                        <option value="Airtel Money">Airtel Money</option>
                        <option value="Vodafone Cash">Vodafone Cash</option>
                        <option value="Tigo Pesa">Tigo Pesa</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Registered Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. +234 801 234 5678 or +254 712 345 678"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Disbursements are sent directly to your mobile wallet in your local currency.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for Wise */}
              {paymentMethod === 'WISE' && (
                <div className="space-y-3 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <Building2 className="w-4 h-4" />
                    <span>Wise (TransferWise) Account</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Wise Recipient Email
                    </label>
                    <input
                      type="email"
                      value={wiseEmail}
                      onChange={(e) => setWiseEmail(e.target.value)}
                      placeholder="e.g. your-email@domain.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    We disburse USD or your chosen currency directly into your Wise multi-currency account.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for PayPal */}
              {paymentMethod === 'PAYPAL' && (
                <div className="space-y-3 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <CreditCard className="w-4 h-4" />
                    <span>PayPal Account</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      PayPal Email Address
                    </label>
                    <input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="e.g. yourname@paypal.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Disbursements are deposited directly into your verified PayPal balance in USD.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for US ACH Direct Deposit */}
              {paymentMethod === 'ACH' && (
                <div className="space-y-4 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <Landmark className="w-4 h-4" />
                    <span>US ACH / Direct Deposit Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        US Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Chase Bank, Wells Fargo, Bank of America"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        9-Digit Routing Transit Number (ABA)
                      </label>
                      <input
                        type="text"
                        maxLength={9}
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 021000021"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Checking / Savings Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Account number"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Direct automated clearing house deposit for US bank accounts.
                  </p>
                </div>
              )}

              {/* Dynamic Fields for International Wire Transfer */}
              {paymentMethod === 'WIRE' && (
                <div className="space-y-4 p-5 rounded-xl bg-[#FDFBFD] dark:bg-[#151218] border border-neutral-200/80 dark:border-neutral-800/90">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7B1E4B] dark:text-pink-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <Landmark className="w-4 h-4" />
                    <span>International Wire Transfer Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        International Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HSBC Bank plc, Barclays, Standard Chartered"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        SWIFT / BIC Code
                      </label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. HBUKGB41400"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono uppercase text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        IBAN or International Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. GB29 HBUK 1234 5678 9012 34"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1720] text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7B1E4B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Standard international bank wire transfer for banks worldwide.
                  </p>
                </div>
              )}

              {/* Security & Verification Banner */}
              <div className="bg-[#FCEBF2] dark:bg-[#23151F] border border-[#F5D5E3] dark:border-[#3D2132] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#7B1E4B] dark:text-[#F472B6]">
                <Lock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>
                  Your recipient details are encrypted and securely stored. Payout requests are verified before disbursement.
                </span>
              </div>

              {/* Save Payout Details Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePaymentPreference}
                  disabled={savingPayment}
                  className="px-6 py-2.5 rounded-full bg-[#130E14] hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {savingPayment ? 'Saving details...' : 'Save payout details'}
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
