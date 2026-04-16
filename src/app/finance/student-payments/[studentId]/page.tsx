'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { AddStudentPaymentModal } from '@/components/features/finance/AddStudentPaymentModal';
import {
  PAYMENT_AMOUNT_CHANGE_REASON_LABELS,
  PAYMENT_METHOD_LABELS,
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
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';

interface PaymentModalState {
  key: number;
  isOpen: boolean;
  subscriptionId?: string;
  editingPayment?: PaymentRow;
}

interface PaymentRow {
  id: string;
  studentId: string;
  paidAt: string;
  paymentMonth: string;
  amount: number;
  method: StudentPaymentDto['method'];
  amountChangeReasonCode: StudentPaymentDto['amountChangeReasonCode'];
  amountChangeReasonOther: StudentPaymentDto['amountChangeReasonOther'];
  notes: string | null;
  subscriptionId: string;
  courseName: string;
}

type PaymentHistoryTab = 'SUBSCRIPTIONS' | 'PAYMENTS' | 'MONTHLY';

type SubscriptionStatusValue = StudentPaymentHistoryResponse['subscriptions'][number]['subscriptionStatus'];

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatusValue, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истек',
  CANCELLED: 'Отменен',
  FROZEN: 'Заморожен',
};

const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatusValue, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  EXPIRED: 'border-slate-200 bg-slate-100 text-slate-700',
  CANCELLED: 'border-rose-200 bg-rose-100 text-rose-700',
  FROZEN: 'border-sky-200 bg-sky-100 text-sky-700',
};

const PAYMENT_HISTORY_TABS: Array<{ id: PaymentHistoryTab; label: string }> = [
  { id: 'SUBSCRIPTIONS', label: 'Абонементы' },
  { id: 'PAYMENTS', label: 'Платежи' },
  { id: 'MONTHLY', label: 'Помесячно' },
];

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

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('ru-RU');
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  if (!year || !month) {
    return value;
  }

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

export default function StudentPaymentHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const studentIdParam = params.studentId;
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam;

  const [paymentModalState, setPaymentModalState] = useState<PaymentModalState>({
    key: 0,
    isOpen: false,
  });
  const [activeTab, setActiveTab] = useState<PaymentHistoryTab>('SUBSCRIPTIONS');

  const {
    data: studentData,
    loading: studentLoading,
    error: studentError,
  } = useApi(
    () =>
      studentId
        ? studentsService.getById(studentId)
        : Promise.resolve({ data: null as Awaited<ReturnType<typeof studentsService.getById>>['data'] | null }),
    [studentId]
  );

  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApi(
    () =>
      studentId
        ? studentPaymentsService.getByStudent(studentId)
        : Promise.resolve({ data: null as StudentPaymentHistoryResponse | null }),
    [studentId]
  );

  const { data: coursesPage } = useApi(() => coursesService.getAll({ page: 0, size: 1000 }), []);
  const { data: subscriptionsPage } = useApi(
    () =>
      studentId
        ? subscriptionsService.getByStudent(studentId, { page: 0, size: 1000 })
        : Promise.resolve({
          data: {
            content: [],
            page: 0,
            size: 0,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            hasNext: false,
            hasPrevious: false,
          },
        }),
    [studentId]
  );

  const createPaymentMutation = useMutation((data: CreateStudentPaymentRequest) => studentPaymentsService.create(data));
  const updatePaymentMutation = useMutation(({ id, data }: { id: string; data: CreateStudentPaymentRequest }) =>
    studentPaymentsService.update(id, data)
  );
  const deletePaymentMutation = useMutation((id: string) => studentPaymentsService.delete(id));

  const studentName = useMemo(() => {
    if (!studentData) {
      return studentId || '—';
    }

    return getStudentFullName(studentData) || studentData.email || studentData.phone || studentData.id;
  }, [studentData, studentId]);

  const courseMap = useMemo(
    () => new Map((coursesPage?.content ?? []).map((course) => [course.id, course.name])),
    [coursesPage]
  );

  const paymentSubscriptionOptions = useMemo(() => {
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

    if (historyData) {
      historyData.subscriptions.forEach((subscription) => {
        options.set(subscription.subscriptionId, {
          id: subscription.subscriptionId,
          studentId: historyData.studentId,
          label: `${courseMap.get(subscription.courseId || '') || 'Без курса'} · ${formatMoney(subscription.totalAmount)} · ${subscription.subscriptionStatus}`,
        });
      });
    }

    return Array.from(options.values());
  }, [courseMap, historyData, subscriptionsPage]);

  const studentOptions = useMemo(
    () =>
      studentId
        ? [{ id: studentId, name: studentName }]
        : [],
    [studentId, studentName]
  );

  const subscriptionRows = useMemo(() => {
    if (!historyData) {
      return [];
    }

    return historyData.subscriptions.map((subscription) => ({
      subscriptionId: subscription.subscriptionId,
      courseName: courseMap.get(subscription.courseId || '') || subscription.courseId || 'Без курса',
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      totalAmount: subscription.totalAmount,
      totalPaid: subscription.totalPaid,
      totalDebt: subscription.totalDebt,
      status: subscription.subscriptionStatus,
      monthlyExpected: subscription.monthlyExpected,
    }));
  }, [courseMap, historyData]);

  const paymentRows = useMemo<PaymentRow[]>(() => {
    if (!historyData) {
      return [];
    }

    const rows: PaymentRow[] = [];

    historyData.subscriptions.forEach((subscription) => {
      const courseName = courseMap.get(subscription.courseId || '') || subscription.courseId || 'Без курса';

      subscription.months.forEach((month) => {
        month.payments.forEach((payment) => {
          rows.push({
            id: payment.id,
            studentId: payment.studentId,
            paidAt: payment.paidAt,
            paymentMonth: payment.paymentMonth,
            amount: payment.amount,
            method: payment.method,
            amountChangeReasonCode: payment.amountChangeReasonCode,
            amountChangeReasonOther: payment.amountChangeReasonOther,
            notes: payment.notes,
            subscriptionId: payment.subscriptionId,
            courseName,
          });
        });
      });
    });

    return rows.sort((left, right) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime());
  }, [courseMap, historyData]);

  const monthlyRows = useMemo(() => {
    if (!historyData) {
      return [];
    }

    const rows: Array<{
      key: string;
      courseName: string;
      month: string;
      expected: number;
      paid: number;
      debt: number;
      status: StudentPaymentHistoryResponse['subscriptions'][number]['months'][number]['status'];
    }> = [];

    historyData.subscriptions.forEach((subscription) => {
      const courseName = courseMap.get(subscription.courseId || '') || subscription.courseId || 'Без курса';

      subscription.months.forEach((month) => {
        rows.push({
          key: `${subscription.subscriptionId}-${month.month}`,
          courseName,
          month: month.month,
          expected: month.expected,
          paid: month.paid,
          debt: month.debt,
          status: month.status,
        });
      });
    });

    return rows.sort((left, right) => right.month.localeCompare(left.month));
  }, [courseMap, historyData]);

  const openAddPayment = (subscriptionId?: string) => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      subscriptionId,
      editingPayment: undefined,
    }));
  };

  const openEditPayment = (payment: PaymentRow) => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      subscriptionId: payment.subscriptionId,
      editingPayment: payment,
    }));
  };

  const closeAddPayment = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
      subscriptionId: undefined,
      editingPayment: undefined,
    }));
  };

  const handleCreatePayment = async (data: CreateStudentPaymentRequest) => {
    if (paymentModalState.editingPayment) {
      await updatePaymentMutation.mutate({
        id: paymentModalState.editingPayment.id,
        data,
      });
    } else {
      await createPaymentMutation.mutate(data);
    }

    closeAddPayment();
    await refetchHistory();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Удалить этот платёж?')) {
      return;
    }

    await deletePaymentMutation.mutate(paymentId);
    await refetchHistory();
  };

  if (!studentId) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/finance/student-payments')}>
          Назад к платежам студентов
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Не удалось определить ID ученика.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/finance/student-payments')}>
        Назад к платежам студентов
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1f2530]">История платежей: {studentName}</h2>
            <p className="mt-1 text-sm text-[#7f8897]">
              {studentData?.email || studentData?.phone || `ID: ${studentId}`}
            </p>
          </div>
          <Button icon={Plus} onClick={() => openAddPayment()} disabled={paymentSubscriptionOptions.length === 0}>
            Записать платёж
          </Button>
        </div>
      </div>

      {studentLoading || historyLoading ? (
        <div className="crm-surface">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        </div>
      ) : studentError || historyError ? (
        <div className="crm-surface">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {studentError || historyError}
          </div>
        </div>
      ) : !historyData ? (
        <div className="crm-surface">
          <div className="rounded-xl border border-[#e6ebf0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#8a93a3]">
            История платежей не найдена
          </div>
        </div>
      ) : (
        <>
          <div className="crm-surface p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Абонементов</p>
                <p className="mt-1 text-lg font-bold text-[#1f2530]">{subscriptionRows.length}</p>
              </div>
              <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Оплачено всего</p>
                <p className="mt-1 text-lg font-bold text-[#1f2530]">{formatMoney(historyData.totalPaid)}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-rose-500">Осталось оплатить</p>
                <p className="mt-1 text-lg font-bold text-rose-700">{formatMoney(historyData.totalDebt)}</p>
              </div>
              <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Платежей</p>
                <p className="mt-1 text-lg font-bold text-[#1f2530]">{paymentRows.length}</p>
              </div>
            </div>
          </div>

          <div className="crm-surface p-4">
            <Tabs
              tabs={PAYMENT_HISTORY_TABS}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as PaymentHistoryTab)}
              aria-label="Вкладки истории платежей"
              className="w-fit"
            />
          </div>

          {activeTab === 'SUBSCRIPTIONS' ? (
            <div className="crm-table-wrap overflow-hidden">
              <div className="border-b border-[#e6ebf0] px-6 py-4">
                <p className="text-sm font-medium text-[#4b5563]">Абонементы студента</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="crm-table-head">
                    <tr>
                      <th className="crm-table-th">#</th>
                      <th className="crm-table-th">Курс</th>
                      <th className="crm-table-th">Период</th>
                      <th className="crm-table-th">Ежемесячно</th>
                      <th className="crm-table-th">Оплачено</th>
                      <th className="crm-table-th">Долг</th>
                      <th className="crm-table-th">Статус</th>
                      <th className="crm-table-th">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="crm-table-body">
                    {subscriptionRows.length > 0 ? (
                      subscriptionRows.map((row, index) => (
                        <tr key={row.subscriptionId} className="crm-table-row">
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">
                            <div className="text-sm font-semibold text-[#202938]">{row.courseName}</div>
                            <div className="mt-0.5 text-xs text-[#8690a0]">Абонемент: {row.subscriptionId}</div>
                          </td>
                          <td className="crm-table-cell">{formatDate(row.startDate)} - {formatDate(row.endDate)}</td>
                          <td className="crm-table-cell">{formatMoney(row.monthlyExpected)}</td>
                          <td className="crm-table-cell text-emerald-700">{formatMoney(row.totalPaid)}</td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(row.totalDebt)}</td>
                          <td className="crm-table-cell">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[row.status]}`}>
                              {SUBSCRIPTION_STATUS_LABELS[row.status]}
                            </span>
                          </td>
                          <td className="crm-table-cell">
                            <Button size="sm" icon={Plus} onClick={() => openAddPayment(row.subscriptionId)}>
                              Платёж
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="crm-table-row">
                        <td colSpan={8} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                          У студента нет данных по абонементам
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'PAYMENTS' ? (
            <div className="crm-table-wrap overflow-hidden">
              <div className="border-b border-[#e6ebf0] px-6 py-4">
                <p className="text-sm font-medium text-[#4b5563]">Все платежи</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="crm-table-head">
                    <tr>
                      <th className="crm-table-th">#</th>
                      <th className="crm-table-th">Дата</th>
                      <th className="crm-table-th">Месяц</th>
                      <th className="crm-table-th">Курс</th>
                      <th className="crm-table-th">Сумма</th>
                      <th className="crm-table-th">Метод</th>
                      <th className="crm-table-th">Причина изменения суммы</th>
                      <th className="crm-table-th">Комментарий</th>
                      <th className="crm-table-th">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="crm-table-body">
                    {paymentRows.length > 0 ? (
                      paymentRows.map((payment, index) => (
                        <tr key={payment.id} className="crm-table-row">
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">{formatDate(payment.paidAt)}</td>
                          <td className="crm-table-cell">{payment.paymentMonth || '—'}</td>
                          <td className="crm-table-cell">
                            <div className="text-sm font-semibold text-[#202938]">{payment.courseName}</div>
                            <div className="mt-0.5 text-xs text-[#8690a0]">{payment.subscriptionId}</div>
                          </td>
                          <td className="crm-table-cell">{formatMoney(payment.amount)}</td>
                          <td className="crm-table-cell">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                          <td className="crm-table-cell">
                            {payment.amountChangeReasonCode
                              ? `${PAYMENT_AMOUNT_CHANGE_REASON_LABELS[payment.amountChangeReasonCode]}${
                                  payment.amountChangeReasonCode === 'OTHER' && payment.amountChangeReasonOther
                                    ? `: ${payment.amountChangeReasonOther}`
                                    : ''
                                }`
                              : '—'}
                          </td>
                          <td className="crm-table-cell">{payment.notes || '—'}</td>
                          <td className="crm-table-cell">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditPayment(payment)}
                                disabled={updatePaymentMutation.loading || deletePaymentMutation.loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
                                title="Редактировать платёж"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeletePayment(payment.id)}
                                disabled={deletePaymentMutation.loading || updatePaymentMutation.loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#c34c4c] transition-colors hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-50"
                                title="Удалить платёж"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="crm-table-row">
                        <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                          Платежей пока нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'MONTHLY' ? (
            <div className="crm-table-wrap overflow-hidden">
              <div className="border-b border-[#e6ebf0] px-6 py-4">
                <p className="text-sm font-medium text-[#4b5563]">Помесячная детализация</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="crm-table-head">
                    <tr>
                      <th className="crm-table-th">Курс</th>
                      <th className="crm-table-th">Месяц</th>
                      <th className="crm-table-th">Ожидалось</th>
                      <th className="crm-table-th">Оплачено</th>
                      <th className="crm-table-th">Осталось</th>
                      <th className="crm-table-th">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="crm-table-body">
                    {monthlyRows.length > 0 ? (
                      monthlyRows.map((row) => (
                        <tr key={row.key} className="crm-table-row">
                          <td className="crm-table-cell">{row.courseName}</td>
                          <td className="crm-table-cell">{formatMonth(row.month)}</td>
                          <td className="crm-table-cell">{formatMoney(row.expected)}</td>
                          <td className="crm-table-cell text-emerald-700">{formatMoney(row.paid)}</td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(row.debt)}</td>
                          <td className="crm-table-cell">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_PAYMENT_STATUS_COLORS[row.status]}`}>
                              {STUDENT_PAYMENT_STATUS_LABELS[row.status]}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="crm-table-row">
                        <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                          Помесячная разбивка отсутствует
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}

      <AddStudentPaymentModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={closeAddPayment}
        onSave={handleCreatePayment}
        students={studentOptions}
        defaultStudentId={studentId}
        lockStudent
        subscriptions={paymentSubscriptionOptions}
        defaultSubscriptionId={paymentModalState.subscriptionId}
        initialValues={paymentModalState.editingPayment ? {
          studentId: paymentModalState.editingPayment.studentId,
          subscriptionId: paymentModalState.editingPayment.subscriptionId,
          amount: paymentModalState.editingPayment.amount,
          paidAt: paymentModalState.editingPayment.paidAt,
          paymentMonth: paymentModalState.editingPayment.paymentMonth,
          method: paymentModalState.editingPayment.method,
          amountChangeReasonCode: paymentModalState.editingPayment.amountChangeReasonCode || undefined,
          amountChangeReasonOther: paymentModalState.editingPayment.amountChangeReasonOther || undefined,
          notes: paymentModalState.editingPayment.notes || undefined,
        } : undefined}
        title={paymentModalState.editingPayment ? 'Редактировать платёж студента' : 'Записать платёж студента'}
        requireReason={Boolean(paymentModalState.editingPayment)}
        isSubmitting={createPaymentMutation.loading || updatePaymentMutation.loading}
      />
    </div>
  );
}
