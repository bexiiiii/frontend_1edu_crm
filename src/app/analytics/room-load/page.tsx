'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/Button';
import { analyticsService, reportsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import { pushToast } from '@/lib/toast';
import {
  getAnalyticsPeriodOptions,
  getAnalyticsPeriodPresets,
  normalizeAnalyticsDateRange,
  type AnalyticsPeriodPreset,
} from '@/lib/analytics-periods';

type PresetState = AnalyticsPeriodPreset | 'custom';

const toToggleClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#25c4b8] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const getLoadBadgeClass = (load: number) => {
  if (load >= 100) return 'bg-[#ecf4ff] text-[#2a6cc8]';
  if (load >= 70) return 'bg-[#e9faf7] text-[#138f86]';
  if (load > 0) return 'bg-[#fff7e9] text-[#b17b2f]';
  return 'bg-[#eef3f7] text-[#5f6a7a]';
};

export default function RoomLoadAnalyticsPage() {
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [timelineDate, setTimelineDate] = useState(defaultRange.to);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: roomLoadData, loading } = useApi(
    () => analyticsService.getRoomLoad({ from: fromDate, to: toDate, date: timelineDate }),
    [fromDate, toDate, timelineDate],
  );

  const rows = useMemo(() => {
    if (!roomLoadData?.rows) return [];
    return roomLoadData.rows.map((r) => ({
      room: r.roomName,
      lessons: r.lessonsCount,
      students: r.totalStudents,
      capacity: r.totalCapacity,
      load: r.loadPct,
      chartValue: Math.min(r.loadPct, 100),
    }));
  }, [roomLoadData]);

  const timelineRows = useMemo(() => {
    if (!roomLoadData?.timeline) return [];
    return roomLoadData.timeline.map((t) => ({
      room: t.roomName,
      occupiedPercent: t.occupancyPct,
    }));
  }, [roomLoadData]);

  const chartData = useMemo(() => {
    return [...rows].sort((a, b) => b.chartValue - a.chartValue);
  }, [rows]);

  const summary = useMemo(() => {
    const totalLessons = rows.reduce((acc, row) => acc + row.lessons, 0);
    const avgLoad = rows.length > 0 ? Math.round(rows.reduce((acc, row) => acc + row.load, 0) / rows.length) : 0;
    const overloaded = rows.filter((row) => row.load > 100).length;

    return { totalLessons, avgLoad, overloaded };
  }, [rows]);

  const applyPreset = (preset: AnalyticsPeriodPreset) => {
    setPeriodPreset(preset);
    setFromDate(periodPresets[preset].from);
    setToDate(periodPresets[preset].to);
    setTimelineDate(periodPresets[preset].to);
  };

  const handleFromDateChange = (nextFrom: string) => {
    if (!nextFrom) return;
    const normalized = normalizeAnalyticsDateRange(nextFrom, toDate);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
    setTimelineDate(normalized.to);
  };

  const handleToDateChange = (nextTo: string) => {
    if (!nextTo) return;
    const normalized = normalizeAnalyticsDateRange(fromDate, nextTo);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
    setTimelineDate(normalized.to);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);

    try {
      const { blob, filename } = await reportsService.download({
        type: 'ATTENDANCE',
        format: 'PDF',
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      downloadBlob(blob, filename);
      pushToast({ message: 'Отчёт скачивается.', tone: 'success' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#202938]">Загрузка аудиторий</h2>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading}
          >
            {isDownloading ? 'Скачиваем...' : 'Скачать отчёт'}
          </Button>
        </div>

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

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Занятий за период</p>
          <p className="mt-1 text-2xl font-bold text-[#1f2530]">{summary.totalLessons}</p>
        </div>
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Средняя загрузка аудиторий</p>
          <p className="mt-1 text-2xl font-bold text-[#138f86]">{summary.avgLoad}%</p>
        </div>
        <div className="crm-surface p-4">
          <p className="text-sm text-[#7f8794]">Перегруженные аудитории</p>
          <p className="mt-1 text-2xl font-bold text-[#2a6cc8]">{summary.overloaded}</p>
        </div>
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">Топ аудиторий по загрузке</h3>
        <p className="mt-2 text-sm text-[#7f8794]">
          Загрузка = (сумма учеников по занятиям в аудитории / сумма вместимости занятий этой аудитории) × 100.
          Снимок на конец выбранного периода.
        </p>

        <div className="mt-4 h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 52 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
              <XAxis dataKey="room" tick={{ fill: '#5f6a7a', fontSize: 12 }} interval={0} angle={-10} textAnchor="end" height={62} />
              <YAxis tick={{ fill: '#5f6a7a', fontSize: 12 }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="chartValue" name="Загрузка %" radius={[8, 8, 0, 0]}>
                {chartData.map((row) => (
                  <Cell key={row.room} fill="#5b67e8" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <h3 className="text-base font-semibold text-[#273142]">Детализация по аудиториям</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">Аудитория</th>
                <th className="crm-table-th">Занятий</th>
                <th className="crm-table-th">Уч-ков</th>
                <th className="crm-table-th">Вместимость</th>
                <th className="crm-table-th">Загрузка, %</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {rows.map((row) => (
                <tr key={row.room} className="crm-table-row">
                  <td className="crm-table-cell font-medium text-[#273142]">{row.room}</td>
                  <td className="crm-table-cell">{row.lessons}</td>
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

      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">Загруженность по времени (таймлайн)</h3>

        <div className="mt-4 w-full max-w-[280px]">
          <input
            type="date"
            value={timelineDate}
            onChange={(event) => setTimelineDate(event.target.value)}
            className="crm-select"
          />
        </div>

        <p className="mt-3 text-sm text-[#7f8794]">
          Показываем занятость аудиторий в пределах рабочего дня компании (07:00–20:00). Чем длиннее зелёные сегменты,
          тем больше занятость. Значение справа — доля занятого времени за выбранный день.
        </p>

        <div className="mt-5 space-y-4">
          {timelineRows.map((row) => (
            <div key={row.room}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#273142]">{row.room}</p>
                <span className="text-sm font-semibold text-[#5f6a7a]">{row.occupiedPercent}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full border border-[#dbe4ec] bg-[#eef3f7]">
                <div
                  className="h-full"
                  style={{
                    width: `${row.occupiedPercent}%`,
                    background:
                      'repeating-linear-gradient(90deg, #1ec9b3 0px, #1ec9b3 14px, #31d3bf 14px, #31d3bf 18px)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
