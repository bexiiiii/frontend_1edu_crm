'use client';

import { useMemo } from 'react';
import { ReceiptText, ShoppingCart, Users, Package } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import SalesChart from '@/components/SalesChart';
import OrdersChart from '@/components/OrdersChart';
import CourseReachChart from '@/components/CourseReachChart';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';

const SUBSCRIPTION_STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Активные', color: '#467aff' },
  EXPIRED: { label: 'Истекли', color: '#f59e0b' },
  CANCELLED: { label: 'Отменены', color: '#ef4444' },
  FROZEN: { label: 'Заморожены', color: '#8b5cf6' },
};

export default function Dashboard() {
  const { from, to } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: start.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    };
  }, []);

  const { data: dashboard, loading } = useApi(() => analyticsService.getDashboard({ from, to }), [from, to]);
  const { data: today } = useApi(() => analyticsService.getToday(), []);
  const { data: financeReport, loading: financeLoading } = useApi(
    () => analyticsService.getFinanceReport({ from, to }),
    [from, to]
  );
  const { data: subscriptionsReport, loading: subscriptionsLoading } = useApi(
    () => analyticsService.getSubscriptions({ from, to }),
    [from, to]
  );
  const { data: leadConversions, loading: leadConversionsLoading } = useApi(
    () => analyticsService.getLeadConversions({ from, to }),
    [from, to]
  );

  const salesChartData = useMemo(
    () =>
      (financeReport?.monthly ?? []).map((item) => ({
        label: item.label || item.month,
        value: item.revenue ?? 0,
      })),
    [financeReport]
  );

  const subscriptionChartData = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of subscriptionsReport?.rows ?? []) {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([status, value]) => ({
        name: SUBSCRIPTION_STATUS_META[status]?.label ?? status,
        value,
        color: SUBSCRIPTION_STATUS_META[status]?.color ?? '#94a3b8',
      }))
      .sort((left, right) => right.value - left.value);
  }, [subscriptionsReport]);

  const reachChartData = useMemo(
    () =>
      (leadConversions?.bySource ?? [])
        .filter((item) => item.leads > 0 || item.contracts > 0)
        .sort((left, right) => right.leads - left.leads)
        .slice(0, 5)
        .map((item) => ({
          source: item.source || 'Без источника',
          leads: item.leads,
          contracts: item.contracts,
          conversion: item.conversionPct,
        })),
    [leadConversions]
  );

  const debtors = useMemo(() => today?.debtors ?? [], [today]);
  const upcomingBirthdays = useMemo(() => today?.upcomingBirthdays ?? [], [today]);

  const formatMoney = (value: number): string => {
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value < 0 ? `-${formatted}` : formatted;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:col-span-2">
          <MetricCard
            title="Общий доход"
            value={loading ? '...' : `${(dashboard?.revenue ?? 0).toLocaleString('ru-RU')} ₸`}
            change={`${dashboard?.revenueDeltaPct ?? 0}%`}
            isPositive={(dashboard?.revenueDeltaPct ?? 0) >= 0}
            icon={ReceiptText}
            iconBgColor="bg-[#edf3ff]"
            iconColor="text-[#467aff]"
          />
          <MetricCard
            title="Средний чек"
            value={loading ? '...' : `${(dashboard?.averageCheck ?? 0).toLocaleString('ru-RU')} ₸`}
            change={`${dashboard?.subscriptionsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.subscriptionsDeltaPct ?? 0) >= 0}
            icon={ShoppingCart}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <MetricCard
            title="Всего учеников"
            value={loading ? '...' : String(dashboard?.studentsAtEnd ?? 0)}
            change={`${dashboard?.studentsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.studentsDeltaPct ?? 0) >= 0}
            icon={Users}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <MetricCard
            title="Активные ученики (группы)"
            value={loading ? '...' : String(dashboard?.activeGroupStudents ?? 0)}
            change={`${dashboard?.leadsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.leadsDeltaPct ?? 0) >= 0}
            icon={Package}
            iconBgColor="bg-pink-50"
            iconColor="text-pink-600"
          />
        </div>

        <div className="xl:col-span-1">
          <OrdersChart
            data={subscriptionChartData}
            total={subscriptionsReport?.totalCount ?? 0}
            loading={subscriptionsLoading}
          />
        </div>
      </div>

      {today && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Уроков сегодня</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.conductedLessons ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Присутствовало</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.attendedStudents ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Новые записи</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.newEnrollments ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Доход сегодня</p>
            <p className="text-2xl font-bold text-[#1f2530]">{(today.todayRevenue ?? 0).toLocaleString('ru-RU')} ₸</p>
          </div>
        </div>
      )}

      {/* Debtors & Birthdays */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Debtors */}
        <div className="crm-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1f2530]">Должники</h3>
            {debtors.length > 0 && (
              <Link
                href="/finance/student-payments"
                className="text-xs font-medium text-[#467aff] transition-colors hover:underline"
              >
                Смотреть больше
              </Link>
            )}
          </div>

          {debtors.length > 0 ? (
            <div className="space-y-2">
              {debtors.slice(0, 3).map((debtor) => (
                <Link
                  key={debtor.studentId}
                  href={`/students/${debtor.studentId}`}
                  className="flex items-center justify-between rounded-lg border border-[#e6ebf0] bg-white p-3 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd]"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1f2530]">{debtor.fullName}</div>
                    <div className="text-xs text-[#7d8795]">ID: {debtor.studentId.slice(0, 8)}...</div>
                  </div>
                  <div className="text-sm font-bold text-rose-700">
                    {formatMoney(debtor.balance)} ₸
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#e6ebf0] bg-[#f8fbfd] py-10 text-center text-sm text-[#8a94a3]">
              Нет должников
            </div>
          )}
        </div>

        {/* Upcoming Birthdays */}
        <div className="crm-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1f2530]">Дни рождения</h3>
            {upcomingBirthdays.length > 0 && (
              <Link
                href="/students"
                className="text-xs font-medium text-[#467aff] transition-colors hover:underline"
              >
                Смотреть больше
              </Link>
            )}
          </div>

          {upcomingBirthdays.length > 0 ? (
            <div className="space-y-2">
              {upcomingBirthdays.slice(0, 3).map((birthday) => (
                <Link
                  key={birthday.studentId}
                  href={`/students/${birthday.studentId}`}
                  className="flex items-center justify-between rounded-lg border border-[#e6ebf0] bg-white p-3 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd]"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1f2530]">{birthday.fullName}</div>
                    <div className="text-xs text-[#7d8795]">
                      {formatDate(birthday.birthDate)} • Исполняется {birthday.turnsAge} лет
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-700">
                      {birthday.daysUntil === 0 ? 'Сегодня' : birthday.daysUntil === 1 ? 'Завтра' : `Через ${birthday.daysUntil} дн.`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#e6ebf0] bg-[#f8fbfd] py-10 text-center text-sm text-[#8a94a3]">
              Нет дней рождений в ближайшие 7 дней
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart data={salesChartData} loading={financeLoading} />
        </div>
        <div className="xl:col-span-1">
          <CourseReachChart data={reachChartData} loading={leadConversionsLoading} limit={2} />
        </div>
      </div>
    </div>
  );
}
