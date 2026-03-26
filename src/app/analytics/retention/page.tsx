'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  type CohortBasis,
  type RetentionHorizon,
  type RetentionPeriodPreset,
  RETENTION_BASIS_OPTIONS,
  RETENTION_DEFAULT_RANGE,
  RETENTION_HORIZON_OPTIONS,
  RETENTION_PERIOD_PRESETS,
} from '@/constants/retention';
import {
  formatDateDdMmYyyy,
  getRetentionHeatColor,
  normalizeDateRange,
} from '@/lib/retention';
import { analyticsService, reportsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import { pushToast } from '@/lib/toast';

type PresetState = RetentionPeriodPreset | 'custom';

const periodOptions: { id: RetentionPeriodPreset; label: string }[] = [
  { id: 'week', label: RETENTION_PERIOD_PRESETS.week.label },
  { id: 'month', label: RETENTION_PERIOD_PRESETS.month.label },
  { id: 'previousMonth', label: RETENTION_PERIOD_PRESETS.previousMonth.label },
  { id: 'quarter', label: RETENTION_PERIOD_PRESETS.quarter.label },
  { id: 'year', label: RETENTION_PERIOD_PRESETS.year.label },
];

const toToggleClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#25c4b8] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

export default function RetentionPage() {
  const [cohortBasis, setCohortBasis] = useState<CohortBasis>('first_payment');
  const [horizon, setHorizon] = useState<RetentionHorizon>(6);
  const [preset, setPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(RETENTION_DEFAULT_RANGE.from);
  const [toDate, setToDate] = useState(RETENTION_DEFAULT_RANGE.to);
  const [isDownloading, setIsDownloading] = useState(false);

  const normalizedRange = useMemo(
    () => normalizeDateRange(fromDate, toDate),
    [fromDate, toDate],
  );

  const { data: retentionData, loading } = useApi(
    () => analyticsService.getRetention({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const rows = useMemo(() => {
    if (!retentionData?.cohorts) return [];
    return retentionData.cohorts.map((c) => {
      const allValues = [c.m0 ?? 0, c.m1 ?? 0, c.m2 ?? 0, c.m3 ?? 0, c.m4 ?? 0, c.m5 ?? 0];
      return {
        monthKey: c.cohortKey,
        cohortLabel: c.cohort,
        size: c.size,
        values: allValues.slice(0, horizon),
      };
    });
  }, [retentionData, horizon]);

  const horizonColumns = useMemo(
    () => Array.from({ length: horizon }, (_, index) => `M+${index}`),
    [horizon],
  );

  const applyPreset = (nextPreset: RetentionPeriodPreset) => {
    const nextRange = RETENTION_PERIOD_PRESETS[nextPreset];
    setPreset(nextPreset);
    setFromDate(nextRange.from);
    setToDate(nextRange.to);
  };

  const handleDateChange = (nextFrom: string, nextTo: string) => {
    const normalized = normalizeDateRange(nextFrom, nextTo);
    setPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);

    try {
      const { blob, filename } = await reportsService.download({
        type: 'STUDENTS',
        format: 'PDF',
        from: normalizedRange.from || undefined,
        to: normalizedRange.to || undefined,
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
          <h2 className="text-2xl font-semibold text-[#202938]">
            Когортный анализ ({formatDateDdMmYyyy(normalizedRange.from)} —{' '}
            {formatDateDdMmYyyy(normalizedRange.to)})
          </h2>

          <Button
            variant="secondary"
            icon={Download}
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading}
          >
            {isDownloading ? 'Скачиваем...' : 'Скачать отчёт'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">
              База когорты
            </p>
            <div className="flex flex-wrap gap-2">
              {RETENTION_BASIS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCohortBasis(option.id)}
                  className={toToggleClass(cohortBasis === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">
              Горизонт
            </p>
            <div className="flex flex-wrap gap-2">
              {RETENTION_HORIZON_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setHorizon(option)}
                  className={toToggleClass(horizon === option)}
                >
                  {option} мес
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">
              Период
            </p>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPreset(option.id)}
                  className={toToggleClass(preset === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">
              Диапазон дат
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleDateChange(e.target.value, toDate);
                }}
                className="crm-select"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleDateChange(fromDate, e.target.value);
                }}
                className="crm-select"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#25c4b8]" />
        </div>
      ) : (
      <>
      <div className="crm-table-wrap overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th sticky left-0 z-20 w-[220px] bg-[#f6f8fa]">Когорта</th>
                <th className="crm-table-th sticky z-20 w-[120px] bg-[#f6f8fa]" style={{ left: 220 }}>
                  Размер
                </th>
                {horizonColumns.map((column) => (
                  <th key={column} className="crm-table-th text-center">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="crm-table-body">
              {rows.length > 0 ? (
                rows.map((row, rowIndex) => {
                  const stickyBg = rowIndex % 2 === 0 ? '#f8fafc' : '#f4f7fa';

                  return (
                    <tr key={row.monthKey} className="crm-table-row">
                      <td
                        className="crm-table-cell sticky left-0 z-10 font-semibold text-[#273142]"
                        style={{ backgroundColor: stickyBg }}
                      >
                        {row.cohortLabel}
                      </td>
                      <td
                        className="crm-table-cell sticky z-10 text-center font-semibold text-[#273142]"
                        style={{ left: 220, backgroundColor: stickyBg }}
                      >
                        {row.size}
                      </td>
                      {row.values.map((value, columnIndex) => (
                        <td
                          key={`${row.monthKey}-${columnIndex}`}
                          className="px-4 py-3 text-center text-sm font-semibold text-[#2f3745]"
                          style={{ backgroundColor: getRetentionHeatColor(value) }}
                        >
                          {value}%
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr className="crm-table-row">
                  <td
                    colSpan={horizonColumns.length + 2}
                    className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]"
                  >
                    Нет данных за выбранный период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="crm-surface p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#6f7786]">Хуже</span>
          <div
            className="h-4 flex-1 rounded-full border border-[#e2e8ee]"
            style={{
              background:
                'linear-gradient(90deg, rgb(242,186,186) 0%, rgb(245,233,176) 50%, rgb(185,229,189) 100%)',
            }}
          />
          <span className="text-sm font-medium text-[#6f7786]">Лучше</span>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
