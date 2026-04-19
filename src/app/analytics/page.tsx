'use client';

import Link from 'next/link';
import { Cake, DollarSign, Loader2, TrendingDown, Users } from 'lucide-react';
import { useMemo } from 'react';
import { ANALYTICS_REPORTS } from '@/constants/analytics';
import { useApi } from '@/hooks/useApi';
import { analyticsService } from '@/lib/api';

function formatMoney(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AnalyticsIndexPage() {
  const { data: todayStats, loading: todayLoading } = useApi(
    () => analyticsService.getToday(),
    []
  );

  const debtors = useMemo(() => todayStats?.debtors ?? [], [todayStats]);
  const upcomingBirthdays = useMemo(() => todayStats?.upcomingBirthdays ?? [], [todayStats]);

  return (
    <div className="space-y-6">
      {/* Today Analytics Summary */}
      <div className="crm-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-[#1f2530]">Сегодня</h2>

        {todayLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : todayStats ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Доход</span>
              </div>
              <div className="text-lg font-bold text-emerald-700">
                {formatMoney(todayStats.todayRevenue)}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                <span>Расходы</span>
              </div>
              <div className="text-lg font-bold text-rose-700">
                {formatMoney(todayStats.todayExpenses)}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Подписки</span>
              </div>
              <div className="text-lg font-bold text-[#1f2530]">
                {todayStats.newSubscriptions}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Уроки</span>
              </div>
              <div className="text-lg font-bold text-[#1f2530]">
                {todayStats.conductedLessons}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <Users className="h-4 w-4 text-cyan-600" />
                <span>Студенты</span>
              </div>
              <div className="text-lg font-bold text-[#1f2530]">
                {todayStats.attendedStudents}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <Users className="h-4 w-4 text-amber-600" />
                <span>Записи</span>
              </div>
              <div className="text-lg font-bold text-[#1f2530]">
                {todayStats.newEnrollments}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f6b7b]">
                <DollarSign className="h-4 w-4 text-rose-600" />
                <span>Долг</span>
              </div>
              <div className="text-lg font-bold text-rose-700">
                {formatMoney(todayStats.totalDebt)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Debtors & Birthdays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Debtors */}
        <div className="crm-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1f2530]">Должники</h3>
            {debtors.length > 0 && (
              <span className="rounded-lg border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                {debtors.length}
              </span>
            )}
          </div>

          {todayLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#467aff]" />
            </div>
          ) : debtors.length > 0 ? (
            <div className="space-y-2">
              {debtors.map((debtor) => (
                <Link
                  key={debtor.studentId}
                  href={`/students/${debtor.studentId}`}
                  className="flex items-center justify-between rounded-xl border border-[#dbe2e8] bg-white p-3 transition-colors hover:bg-[#f8fbfd]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                      <DollarSign className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1f2530]">{debtor.fullName}</div>
                      <div className="text-xs text-[#7d8795]">ID: {debtor.studentId.slice(0, 8)}...</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-700">
                      {formatMoney(debtor.balance)} ₸
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] py-8 text-center text-sm text-[#8a94a3]">
              Нет должников
            </div>
          )}
        </div>

        {/* Upcoming Birthdays */}
        <div className="crm-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1f2530]">Дни рождения</h3>
            {upcomingBirthdays.length > 0 && (
              <span className="rounded-lg border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                {upcomingBirthdays.length}
              </span>
            )}
          </div>

          {todayLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#467aff]" />
            </div>
          ) : upcomingBirthdays.length > 0 ? (
            <div className="space-y-2">
              {upcomingBirthdays.map((birthday) => (
                <Link
                  key={birthday.studentId}
                  href={`/students/${birthday.studentId}`}
                  className="flex items-center justify-between rounded-xl border border-[#dbe2e8] bg-white p-3 transition-colors hover:bg-[#f8fbfd]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Cake className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1f2530]">{birthday.fullName}</div>
                      <div className="text-xs text-[#7d8795]">
                        {formatDate(birthday.birthDate)} • Исполняется {birthday.turnsAge} лет
                      </div>
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
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] py-8 text-center text-sm text-[#8a94a3]">
              Нет upcoming дней рождений
            </div>
          )}
        </div>
      </div>

      {/* Analytics Reports Grid */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[#1f2530]">Отчеты аналитики</h2>
        <p className="mb-4 text-sm text-[#6e7787]">
          Выберите нужный отчет аналитики из списка ниже или через меню в сайдбаре.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ANALYTICS_REPORTS.map((report) => (
            <Link
              key={report.slug}
              href={`/analytics/${report.slug}`}
              className="crm-surface block rounded-2xl border border-[#e2e8ee] p-5 transition-colors hover:bg-[#f7fbfb]"
            >
              <p className="text-base font-semibold text-[#202938]">{report.label}</p>
              <p className="mt-2 text-sm text-[#7f8794]">{report.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
