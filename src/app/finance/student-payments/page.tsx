'use client';

import { Eye, Loader2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { AddStudentPaymentModal } from '@/components/features/finance/AddStudentPaymentModal';
import {
  STUDENT_PAYMENT_STATUS_COLORS,
  STUDENT_PAYMENT_STATUS_LABELS,
} from '@/constants/finance';
import {
  coursesService,
  studentPaymentsService,
  studentsService,
  subscriptionsService,
  type CreateStudentPaymentRequest,
  type StudentPaymentDto,
  type StudentPaymentHistoryResponse,
  type StudentPaymentMonthStatus,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';

type StudentPaymentsTab = 'OVERVIEW' | 'DEBTORS';

interface PaymentModalState {
  key: number;
  isOpen: boolean;
  studentId: string;
  studentName: string;
  lockStudent?: boolean;
  subscriptionId?: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 7);
}

function getStudentFullName(student: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ');
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₸`;
}

function getOverviewStatusMeta(status: StudentPaymentMonthStatus) {
  return {
    label: STUDENT_PAYMENT_STATUS_LABELS[status],
    color: STUDENT_PAYMENT_STATUS_COLORS[status],
  };
}

export default function StudentPaymentsPage() {
  const [activeTab, setActiveTab] = useState<StudentPaymentsTab>('OVERVIEW');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentPaymentMonthStatus | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [paymentModalState, setPaymentModalState] = useState<PaymentModalState>({
    key: 0,
    isOpen: false,
    studentId: '',
    studentName: '',
  });

  const { data: studentsPage } = useApi(() => studentsService.getAll({ page: 0, size: 1000 }), []);
  const { data: coursesPage } = useApi(() => coursesService.getAll({ page: 0, size: 1000 }), []);
  const { data: subscriptionsPage } = useApi(() => subscriptionsService.getAll({ page: 0, size: 1000 }), []);
  const {
    data: monthlyOverview,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi(() => studentPaymentsService.getMonthlyOverview({ month: selectedMonth }), [selectedMonth]);
  const {
    data: debtorsData,
    loading: debtorsLoading,
    error: debtorsError,
    refetch: refetchDebtors,
  } = useApi(() => studentPaymentsService.getDebtors(), []);

  const createPaymentMutation = useMutation((data: CreateStudentPaymentRequest) => studentPaymentsService.create(data));

  const studentMap = useMemo(
    () =>
      new Map(
        (studentsPage?.content ?? []).map((student) => [
          student.id,
          getStudentFullName(student) || student.email || student.phone || student.id,
        ])
      ),
    [studentsPage]
  );
  const courseMap = useMemo(
    () => new Map((coursesPage?.content ?? []).map((course) => [course.id, course.name])),
    [coursesPage]
  );

  const overviewRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (monthlyOverview?.students ?? []).filter((item) => {
      const studentName = studentMap.get(item.studentId) || item.studentId;
      if (query && !studentName.toLowerCase().includes(query)) {
        return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [monthlyOverview, search, statusFilter, studentMap]);

  const debtorRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (debtorsData ?? []).filter((item) => {
      const studentName = studentMap.get(item.studentId) || item.studentId;
      return !query || studentName.toLowerCase().includes(query);
    });
  }, [debtorsData, search, studentMap]);

  const paymentSubscriptionOptions = useMemo(
    () => {
      const options = new Map<
        string,
        {
          id: string;
          studentId: string;
          label: string;
        }
      >();

      (subscriptionsPage?.content ?? []).forEach((subscription) => {
        options.set(subscription.id, {
          id: subscription.id,
          studentId: subscription.studentId,
          label: `${courseMap.get(subscription.courseId || '') || 'Без курса'} · ${formatMoney(subscription.amount)} · ${subscription.status}`,
        });
      });

      return Array.from(options.values());
    },
    [courseMap, subscriptionsPage]
  );
  const studentOptions = useMemo(
    () =>
      (studentsPage?.content ?? []).map((student) => ({
        id: student.id,
        name: getStudentFullName(student) || student.email || student.phone || 'Без имени',
      })),
    [studentsPage]
  );

  const openAddPayment = (subscriptionId?: string) => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      studentId: '',
      studentName: '',
      lockStudent: false,
      subscriptionId,
    }));
  };

  const closeAddPayment = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
      subscriptionId: undefined,
    }));
  };

  const handleCreatePayment = async (data: CreateStudentPaymentRequest) => {
    await createPaymentMutation.mutate(data);
    closeAddPayment();
    await Promise.all([refetchOverview(), refetchDebtors()]);
  };

  const isTableLoading = activeTab === 'OVERVIEW' ? overviewLoading : debtorsLoading;
  const tableError = activeTab === 'OVERVIEW' ? overviewError : debtorsError;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => openAddPayment()}>
          Записать платёж
        </Button>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={[
            { id: 'OVERVIEW', label: 'Платежи студентов' },
            { id: 'DEBTORS', label: 'Должники' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as StudentPaymentsTab)}
          aria-label="Вкладки платежей студентов"
          className="w-fit"
        />
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по ученику"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="crm-input crm-input-with-icon"
            />
          </div>

          {activeTab === 'OVERVIEW' ? (
            <>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StudentPaymentMonthStatus | 'all')}
                className="crm-select"
              >
                <option value="all">Все статусы</option>
                {Object.entries(STUDENT_PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="crm-select"
              />

              
            </>
          ) : (
            <>
              
              
              <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3 text-sm text-[#556070]">
                Всего должников: <span className="font-semibold text-[#1f2530]">{debtorRows.length}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e6ebf0] px-6 py-4 md:flex-row md:items-center md:justify-between">
          {activeTab === 'OVERVIEW' ? (
            <>
              <p className="text-sm font-medium text-gray-700">
                Ученики за месяц: <span className="font-semibold text-gray-900">{monthlyOverview?.totalStudents ?? 0}</span>
              </p>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-700">
                <span>Оплачено: <span className="font-semibold text-emerald-700">{monthlyOverview?.paidCount ?? 0}</span></span>
                <span>Частично: <span className="font-semibold text-amber-700">{monthlyOverview?.partialCount ?? 0}</span></span>
                <span>Не оплачено: <span className="font-semibold text-rose-700">{monthlyOverview?.unpaidCount ?? 0}</span></span>
                <span>Собрано: <span className="font-semibold text-gray-900">{formatMoney(monthlyOverview?.totalCollected ?? 0)}</span></span>
                <span>Осталось: <span className="font-semibold text-rose-700">{formatMoney(monthlyOverview?.totalDebt ?? 0)}</span></span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                Должников: <span className="font-semibold text-gray-900">{debtorRows.length}</span>
              </p>
              <p className="text-sm font-medium text-gray-700">
                Общий долг: <span className="font-semibold text-rose-700">{formatMoney(debtorRows.reduce((sum, item) => sum + item.totalDebt, 0))}</span>
              </p>
            </>
          )}
        </div>

        {tableError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {tableError}
          </div>
        )}

        {isTableLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'OVERVIEW' ? (
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Ученик</th>
                    <th className="crm-table-th">Ожидалось</th>
                    <th className="crm-table-th">Оплачено</th>
                    <th className="crm-table-th">Осталось</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {overviewRows.length > 0 ? (
                    overviewRows.map((item, index) => {
                      const statusMeta = getOverviewStatusMeta(item.status);
                      const studentName = studentMap.get(item.studentId) || item.studentId;

                      return (
                        <tr key={`${item.studentId}-${item.subscriptionId}`} className="crm-table-row">
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">
                            <div>
                              <div className="text-sm font-semibold text-[#202938]">{studentName}</div>
                              <div className="mt-0.5 text-xs text-[#8690a0]">Абонемент: {item.subscriptionId}</div>
                            </div>
                          </td>
                          <td className="crm-table-cell">{formatMoney(item.expected)}</td>
                          <td className="crm-table-cell text-emerald-700">{formatMoney(item.paid)}</td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(item.debt)}</td>
                          <td className="crm-table-cell">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusMeta.color}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="crm-table-cell">
                            <Link
                              href={`/finance/student-payments/${item.studentId}`}
                              className="inline-flex rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                              title="Открыть историю"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Платежи по выбранным фильтрам не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Ученик</th>
                    <th className="crm-table-th">Общий долг</th>
                    <th className="crm-table-th">Месяцев долга</th>
                    <th className="crm-table-th">Ежемесячный платёж</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {debtorRows.length > 0 ? (
                    debtorRows.map((item, index) => {
                      const studentName = studentMap.get(item.studentId) || item.studentId;

                      return (
                        <tr key={`${item.studentId}-${item.subscriptionId}`} className="crm-table-row">
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">
                            <div>
                              <div className="text-sm font-semibold text-[#202938]">{studentName}</div>
                              <div className="mt-0.5 text-xs text-[#8690a0]">Абонемент: {item.subscriptionId}</div>
                            </div>
                          </td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(item.totalDebt)}</td>
                          <td className="crm-table-cell">{item.debtMonths}</td>
                          <td className="crm-table-cell">{formatMoney(item.monthlyExpected)}</td>
                          <td className="crm-table-cell">
                            <Link
                              href={`/finance/student-payments/${item.studentId}`}
                              className="inline-flex rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                              title="Открыть историю"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Должники не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <AddStudentPaymentModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={closeAddPayment}
        onSave={handleCreatePayment}
        students={studentOptions}
        defaultStudentId={paymentModalState.studentId}
        lockStudent={paymentModalState.lockStudent}
        subscriptions={paymentSubscriptionOptions}
        defaultSubscriptionId={paymentModalState.subscriptionId}
        isSubmitting={createPaymentMutation.loading}
      />
    </div>
  );
}
