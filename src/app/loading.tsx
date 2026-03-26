import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-4xl items-center justify-center">
      <div className="crm-surface w-full p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3f7]">
            <Loader2 className="h-6 w-6 animate-spin text-[#5f6a7a]" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-[#202938]">Загрузка данных</h2>
            <p className="mt-1 text-sm text-[#6f7786]">Подождите, формируем страницу в вашем рабочем стиле CRM.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[#edf2f6]" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-[#edf2f6]" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-[#edf2f6]" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-[#f3f6f9]" />
        </div>
      </div>
    </div>
  );
}

