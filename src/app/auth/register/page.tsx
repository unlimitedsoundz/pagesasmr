'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, CheckCircle2, AlertCircle, ArrowRight, BrickWall, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { ALL_COUNTRIES } from '@/lib/countries';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboardOnly = searchParams.get('onboard') === 'true';
  const queryEmail = searchParams.get('email') || '';

  const { success, error: toastError } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [country, setCountry] = useState('United States');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!isOnboardOnly) {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        setLoading(false);
        return;
      }
    }

    if (!isAdultConfirmed) {
      setErrorMessage('You must confirm that you are at least 18 years old.');
      setLoading(false);
      return;
    }

    if (!termsAgreed) {
      setErrorMessage('You must accept the page-turning recording guidelines and payment terms.');
      setLoading(false);
      return;
    }

    if (!signatureName.trim()) {
      setErrorMessage('Please type your legal or creator name as an electronic signature.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          password,
          country,
          dateOfBirth,
          isAdultConfirmed,
          termsAgreed,
          signatureName: signatureName.trim(),
          isOnboardOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      success('Welcome to The Pink Room — Page Turning!');
      router.push('/creator');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
      toastError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white dark:bg-neutral-900 p-8 sm:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950 text-pink-600 mb-2">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-neutral-900 dark:text-white">
            {isOnboardOnly ? 'Complete Page-Turning Onboarding' : 'Become a Page-Turning Creator'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            {isOnboardOnly
              ? 'Accept the page-turning production terms to unlock upload access for your existing account.'
              : 'Join our dedicated studio for faceless acoustic page-turning ASMR. Earn $10 per approved video.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isOnboardOnly && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Display / Creator Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (!signatureName) setSignatureName(e.target.value);
                  }}
                  placeholder="e.g. Whispering Pages"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            )}

            <div className={isOnboardOnly ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={isOnboardOnly}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-60"
              />
            </div>
          </div>

          {!isOnboardOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Country of Residence
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {ALL_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Date of Birth (18+ Required)
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Onboarding Agreement Box */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <BrickWall className="w-4 h-4 text-pink-600" />
              <span>Page-Turning Creator Agreement</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              I agree to record original, faceless page-turning ASMR videos lasting at least 180 seconds in a quiet acoustic setting with long press nails and clear paper sounds. I understand that each approved video earns $10.00 USD, and payouts unlock upon accumulating at least 8 approved page-turning videos ($80).
            </p>

            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <label className="flex items-start gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={isAdultConfirmed}
                  onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-pink-600 focus:ring-pink-500"
                />
                <span>I confirm that I am at least 18 years old and legally able to enter into this creator contract.</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-pink-600 focus:ring-pink-500"
                />
                <span>I have read and agree to the <Link href="/guidelines" target="_blank" className="text-pink-600 underline">Recording Guidelines</Link> and <Link href="/earnings-and-payments" target="_blank" className="text-pink-600 underline">Payment Terms</Link>.</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Electronic Signature (Type Your Legal Name)
              </label>
              <input
                type="text"
                required
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Submitting Agreement...' : 'Complete Registration & Enter Studio'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
          Already registered?{' '}
          <Link href="/auth/login" className="font-semibold text-pink-600 hover:underline">
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
