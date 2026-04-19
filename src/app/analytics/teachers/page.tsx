'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Crown, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { analyticsService } from '@/lib/api';
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

const toTabClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#467aff] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const toMoney = (value: number) => value.toLocaleString('ru-RU');

export default function TeachersAnalyticsPage() {
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [showFormula, setShowFormula] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: teacherData, loading } = useApi(
    () => analyticsService.getTeachers({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const teacherRows = useMemo(() => {
    if (!teacherData?.rows) return [];
    return teacherData.rows.map((r) => ({
      name: r.fullName,
      activeStudents: r.activeStudents,
      soldSubscriptions: r.subscriptionsSold,
      studentsInPeriod: r.studentsInPeriod,
      revenue: r.revenue,
      deltaPercent: r.revenueDeltaPct,
      totalStudents: r.totalStudents,
      avgTenure: r.avgTenureMonths,
      totalTenure: 0,
      index: r.index,
      groupLoadRate: r.groupLoadRate,
    }));
  }, [teacherData]);

  const bestTeacher = useMemo(() => {
    if (teacherRows.length === 0) return null;
    if (teacherData?.topEmployee) {
      const top = teacherData.topEmployee;
      const matchRow = teacherRows.find((r) => r.name === top.fullName);
      return { name: top.fullName, revenue: top.revenue, index: matchRow?.index ?? 0, groupLoadRate: matchRow?.groupLoadRate ?? 0, avgTenure: matchRow?.avgTenure ?? 0, activeStudents: matchRow?.activeStudents ?? top.activeStudents };
    }
    return teacherRows.reduce((best, current) => (current.revenue > best.revenue ? current : best), teacherRows[0]);
  }, [teacherRows, teacherData]);

  const revenueTopChartData = useMemo(() => {
    return [...teacherRows]
      .sort((a, b) => b.revenue - a.revenue)
      .map((r) => ({ teacher: r.name, current: r.revenue, previous: Math.round(r.revenue / (1 + r.deltaPercent / 100) || 0) }));
  }, [teacherRows]);

  const applyPreset = (preset: AnalyticsPeriodPreset) => {
    const range = periodPresets[preset];
    setPeriodPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleFromDateChange = (nextFrom: string) => {
    const normalized = normalizeAnalyticsDateRange(nextFrom, toDate);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleToDateChange = (nextTo: string) => {
    const normalized = normalizeAnalyticsDateRange(fromDate, nextTo);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);

    try {
      const { blob, filename } = await analyticsService.exportTeachers({
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
          <h2 className="text-2xl font-semibold text-[#202938]">Аналитика преподавателей</h2>
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
              className={toTabClass(periodPreset === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="crm-select"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="crm-select"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : bestTeacher ? (
      <>
      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Лучший сотрудник месяца</h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#e6ebf0] bg-[#f7fafc] p-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff7df] text-[#b8891f]">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-[#202938]">{bestTeacher.name}</p>
                <p className="text-sm text-[#7f8794]">Индекс: {bestTeacher.index}/100</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#5f6a7a]">Выручка</p>
            <p className="text-xl font-bold text-[#1f2530]">{toMoney(bestTeacher.revenue)} KZT</p>
          </div>

          <div className="rounded-xl border border-[#e6ebf0] bg-white p-4">
            <p className="text-sm text-[#7f8794]">Загрузка групп</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">{bestTeacher.groupLoadRate}%</p>
          </div>

          <div className="rounded-xl border border-[#e6ebf0] bg-white p-4">
            <p className="text-sm text-[#7f8794]">Срок посещения (ср.)</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">{bestTeacher.avgTenure.toFixed(1)} мес.</p>
            <p className="mt-2 text-sm text-[#7f8794]">Активные ученики: {bestTeacher.activeStudents}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFormula((prev) => !prev)}
          className="mt-4 rounded-lg bg-[#eef3f7] px-3 py-2 text-sm font-semibold text-[#536073] transition-colors hover:bg-[#dde7f0]"
        >
          Показать формулу расчета
        </button>

        {showFormula ? (
          <p className="mt-3 text-sm text-[#6f7786]">
            Индекс учитывает срок удержания (tenure), загрузку групп и выручку за период (с учетом динамики).
          </p>
        ) : null}
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">Топ по выручке</h3>
        <div className="mt-4 h-105">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTopChartData} layout="vertical" margin={{ left: 30, right: 20, top: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="teacher" type="category" tick={{ fill: '#4b5563', fontSize: 14 }} width={240} />
              <Tooltip formatter={(value) => `${toMoney(Number(value))} KZT`} />
              <Bar dataKey="current" name="Текущий период" fill="#4f96d8" radius={[0, 8, 8, 0]} />
              <Bar dataKey="previous" name="Предыдущий период" fill="#8f99a8" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-[#5f6a7a]">Показатели по преподавателям</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">Преподаватель</th>
                <th className="crm-table-th">Активные уч-ки</th>
                <th className="crm-table-th">Продано абонементов (период)</th>
                <th className="crm-table-th">Уч-ки (период)</th>
                <th className="crm-table-th">Выручка (период)</th>
                <th className="crm-table-th">Δ к пред. пер., %</th>
                <th className="crm-table-th">Уч-ки всего</th>
                <th className="crm-table-th">Срок (ср., мес.)</th>
                <th className="crm-table-th">Срок (сумм., мес.)</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {teacherRows.map((row) => (
                <tr key={row.name} className="crm-table-row">
                  <td className="crm-table-cell font-medium text-[#273142]">{row.name}</td>
                  <td className="crm-table-cell">{row.activeStudents}</td>
                  <td className="crm-table-cell">{row.soldSubscriptions}</td>
                  <td className="crm-table-cell">{row.studentsInPeriod}</td>
                  <td className="crm-table-cell">{toMoney(row.revenue)}</td>
                  <td className="crm-table-cell">
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                        row.deltaPercent > 0 ? 'bg-[#e9faf7] text-[#138f86]' : 'bg-[#eef3f7] text-[#5f6a7a]'
                      }`}
                    >
                      {row.deltaPercent > 0 ? '+' : ''}
                      {row.deltaPercent}
                    </span>
                  </td>
                  <td className="crm-table-cell">{row.totalStudents}</td>
                  <td className="crm-table-cell">{row.avgTenure.toFixed(1)}</td>
                  <td className="crm-table-cell">{row.totalTenure.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : null}
    </div>
  );
}
