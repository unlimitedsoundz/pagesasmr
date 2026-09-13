'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast({ type: 'success', title: title || 'Success', message }),
    error: (message: string, title?: string) => addToast({ type: 'error', title: title || 'Error', message }),
    info: (message: string, title?: string) => addToast({ type: 'info', title: title || 'Notice', message }),
    warning: (message: string, title?: string) => addToast({ type: 'warning', title: title || 'Warning', message }),
  };

  return (
    <ToastContext.Provider value={{ toast, success: toast.success, error: toast.error, info: toast.info, warning: toast.warning, addToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div
        aria-live="assertive"
        className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl p-4 border bg-white border-neutral-300 text-black shadow-lg transition-all duration-300 transform translate-y-0 animate-fade-in flex items-start gap-3.5 ${t.type === 'error' ? 'border-l-4 border-l-black' : ''}`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-black" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-black" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-black" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-black" />}
              </div>

              <div className="flex-1 space-y-0.5 pr-1">
                {t.title && <div className="text-xs font-bold font-serif text-black">{t.title}</div>}
                <div className="text-xs leading-relaxed text-black font-medium opacity-90">{t.message}</div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-black hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
