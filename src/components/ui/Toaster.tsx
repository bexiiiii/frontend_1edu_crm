'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';
import { pushToast, subscribeToToasts, type Toast } from '@/lib/toast';

const TOAST_TONE_STYLES: Record<Toast['tone'], string> = {
  error: 'border-red-200 bg-white text-red-700',
  success: 'border-emerald-200 bg-white text-emerald-700',
  info: 'border-slate-200 bg-white text-slate-700',
};

const TOAST_ICON_STYLES: Record<Toast['tone'], string> = {
  error: 'text-red-500',
  success: 'text-emerald-500',
  info: 'text-slate-500',
};

function ToastIcon({ tone }: { tone: Toast['tone'] }) {
  if (tone === 'success') {
    return <CheckCircle2 className={`h-5 w-5 ${TOAST_ICON_STYLES[tone]}`} />;
  }

  if (tone === 'error') {
    return <AlertCircle className={`h-5 w-5 ${TOAST_ICON_STYLES[tone]}`} />;
  }

  return <Info className={`h-5 w-5 ${TOAST_ICON_STYLES[tone]}`} />;
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((previous) => [...previous, toast]);

      window.setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.id !== toast.id));
      }, toast.duration);
    });

    const handleWindowError = (event: ErrorEvent) => {
      pushToast({
        message: getErrorMessage(event.error ?? event.message, 'Необработанная ошибка приложения.'),
        tone: 'error',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      pushToast({
        message: getErrorMessage(event.reason, 'Необработанная ошибка приложения.'),
        tone: 'error',
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      unsubscribe();
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${TOAST_TONE_STYLES[toast.tone]}`}
        >
          <ToastIcon tone={toast.tone} />
          <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToasts((previous) => previous.filter((item) => item.id !== toast.id))}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть уведомление"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
