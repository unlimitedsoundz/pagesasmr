'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    const handleThemeChange = (e: CustomEvent<{ theme: 'light' | 'dark' }>) => {
      setTheme(e.detail.theme);
    };

    window.addEventListener('theme-change' as any, handleThemeChange);
    return () => {
      window.removeEventListener('theme-change' as any, handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    window.dispatchEvent(
      new CustomEvent('theme-change', { detail: { theme: nextTheme } })
    );
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 w-9 h-9 opacity-50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all duration-200 ${
        isDark
          ? 'border-neutral-700 bg-neutral-800/80 text-amber-400 hover:bg-neutral-700/80 hover:text-amber-300 hover:border-neutral-600 shadow-sm'
          : 'border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 hover:text-black shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode (Dark Grey)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 shrink-0 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 shrink-0 transition-transform hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
