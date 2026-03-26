'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { pushToast } from '@/lib/toast';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
    pushToast({
      message: error.message || 'Не удалось загрузить страницу.',
      tone: 'error',
    });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-4xl items-center justify-center">
      <div className="crm-surface w-full p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff1f1]">
            <AlertTriangle className="h-6 w-6 text-[#c34c4c]" />
          </span>

          <div>
            <span className="inline-flex rounded-lg border border-[#f4caca] bg-[#fff1f1] px-3 py-1 text-xs font-semibold text-[#c34c4c]">
              Ошибка приложения
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-[#202938]">Не удалось загрузить страницу</h2>
            <p className="mt-2 text-sm text-[#6f7786]">
              Возникла непредвиденная ошибка при рендеринге. Попробуйте перезагрузить экран.
            </p>
            {error.digest ? (
              <p className="mt-2 text-xs font-medium text-[#8a93a3]">ID ошибки: {error.digest}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25c4b8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1eb3a8]"
          >
            <RotateCcw className="h-4 w-4" />
            Повторить
          </button>

          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-4 text-sm font-semibold text-[#3d4756] transition-colors hover:bg-[#f4f7f9]"
          >
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
