'use client';

import { useMemo, useState } from 'react';
import { BarChart3, DollarSign, Download, Loader2, Users } from 'lucide-react';
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

  const { data, loading, error } = useApi(
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
  const totalExpenses = data?.totalExpenses ?? 0;
  const totalStudents = data?.totalStudents ?? 0;
  const totalLeads = data?.totalLeads ?? 0;
  const avgAttendanceRate = data?.avgAttendance ?? 0;

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
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
              <p className="text-2xl font-bold text-[#1f2530]">{branches.length}</p>
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
            <div className="rounded-xl bg-rose-50 p-2.5">
              <DollarSign className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Общие расходы</p>
              <p className="text-2xl font-bold text-rose-700">{formatMoney(totalExpenses)}</p>
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

        <div className="crm-surface p-5 md:col-span-2 xl:col-span-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-[#7f8794]">Всего студентов</p>
              <p className="mt-1 text-xl font-bold text-[#1f2530]">{totalStudents}</p>
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Всего лидов</p>
              <p className="mt-1 text-xl font-bold text-[#1f2530]">{totalLeads}</p>
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Прибыль (выручка - расходы)</p>
              <p className="mt-1 text-xl font-bold text-[#1f2530]">{formatMoney(totalRevenue - totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

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
                <th className="crm-table-th">Лиды</th>
                <th className="crm-table-th">Активные абонементы</th>
                <th className="crm-table-th">Выручка</th>
                <th className="crm-table-th">Расходы</th>
                <th className="crm-table-th">Уроки</th>
                <th className="crm-table-th">Посещаемость</th>
                <th className="crm-table-th">Загрузка групп</th>
                <th className="crm-table-th">Сотрудники</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {branches.map((branch, index) => (
                <tr key={branch.branchId} className="crm-table-row">
                  <td className="crm-table-cell">{index + 1}</td>
                  <td className="crm-table-cell">
                    <div>
                      <p className="font-semibold text-[#202938]">{branch.branchName}</p>
                      <p className="text-xs text-[#8690a0]">ID: {branch.branchId.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="crm-table-cell">{branch.studentCount}</td>
                  <td className="crm-table-cell">{branch.leadCount}</td>
                  <td className="crm-table-cell">{branch.activeSubscriptions}</td>
                  <td className="crm-table-cell font-semibold text-[#202938]">
                    {formatMoney(branch.revenue)}
                  </td>
                  <td className="crm-table-cell font-semibold text-rose-700">{formatMoney(branch.expenses)}</td>
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
                      {branch.groupLoad}%
                    </span>
                  </td>
                  <td className="crm-table-cell">{branch.staffCount}</td>
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
