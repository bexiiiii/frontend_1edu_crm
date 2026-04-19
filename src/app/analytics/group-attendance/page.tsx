'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { analyticsService, schedulesService, type GroupAttendanceResponse } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import { pushToast } from '@/lib/toast';

type Horizon = 6 | 12;

const horizonOptions: { id: Horizon; label: string }[] = [
  { id: 6, label: '6 месяцев' },
  { id: 12, label: '12 месяцев' },
];

const toToggleClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#467aff] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const toAverageToneClass = (value: number) => {
  if (value >= 95) return 'text-[#138f86]';
  if (value >= 80) return 'text-[#2a6cc8]';
  return 'text-[#b17b2f]';
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeByMonths(months: Horizon): { from: string; to: string } {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  return {
    from: toIsoDate(fromDate),
    to: toIsoDate(now),
  };
}

export default function GroupAttendanceAnalyticsPage() {
  const [horizon, setHorizon] = useState<Horizon>(6);
  const [groupId, setGroupId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const dateRange = useMemo(() => getRangeByMonths(horizon), [horizon]);

  const { data: schedulesData, loading: schedulesLoading } = useApi(
    () => schedulesService.getAll({ page: 0, size: 500 }),
    [],
  );

  const groups = useMemo(() => {
    return (schedulesData?.content || [])
      .map((schedule) => ({ id: schedule.id, label: schedule.name }))
      .sort((left, right) => left.label.localeCompare(right.label, 'ru-RU'));
  }, [schedulesData]);

  useEffect(() => {
    if (!groupId && groups.length > 0) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  const { data: attendanceData, loading: attendanceLoading, error: attendanceError } = useApi<GroupAttendanceResponse | null>(
    () => (
      groupId
        ? analyticsService.getGroupAttendance(groupId, dateRange)
        : Promise.resolve({ data: null })
    ),
    [groupId, dateRange.from, dateRange.to],
  );

  const loading = schedulesLoading || attendanceLoading;

  const selectedGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.id === groupId) ?? groups[0];
  }, [groups, groupId]);

  const chartData = useMemo(() => {
    if (!attendanceData?.monthly) return [];
    return attendanceData.monthly
      .slice(-horizon)
      .map((item) => ({
        month: item.month,
        attendance: Math.round(item.rate * 100) / 100,
      }));
  }, [attendanceData, horizon]);

  const averageAttendance = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc: number, item: { attendance: number }) => acc + item.attendance, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  const periodLabel = useMemo(() => {
    if (chartData.length === 0) return '';
    const first = chartData[0]?.month;
    const last = chartData[chartData.length - 1]?.month;
    return `${first} — ${last}`;
  }, [chartData]);

  const handleDownloadReport = async () => {
    if (!groupId) {
      return;
    }

    setIsDownloading(true);

    try {
      const { blob, filename } = await analyticsService.exportGroupAttendance({
        groupId,
        months: horizon,
        from: dateRange.from,
        to: dateRange.to,
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
          <h2 className="text-2xl font-semibold text-[#202938]">Посещаемость групп</h2>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading || !groupId}
          >
            {isDownloading ? 'Скачиваем...' : 'Скачать отчёт'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            {horizonOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setHorizon(option.id)}
                className={toToggleClass(horizon === option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="lg:max-w-105 lg:justify-self-end">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">Выберите группу</p>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="crm-select"
            >
              {groups.length === 0 ? <option value="">Группы не найдены</option> : null}
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : attendanceError ? (
        <div className="crm-surface rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Не удалось загрузить посещаемость группы: {attendanceError}
        </div>
      ) : selectedGroup ? (
      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">
          Процент посещаемости по месяцам
        </h3>
        <p className="mt-2 text-sm text-[#7f8794]">Период: {periodLabel}</p>

        <div className="mt-4 h-115">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
              <XAxis dataKey="month" tick={{ fill: '#5f6a7a', fontSize: 12 }} />
              <YAxis tick={{ fill: '#5f6a7a', fontSize: 12 }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="attendance" fill="#4f96d8" radius={[8, 8, 0, 0]} name="Посещаемость" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-2xl font-medium text-[#5f6a7a]">
          Средняя посещаемость за период:{' '}
          <span className={`font-bold ${toAverageToneClass(averageAttendance)}`}>
            {averageAttendance}%
          </span>
        </p>
      </div>
      ) : null}
    </div>
  );
}
