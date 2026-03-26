'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Toaster } from '@/components/ui/Toaster';
import { pushToast } from '@/lib/toast';

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
    pushToast({
      message: error.message || 'Сервис временно недоступен.',
      tone: 'error',
    });
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#f3f5f7] antialiased">
        <Toaster />
        <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-4 md:p-6">
          <div className="crm-surface w-full p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff1f1]">
                <AlertTriangle className="h-6 w-6 text-[#c34c4c]" />
              </span>

              <div>
                <span className="inline-flex rounded-lg border border-[#f4caca] bg-[#fff1f1] px-3 py-1 text-xs font-semibold text-[#c34c4c]">
                  Критическая ошибка
                </span>
                <h1 className="mt-3 text-2xl font-semibold text-[#202938]">Сервис временно недоступен</h1>
                <p className="mt-2 text-sm text-[#6f7786]">
                  Произошла системная ошибка верхнего уровня. Попробуйте обновить страницу.
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
        </main>
      </body>
    </html>
  );
}
