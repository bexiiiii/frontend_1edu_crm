'use client';

import { useMemo, useState } from 'react';
import { BarChart3, DollarSign, Download, Loader2, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₸`;
}

function getCurrentMonth(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 7);
}

function getMonthRange(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNum, 0));
  
  return {
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0],
  };
}

export default function BranchAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const dateRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  const { data, loading, error, refetch } = useApi(
    () => analyticsService.getBranches({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to]
  );

  const handleExport = async () => {
    try {
      const { blob, filename } = await analyticsService.exportBranches({
        from: dateRange.from,
        to: dateRange.to,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const branches = useMemo(() => data?.branches ?? [], [data]);
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalStudents = data?.totalStudents ?? 0;
  const totalLessons = data?.totalLessons ?? 0;
  const avgAttendanceRate = data?.avgAttendanceRate ?? 0;
  const topBranchByRevenue = data?.topBranchByRevenue;
  const topBranchByAttendance = data?.topBranchByAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f2530]">Аналитика по филиалам</h1>
          <p className="mt-1 text-sm text-[#7f8794]">Сравнение показателей филиалов</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-[#dbe2e8] bg-white px-4 py-2 text-sm font-medium text-[#273142] transition-colors hover:bg-[#f8fafc]"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      </div>

      {/* Month Selector */}
      <div className="crm-surface p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-[#202938]">Месяц:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || getCurrentMonth())}
            className="crm-select"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eef5ff] p-2.5">
              <Users className="h-5 w-5 text-[#467aff]" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Филиалов</p>
              <p className="text-2xl font-bold text-[#1f2530]">{data?.totalBranches ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Общая выручка</p>
              <p className="text-2xl font-bold text-emerald-700">{formatMoney(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Студентов</p>
              <p className="text-2xl font-bold text-[#1f2530]">{totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-2.5">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Средняя посещаемость</p>
              <p className="text-2xl font-bold text-[#1f2530]">{avgAttendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Branches */}
      {(topBranchByRevenue || topBranchByAttendance) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {topBranchByRevenue && (
            <div className="crm-surface border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">Лучший по выручке</p>
              </div>
              <p className="mt-2 text-lg font-bold text-[#1f2530]">{topBranchByRevenue.branchName}</p>
              <p className="text-sm text-emerald-700">{formatMoney(topBranchByRevenue.revenue)}</p>
            </div>
          )}
          {topBranchByAttendance && (
            <div className="crm-surface border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">Лучший по посещаемости</p>
              </div>
              <p className="mt-2 text-lg font-bold text-[#1f2530]">{topBranchByAttendance.branchName}</p>
              <p className="text-sm text-blue-700">{topBranchByAttendance.attendanceRate}%</p>
            </div>
          )}
        </div>
      )}

      {/* Branches Table */}
      <div className="crm-table-wrap overflow-hidden">
        {loading ? (
          <div className="crm-surface flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : error ? (
          <div className="crm-surface rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : branches.length > 0 ? (
          <table className="w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">#</th>
                <th className="crm-table-th">Филиал</th>
                <th className="crm-table-th">Студенты</th>
                <th className="crm-table-th">Активные</th>
                <th className="crm-table-th">Выручка</th>
                <th className="crm-table-th">Динамика</th>
                <th className="crm-table-th">Уроки</th>
                <th className="crm-table-th">Посещаемость</th>
                <th className="crm-table-th">Новые</th>
                <th className="crm-table-th">Отток</th>
                <th className="crm-table-th">Удержание</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {branches.map((branch, index) => (
                <tr key={branch.branchId} className="crm-table-row">
                  <td className="crm-table-cell">{index + 1}</td>
                  <td className="crm-table-cell">
                    <div>
                      <p className="font-semibold text-[#202938]">{branch.branchName}</p>
                      <p className="text-xs text-[#8690a0]">{branch.branchCode}</p>
                    </div>
                  </td>
                  <td className="crm-table-cell">{branch.studentsCount}</td>
                  <td className="crm-table-cell">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-700">
                      {branch.activeStudents}
                    </span>
                  </td>
                  <td className="crm-table-cell font-semibold text-[#202938]">
                    {formatMoney(branch.revenue)}
                  </td>
                  <td className="crm-table-cell">
                    {branch.revenueDeltaPct > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <TrendingUp className="h-3 w-3" />
                        +{branch.revenueDeltaPct}%
                      </span>
                    ) : branch.revenueDeltaPct < 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <TrendingDown className="h-3 w-3" />
                        {branch.revenueDeltaPct}%
                      </span>
                    ) : (
                      <span className="text-[#8690a0]">0%</span>
                    )}
                  </td>
                  <td className="crm-table-cell">{branch.lessonsCount}</td>
                  <td className="crm-table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-[#e4eaf0]">
                        <div
                          className="h-2 rounded-full bg-[#467aff]"
                          style={{ width: `${Math.min(branch.attendanceRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{branch.attendanceRate}%</span>
                    </div>
                  </td>
                  <td className="crm-table-cell">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">
                      +{branch.newStudents}
                    </span>
                  </td>
                  <td className="crm-table-cell">
                    <span className="rounded-md bg-rose-50 px-2 py-1 text-sm font-medium text-rose-700">
                      {branch.droppedStudents}
                    </span>
                  </td>
                  <td className="crm-table-cell">
                    <span
                      className={`rounded-md px-2 py-1 text-sm font-medium ${
                        branch.retentionRate >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : branch.retentionRate >= 60
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {branch.retentionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="crm-surface py-10 text-center text-sm text-[#8a93a3]">
            Нет данных по филиалам за выбранный период
          </div>
        )}
      </div>
    </div>
  );
}
