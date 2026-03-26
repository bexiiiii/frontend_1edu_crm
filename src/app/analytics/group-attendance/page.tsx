'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

type Horizon = 6 | 12;

const horizonOptions: { id: Horizon; label: string }[] = [
  { id: 6, label: '6 месяцев' },
  { id: 12, label: '12 месяцев' },
];

const toToggleClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#25c4b8] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const toAverageToneClass = (value: number) => {
  if (value >= 95) return 'text-[#138f86]';
  if (value >= 80) return 'text-[#2a6cc8]';
  return 'text-[#b17b2f]';
};

export default function GroupAttendanceAnalyticsPage() {
  const [horizon, setHorizon] = useState<Horizon>(6);

  const { data: attendanceData, loading } = useApi(
    () => analyticsService.getAllGroupAttendance({}),
    [],
  );

  const groups = useMemo(() => {
    if (!attendanceData) return [];
    const list = Array.isArray(attendanceData) ? attendanceData : [];
    return list.map((g) => ({
      id: g.groupId,
      label: g.groupName,
      points: (g.monthly ?? []).map((m: { month: string; rate: number }) => ({
        month: m.month,
        attendance: Math.round(m.rate * 100) / 100,
      })),
    }));
  }, [attendanceData]);

  const [groupId, setGroupId] = useState<string>('');

  const selectedGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.id === groupId) ?? groups[0];
  }, [groups, groupId]);

  const chartData = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.points.slice(-horizon);
  }, [selectedGroup, horizon]);

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

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <h2 className="text-2xl font-semibold text-[#202938]">Посещаемость групп</h2>

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

          <div className="lg:max-w-[420px] lg:justify-self-end">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">Выберите группу</p>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="crm-select"
            >
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
          <Loader2 className="h-8 w-8 animate-spin text-[#25c4b8]" />
        </div>
      ) : selectedGroup ? (
      <div className="crm-surface p-5">
        <h3 className="text-xl font-semibold text-[#202938]">
          Процент посещаемости по месяцам
        </h3>
        <p className="mt-2 text-sm text-[#7f8794]">Период: {periodLabel}</p>

        <div className="mt-4 h-[460px]">
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
