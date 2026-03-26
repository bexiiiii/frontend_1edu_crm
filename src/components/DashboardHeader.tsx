'use client';

import { Calendar, ChevronDown } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

export default function DashboardHeader() {
  const { dateRanges, rangeIndex, nextRange } = useDashboardStore();
  const range = dateRanges[rangeIndex] ?? dateRanges[0];

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#1f2530]">Sales Overview</h1>
      </div>
      <button
        type="button"
        onClick={nextRange}
        title={range?.label ?? 'Change date range'}
        aria-label={range?.label ?? 'Change date range'}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-4 text-sm text-[#4a5666] transition-colors hover:bg-[#f4f7f9]"
      >
        <Calendar className="w-4 h-4 text-gray-700" />
        <span className="text-sm font-medium text-[#4a5666]">
          {range ? `${range.from} - ${range.to}` : 'Select range'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
