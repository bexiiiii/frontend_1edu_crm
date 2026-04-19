'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface ReachItem {
  source: string;
  leads: number;
  contracts: number;
  conversion: number;
}

interface CourseReachChartProps {
  data: ReachItem[];
  loading?: boolean;
  limit?: number;
}

export default function CourseReachChart({ data, loading = false, limit }: CourseReachChartProps) {
  const displayData = limit ? data.slice(0, limit) : data;

  return (
    <div className="crm-surface flex h-[335px] flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1f2530]">Источники лидов</h3>
        {limit && (
          <Link
            href="/kanban"
            className="text-xs font-medium text-[#467aff] transition-colors hover:underline"
          >
            Смотреть больше
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#dbe2e8] bg-[#f8fbfd] px-4 text-center text-sm text-[#7f8794]">
          Нет данных по источникам лидов за выбранный период.
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {displayData.map((item) => (
            <div key={item.source} className="rounded-2xl border border-[#e6ecf5] bg-[#f8fbfd] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1f2530]">{item.source}</p>
                  <p className="mt-1 text-xs text-[#7f8794]">
                    Лидов: {item.leads.toLocaleString('ru-RU')} · Договоров: {item.contracts.toLocaleString('ru-RU')}
                  </p>
                </div>
                <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-xs font-semibold text-[#315fd0]">
                  {item.conversion.toFixed(1)}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe7f5]">
                <div
                  className="h-full rounded-full bg-[#467aff]"
                  style={{ width: `${Math.min(Math.max(item.conversion, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
