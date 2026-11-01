'use client';

import { useMemo, useState } from 'react';
import { ReceiptText, ShoppingCart, Users, Package, ChevronRight, Cake } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import SalesChart from '@/components/SalesChart';
import OrdersChart from '@/components/OrdersChart';
import CourseReachChart from '@/components/CourseReachChart';
import { analyticsService, staffService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { BirthdaysModal } from '@/components/features/students/BirthdaysModal';

const SUBSCRIPTION_STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Активные', color: '#467aff' },
  EXPIRED: { label: 'Истекли', color: '#f59e0b' },
  CANCELLED: { label: 'Отменены', color: '#ef4444' },
  FROZEN: { label: 'Заморожены', color: '#8b5cf6' },
};

export default function Dashboard() {
  const roles = useAuthStore((state) => state.roles);
  const isManager = roles.includes('MANAGER') && !roles.some((role) => role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN');

  const [isBirthdaysModalOpen, setIsBirthdaysModalOpen] = useState(false);

  const { from, to } = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fromStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const toStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return {
      from: fromStr,
      to: toStr,
    };
  }, []);

  const { data: dashboard, loading } = useApi(() => analyticsService.getDashboard({ from, to }), [from, to]);
  const { data: today } = useApi(() => analyticsService.getToday(), []);
  const { data: staffPage } = useApi(() => staffService.getAll({ page: 0, size: 1000 }), []);
  const { data: financeReport, loading: financeLoading } = useApi(
    () => isManager ? Promise.resolve({ data: null }) : analyticsService.getFinanceReport({ from, to }),
    [from, to, isManager]
  );
  const { data: subscriptionsReport, loading: subscriptionsLoading } = useApi(
    () => isManager ? Promise.resolve({ data: null }) : analyticsService.getSubscriptions({ from, to }),
    [from, to, isManager]
  );
  const { data: leadConversions, loading: leadConversionsLoading } = useApi(
    () => isManager ? Promise.resolve({ data: null }) : analyticsService.getLeadConversions({ from, to }),
    [from, to, isManager]
  );

  const salesChartData = useMemo(
    () =>
      (financeReport?.months ?? []).map((item) => ({
        month: item.month,
        revenue: item.revenue,
        expenses: item.expenses,
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
  const upcomingBirthdays = useMemo(() => {
    const studentBirthdays = (today?.upcomingBirthdays ?? []).map((item) => ({
      ...item,
      kind: 'student' as const,
      personId: item.studentId,
    }));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const staffBirthdays = (staffPage?.content ?? []).flatMap((staff) => {
      if (!staff.birthdate) return [];
      const source = new Date(`${staff.birthdate}T00:00:00`);
      let next = new Date(start.getFullYear(), source.getMonth(), source.getDate());
      if (next < start) next = new Date(start.getFullYear() + 1, source.getMonth(), source.getDate());
      const daysUntil = Math.round((next.getTime() - start.getTime()) / 86400000);
      if (daysUntil > 30) return [];
      return [{
        kind: 'staff' as const,
        personId: staff.id,
        studentId: staff.id,
        fullName: [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ') || staff.fullName,
        birthDate: staff.birthdate,
        turnsAge: next.getFullYear() - source.getFullYear(),
        daysUntil,
      }];
    });
    return [...studentBirthdays, ...staffBirthdays].sort((a, b) => a.daysUntil - b.daysUntil);
  }, [staffPage, today]);

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${isManager ? 'xl:col-span-3' : 'xl:col-span-2'}`}>
          {!isManager && (
            <>
              <Link href="/finance" className="block transition-transform hover:scale-[1.01]">
                <MetricCard
                  title="Выручка"
                  value={loading ? '...' : `${(dashboard?.totalRevenue ?? 0).toLocaleString('ru-RU')} ₸`}
                  change={`${dashboard?.revenueDeltaPct ?? 0}%`}
                  isPositive={(dashboard?.revenueDeltaPct ?? 0) >= 0}
                  icon={ReceiptText}
                  iconBgColor="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
              </Link>
              <Link href="/analytics/subscriptions" className="block transition-transform hover:scale-[1.01]">
                <MetricCard
                  title="Средний чек"
                  value={loading ? '...' : `${(dashboard?.averageCheck ?? 0).toLocaleString('ru-RU')} ₸`}
                  change={`${dashboard?.subscriptionsDeltaPct ?? 0}%`}
                  isPositive={(dashboard?.subscriptionsDeltaPct ?? 0) >= 0}
                  icon={ShoppingCart}
                  iconBgColor="bg-blue-50"
                  iconColor="text-blue-600"
                />
              </Link>
            </>
          )}
          <Link href="/students" className="block transition-transform hover:scale-[1.01]">
            <MetricCard
              title="Всего учеников"
              value={loading ? '...' : String(dashboard?.studentsAtEnd ?? 0)}
              change={`${dashboard?.studentsDeltaPct ?? 0}%`}
              isPositive={(dashboard?.studentsDeltaPct ?? 0) >= 0}
              icon={Users}
              iconBgColor="bg-purple-50"
              iconColor="text-purple-600"
            />
          </Link>
          <Link href="/classes" className="block transition-transform hover:scale-[1.01]">
            <MetricCard
              title="Активные ученики (группы)"
              value={loading ? '...' : String(dashboard?.activeGroupStudents ?? 0)}
              change={`${dashboard?.leadsDeltaPct ?? 0}%`}
              isPositive={(dashboard?.leadsDeltaPct ?? 0) >= 0}
              icon={Package}
              iconBgColor="bg-pink-50"
              iconColor="text-pink-600"
            />
          </Link>
        </div>

        {!isManager && (
          <div className="xl:col-span-1">
            <OrdersChart
              data={subscriptionChartData}
              total={subscriptionsReport?.totalCount ?? 0}
              loading={subscriptionsLoading}
            />
          </div>
        )}
      </div>

      {today && (
        <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${isManager ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          <Link href="/attendance" className="crm-surface p-4 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd] block">
            <p className="text-sm text-gray-500">Уроков сегодня</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.conductedLessons ?? 0}</p>
          </Link>
          <Link href="/attendance" className="crm-surface p-4 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd] block">
            <p className="text-sm text-gray-500">Присутствовало</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.attendedStudents ?? 0}</p>
          </Link>
          <Link href="/students" className="crm-surface p-4 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd] block">
            <p className="text-sm text-gray-500">Новые записи</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.newEnrollments ?? 0}</p>
          </Link>
          {!isManager && (
            <Link href="/finance/cashier" className="crm-surface p-4 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd] block">
              <p className="text-sm text-gray-500">Доход сегодня</p>
              <p className="text-2xl font-bold text-[#1f2530]">{(today.todayRevenue ?? 0).toLocaleString('ru-RU')} ₸</p>
            </Link>
          )}
        </div>
      )}

      {/* Debtors & Birthdays */}
      <div className={`grid grid-cols-1 gap-5 ${isManager ? '' : 'xl:grid-cols-2'}`}>
        {/* Debtors */}
        {!isManager && (
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
        )}

        {/* Upcoming Birthdays */}
        <div className="crm-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-base font-bold text-[#1f2530]">Дни рождения</h3>
                <p className="mt-0.5 text-[11px] text-[#8491a0]">Ближайшие 30 дней</p>
              </div>
              {upcomingBirthdays.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#467aff]" title="Количество именинников за ближайшие 30 дней">
                  {upcomingBirthdays.length}
                </span>
              )}
            </div>
            {upcomingBirthdays.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBirthdaysModalOpen(true)}
                className="text-xs font-medium text-[#467aff] transition-colors hover:underline cursor-pointer"
              >
                Смотреть больше
              </button>
            )}
          </div>

          {upcomingBirthdays.length > 0 ? (
            <div className="space-y-2">
              {upcomingBirthdays.slice(0, 3).map((birthday) => (
                <Link
                  key={`${birthday.kind}-${birthday.personId}`}
                  href={birthday.kind === 'staff' ? `/staff/${birthday.personId}` : `/students/${birthday.personId}`}
                  className="group flex items-center justify-between rounded-lg border border-[#e6ebf0] bg-white p-3 transition-colors hover:border-[#467aff] hover:bg-[#f8fbfd]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        birthday.daysUntil === 0
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400/30'
                          : birthday.daysUntil === 1
                          ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400/30'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {birthday.daysUntil === 0 ? (
                        <Cake className="h-4 w-4" />
                      ) : (
                        birthday.fullName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#1f2530] group-hover:text-[#467aff] transition-colors">
                        {birthday.fullName}
                      </div>
                      <div className="truncate text-xs text-[#7d8795]">
                        {birthday.kind === 'staff' ? 'Сотрудник • ' : 'Ученик • '}
                        {formatDate(birthday.birthDate)} • Исполняется {birthday.turnsAge} лет
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        birthday.daysUntil === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : birthday.daysUntil === 1
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {birthday.daysUntil === 0 ? 'Сегодня' : birthday.daysUntil === 1 ? 'Завтра' : `Через ${birthday.daysUntil} дн.`}
                    </span>
                  </div>
                </Link>
              ))}

              {upcomingBirthdays.length > 3 && (
                <button
                  type="button"
                  onClick={() => setIsBirthdaysModalOpen(true)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#e6ebf0] bg-[#f8fbfd] py-2 text-xs font-semibold text-[#467aff] transition-colors hover:bg-[#f0f5fa]"
                >
                  <span>Показать всех именинников ({upcomingBirthdays.length})</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-[#e6ebf0] bg-[#f8fbfd] py-10 text-center text-sm text-[#8a94a3]">
              Нет дней рождений в ближайшие дни
            </div>
          )}
        </div>
      </div>

      {!isManager && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SalesChart data={salesChartData} loading={financeLoading} />
          </div>
          <div className="xl:col-span-1">
            <CourseReachChart data={reachChartData} loading={leadConversionsLoading} limit={2} />
          </div>
        </div>
      )}

      {/* Full Birthdays Modal */}
      <BirthdaysModal
        isOpen={isBirthdaysModalOpen}
        onClose={() => setIsBirthdaysModalOpen(false)}
        birthdays={upcomingBirthdays}
      />
    </div>
  );
}
