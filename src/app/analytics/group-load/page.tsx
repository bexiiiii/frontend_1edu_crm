'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import {
  getAnalyticsPeriodOptions,
  getAnalyticsPeriodPresets,
  normalizeAnalyticsDateRange,
  type AnalyticsPeriodPreset,
} from '@/lib/analytics-periods';

type PresetState = AnalyticsPeriodPreset | 'custom';

type LoadRow = {
  name: string;
  students: number;
  capacity: number;
};

const toToggleClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#25c4b8] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const calcLoadPercent = (students: number, capacity: number) => {
  if (students <= 0) return 0;
  const normalizedCapacity = capacity > 0 ? capacity : 1;
  return Math.round((students / normalizedCapacity) * 100);
};

const getLoadBadgeClass = (load: number) => {
  if (load >= 100) return 'bg-[#ecf4ff] text-[#2a6cc8]';
  if (load >= 70) return 'bg-[#e9faf7] text-[#138f86]';
  if (load > 0) return 'bg-[#fff7e9] text-[#b17b2f]';
  return 'bg-[#eef3f7] text-[#5f6a7a]';
};

export default function GroupLoadAnalyticsPage() {
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const { data: groupLoadData, loading } = useApi(
    () => analyticsService.getGroupLoad({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const apiRows: LoadRow[] = useMemo(() => {
    if (!groupLoadData?.rows) return [];
    return groupLoadData.rows.map((r) => ({
      name: r.groupName,
      students: r.studentsCount,
      capacity: r.capacity,
    }));
  }, [groupLoadData]);

  const rows = useMemo(() => {
    return apiRows.map((row) => ({
      ...row,
      load: calcLoadPercent(row.students, row.capacity),
    }));
  }, [apiRows]);

  const chartData = useMemo(() => {
    return [...rows].sort((a, b) => b.load - a.load);
  }, [rows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const overloaded = rows.filter((row) => row.load > 100).length;
    const avgLoad = total > 0 ? Math.round(rows.reduce((acc, row) => acc + row.load, 0) / total) : 0;
    const empty = rows.filter((row) => row.students === 0).length;

    return { total, overloaded, avgLoad, empty };
  }, [rows]);

  const chartMinWidth = Math.max(chartData.length * 130, 980);

  const applyPreset = (preset: AnalyticsPeriodPreset) => {
    setPeriodPreset(preset);
    setFromDate(periodPresets[preset].from);
    setToDate(periodPresets[preset].to);
  };

  const handleFromDateChange = (nextFrom: string) => {
    if (!nextFrom) return;
    const normalized = normalizeAnalyticsDateRange(nextFrom, toDate);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleToDateChange = (nextTo: string) => {
    if (!nextTo) return;
    const normalized = normalizeAnalyticsDateRange(fromDate, nextTo);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <h2 className="text-2xl font-semibold text-[#202938]">Загрузка групп</h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className={toToggleClass(periodPreset === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="date"
            value={fromDate}
            onChange={(event) => handleFromDateChange(event.target.value)}
            className="crm-select"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => handleToDateChange(event.target.value)}
            className="crm-select"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#25c4b8]" />
        </div>
      ) : (
      <>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Элементов</p>
          <p className="mt-1 text-2xl font-bold text-[#1f2530]">{summary.total}</p>
        </div>
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Средняя загрузка</p>
          <p className="mt-1 text-2xl font-bold text-[#138f86]">{summary.avgLoad}%</p>
        </div>
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Перегружено (&gt;100%)</p>
          <p className="mt-1 text-2xl font-bold text-[#2a6cc8]">{summary.overloaded}</p>
        </div>
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Пустые группы</p>
          <p className="mt-1 text-2xl font-bold text-[#5f6a7a]">{summary.empty}</p>
        </div>
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">Топ по загрузке</h3>
        <p className="mt-2 text-sm text-[#7f8794]">
          Загрузка = (учеников в группе / вместимость группы) × 100. Если вместимость равна 0, расчет идёт от
          условной вместимости 1.
        </p>

        <div className="mt-4 overflow-x-auto">
          <div className="h-[430px]" style={{ minWidth: `${chartMinWidth}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 92 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  tick={{ fill: '#5f6a7a', fontSize: 12 }}
                  height={88}
                />
                <YAxis
                  tick={{ fill: '#5f6a7a', fontSize: 12 }}
                  domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="load" name="Загрузка %" radius={[8, 8, 0, 0]}>
                  {chartData.map((row) => (
                    <Cell key={row.name} fill={row.load > 100 ? '#4f96d8' : '#25c4b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
          <h3 className="text-base font-semibold text-[#273142]">Детализация по загрузке</h3>
          <span className="rounded-lg bg-[#eef3f7] px-3 py-1 text-xs font-semibold text-[#5f6a7a]">
            По группам
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">Элемент</th>
                <th className="crm-table-th">Уч-ков в группе</th>
                <th className="crm-table-th">Вместимость</th>
                <th className="crm-table-th">Загрузка, %</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {rows.map((row) => (
                <tr key={row.name} className="crm-table-row">
                  <td className="crm-table-cell font-medium text-[#273142]">{row.name}</td>
                  <td className="crm-table-cell">{row.students}</td>
                  <td className="crm-table-cell">{row.capacity}</td>
                  <td className="crm-table-cell">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getLoadBadgeClass(row.load)}`}>
                      {row.load}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
