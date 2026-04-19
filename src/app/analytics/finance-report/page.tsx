'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CircleDollarSign, Download, Loader2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
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
type FinanceTab = 'income' | 'expense';

const financeTabs: { id: FinanceTab; label: string }[] = [
  { id: 'income', label: 'Доходы' },
  { id: 'expense', label: 'Расходы' },
];

const PIE_COLORS = ['#467aff', '#4f9cff', '#f59e0b', '#ef6b6b', '#8b5cf6', '#ec4899'];

const toTabClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#467aff] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const toMoney = (value: number) =>
  `${value.toLocaleString('ru-RU')} ₸`;

export default function FinanceReportPage() {
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [activeFinanceTab, setActiveFinanceTab] = useState<FinanceTab>('income');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: reportData, loading } = useApi(
    () => analyticsService.getFinanceReport({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const d = reportData;
  const totalRevenue = d?.revenue ?? 0;
  const totalExpenses = d?.expenses ?? 0;
  const profit = d?.profit ?? 0;

  const monthlyDynamics = useMemo(() => {
    if (!d?.monthly) return [];
    return d.monthly.map((m) => ({
      month: m.label || m.month,
      income: m.revenue ?? 0,
      expense: m.expenses ?? 0,
      profit: m.profit ?? 0,
    }));
  }, [d]);

  const expenseCategoryData = useMemo(() => {
    if (!d?.expensesByCategory) return [];
    return d.expensesByCategory.map((c: { category: string; amount: number }) => ({
      category: c.category,
      amount: c.amount,
    }));
  }, [d]);

  const incomeCategoryData = useMemo(() => {
    if (!d?.revenueByCategory?.length) return [{ name: 'Доходы', value: totalRevenue, color: '#467aff' }];
    return d.revenueByCategory.map((c) => ({ name: c.category, value: c.amount, color: '#467aff' }));
  }, [d, totalRevenue]);

  const statCards = useMemo(() => [
    { title: 'Доходы', value: totalRevenue, icon: CircleDollarSign, tone: 'text-[#138f86]', bg: 'bg-[#e9faf7]' },
    { title: 'Расходы', value: totalExpenses, icon: TrendingDown, tone: 'text-[#c34c4c]', bg: 'bg-[#fff1f1]' },
    { title: 'Прибыль', value: profit, icon: TrendingUp, tone: 'text-[#2a6cc8]', bg: 'bg-[#ecf4ff]' },
  ], [totalRevenue, totalExpenses, profit]);

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
      const { blob, filename } = await analyticsService.exportFinanceReport({
        from: fromDate,
        to: toDate,
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
          <h2 className="text-2xl font-semibold text-[#202938]">Финансовый отчет</h2>
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
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="crm-surface p-5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.tone}`} />
                </span>
                <p className="text-sm font-semibold text-[#5f6a7a]">{card.title}</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#1f2530]">{toMoney(card.value)}</p>
            </div>
          );
        })}
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Доходы и расходы</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {financeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFinanceTab(tab.id)}
              className={toTabClass(activeFinanceTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h4 className="text-base font-semibold text-[#273142]">Динамика по месяцам</h4>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDynamics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => toMoney(Number(value))} />
                {activeFinanceTab === 'income' ? (
                  <Line type="monotone" dataKey="income" stroke="#467aff" strokeWidth={3} name="Доходы" />
                ) : (
                  <Line type="monotone" dataKey="expense" stroke="#ef6b6b" strokeWidth={3} name="Расходы" />
                )}
                <Line type="monotone" dataKey="profit" stroke="#4f9cff" strokeWidth={2} name="Прибыль" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="crm-table-wrap mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">Месяц</th>
                  <th className="crm-table-th">Доходы</th>
                  <th className="crm-table-th">Расходы</th>
                  <th className="crm-table-th">Прибыль</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                <tr className="crm-table-row">
                  <td className="crm-table-cell font-medium text-[#273142]">{monthlyDynamics.length > 0 ? monthlyDynamics[monthlyDynamics.length - 1].month : '—'}</td>
                  <td className="crm-table-cell">
                    <p className="font-semibold text-[#138f86]">{toMoney(totalRevenue)}</p>
                  </td>
                  <td className="crm-table-cell">
                    <p className="font-semibold text-[#c34c4c]">{toMoney(totalExpenses)}</p>
                  </td>
                  <td className="crm-table-cell">
                    <p className="font-semibold text-[#2a6cc8]">{toMoney(profit)}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="crm-surface p-5 xl:col-span-2">
          <p className="text-sm text-[#7f8794]">Период: {fromDate} — {toDate}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-[#e9faf7] p-4">
              <p className="text-sm text-[#5f6a7a]">Доходы</p>
              <p className="mt-1 text-xl font-bold text-[#138f86]">{toMoney(totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-[#fff1f1] p-4">
              <p className="text-sm text-[#5f6a7a]">Расходы</p>
              <p className="mt-1 text-xl font-bold text-[#c34c4c]">{toMoney(totalExpenses)}</p>
            </div>
            <div className="rounded-xl bg-[#ecf4ff] p-4">
              <p className="text-sm text-[#5f6a7a]">Чистая прибыль</p>
              <p className="mt-1 text-xl font-bold text-[#2a6cc8]">{toMoney(profit)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="crm-surface-soft rounded-xl p-4">
              <p className="text-sm font-semibold text-[#273142]">Доходы по статьям</p>
              <p className="mt-1 text-lg font-bold text-[#138f86]">{toMoney(totalRevenue)}</p>
              <div className="mt-3 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeCategoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                      {incomeCategoryData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => toMoney(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="crm-surface-soft rounded-xl p-4">
              <p className="text-sm font-semibold text-[#273142]">Расходы по статьям</p>
              <p className="mt-1 text-lg font-bold text-[#c34c4c]">{toMoney(totalExpenses)}</p>
              <div className="mt-3 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                    <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip formatter={(value) => toMoney(Number(value))} />
                    <Bar dataKey="amount" fill="#ef6b6b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <p className="text-sm font-semibold text-[#273142]">Расходы по категориям</p>
          <p className="mt-1 text-lg font-bold text-[#c34c4c]">{toMoney(totalExpenses)}</p>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip formatter={(value) => toMoney(Number(value))} />
                <Bar dataKey="amount" fill="#ef6b6b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 rounded-xl bg-[#f4f8fb] p-4">
            <p className="text-sm text-[#5f6a7a]">Чистая прибыль</p>
            <p className="mt-1 text-2xl font-bold text-[#2a6cc8]">{toMoney(profit)}</p>
          </div>
        </div>
      </div>

      <div className="crm-surface p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2f6] text-[#4f5c6c]">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-[#202938]">Сверка с абонементами за период</h3>
            <p className="text-sm text-[#7f8794]">{fromDate} — {toDate}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="crm-surface-soft rounded-xl p-4">
            <p className="text-xs text-[#7f8794]">Общий доход</p>
            <p className="mt-1 text-base font-semibold text-[#273142]">{toMoney(totalRevenue)}</p>
          </div>
          <div className="crm-surface-soft rounded-xl p-4">
            <p className="text-xs text-[#7f8794]">Общие расходы</p>
            <p className="mt-1 text-base font-semibold text-[#273142]">{toMoney(totalExpenses)}</p>
          </div>
          <div className="crm-surface-soft rounded-xl p-4">
            <p className="text-xs text-[#7f8794]">Чистая прибыль</p>
            <p className="mt-1 text-base font-semibold text-[#273142]">{toMoney(profit)}</p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
