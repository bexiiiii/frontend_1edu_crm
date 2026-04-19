'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
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

const toMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₸`;

const toTabClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#467aff] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

export default function SubscriptionsReportPage() {
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: subsData, loading } = useApi(
    () => analyticsService.getSubscriptions({ from: fromDate || undefined, to: toDate || undefined }),
    [fromDate, toDate],
  );

  const subscriptions = useMemo(() => {
    if (!subsData?.rows) return [];
    return subsData.rows.map((s, i) => ({
      id: s.subscriptionId || String(i + 1),
      client: s.studentName || s.studentId || '—',
      service: s.serviceName || '—',
      amount: s.amount ?? 0,
      status:
        s.status === 'ACTIVE'
          ? 'Активен'
          : s.status === 'EXPIRED'
            ? 'Истек'
            : s.status === 'CANCELLED'
              ? 'Отменен'
              : s.status === 'FROZEN'
                ? 'Заморожен'
                : s.status,
      createdAt: s.createdDate ? new Date(s.createdDate).toLocaleDateString('ru-RU') : '—',
      startsAt: s.startDate ? new Date(s.startDate).toLocaleDateString('ru-RU') : '—',
    }));
  }, [subsData]);

  const totalAmount = useMemo(() => subscriptions.reduce((sum, row) => sum + row.amount, 0), [subscriptions]);

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
      const { blob, filename } = await analyticsService.exportSubscriptions({
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
        <h2 className="text-2xl font-semibold text-[#202938]">Отчет по абонементам</h2>

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
      ) : (
      <>
      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold text-[#1f2530]">
            Итого: <span className="text-[#138f86]">{toMoney(totalAmount)}</span>
          </p>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading}
          >
            {isDownloading ? 'Скачиваем...' : 'Скачать отчёт'}
          </Button>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">Клиент</th>
                <th className="crm-table-th">Услуга</th>
                <th className="crm-table-th">Стоимость</th>
                <th className="crm-table-th">Статус</th>
                <th className="crm-table-th">Создан</th>
                <th className="crm-table-th">Начало действия</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {subscriptions.map((row) => (
                <tr key={row.id} className="crm-table-row">
                  <td className="crm-table-cell font-medium text-[#273142]">{row.client}</td>
                  <td className="crm-table-cell">{row.service}</td>
                  <td className="crm-table-cell font-semibold text-[#273142]">{toMoney(row.amount)}</td>
                  <td className="crm-table-cell">
                    <span className="inline-flex rounded-lg border border-green-200 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      {row.status}
                    </span>
                  </td>
                  <td className="crm-table-cell">{row.createdAt}</td>
                  <td className="crm-table-cell">{row.startsAt}</td>
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
