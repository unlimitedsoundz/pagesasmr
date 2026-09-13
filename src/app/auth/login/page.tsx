'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/creator';
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      success(`Welcome back, ${data.user.display_name}!`);

      // If user is ADMIN, navigate directly to admin dashboard
      if (data.user?.role === 'ADMIN') {
        const adminDest = redirectPath && redirectPath !== '/creator' ? redirectPath : '/admin';
        router.push(adminDest);
        router.refresh();
        return;
      }

      // If creator needs page-turning onboarding/terms acceptance
      if (!data.membership || !data.membership.terms_agreed) {
        router.push(`/auth/register?onboard=true&email=${encodeURIComponent(email)}`);
      } else {
        router.push(redirectPath);
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
      toastError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-neutral-900 p-8 sm:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950 text-pink-600 mb-2">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-neutral-900 dark:text-white">
            Creator Sign In
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Access your page-turning creator dashboard and video submissions.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 leading-relaxed pt-1">
            Existing Pink Room creators can use their existing account credentials.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
          New creator?{' '}
          <Link href="/auth/register" className="font-semibold text-pink-600 hover:underline">
            Register as a Page-Turning Creator
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
