'use client';
import { CancelSalaryPaymentButton } from '@/components/features/salary/CancelSalaryPaymentButton';
import { SalaryBalance } from '@/components/features/salary/SalaryBalance';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Edit2, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useBackNavigation } from '@/hooks/useUrlState';
import Link from 'next/link';
import { AmountChangeReasonModal } from '@/components/features/finance/AmountChangeReasonModal';
import { AddSalaryModal } from '@/components/features/salary/AddSalaryModal';
import { Button } from '@/components/ui/Button';
import {
  STAFF_ROLE_LABELS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_COLORS,
  STAFF_STATUS_LABELS,
} from '@/constants/employee';
import { TRANSACTION_STATUS_COLORS, TRANSACTION_STATUS_LABELS } from '@/constants/finance';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  salaryService,
  staffService,
  type AmountChangeReasonCode,
  type CreateSalaryPaymentRequest,
  type StaffSalaryHistoryDto,
} from '@/lib/api';

interface SalaryPaymentModalState {
  key: number;
  isOpen: boolean;
  editingPayment?: StaffSalaryHistoryDto['payments'][number];
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0 ₸';
  }
  return `${Number(value).toLocaleString('ru-RU')} ₸`;
}

function formatMonthLabel(month: string): string {
  if (!month) return '—';

  try {
    const parsed = new Date(`${month}-01T00:00:00`);
    if (isNaN(parsed.getTime())) return month;
    return parsed.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return month;
  }
}

function formatDate(value: string): string {
  if (!value) return '—';

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
    }
    return new Date(value).toLocaleDateString('ru-RU');
  } catch {
    return value;
  }
}

export default function StaffSalaryHistoryPage() {
  const router = useRouter();
  const goBack = useBackNavigation('/finance/salary');
  const params = useParams();
  const staffIdParam = params.staffId;
  const staffId = Array.isArray(staffIdParam) ? staffIdParam[0] : staffIdParam;

  const [paymentModalState, setPaymentModalState] = useState<SalaryPaymentModalState>({
    key: 0,
    isOpen: false,
    editingPayment: undefined,
  });
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    paymentId: string | null;
    payload: CreateSalaryPaymentRequest | null;
  }>({
    isOpen: false,
    paymentId: null,
    payload: null,
  });

  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApi<StaffSalaryHistoryDto | null>(
    () =>
      staffId
        ? salaryService.getStaffHistory(staffId)
        : Promise.resolve({ data: null }),
    [staffId]
  );

  const { data: staffData } = useApi(
    () =>
      staffId
        ? staffService.getById(staffId)
        : Promise.resolve({ data: null }),
    [staffId]
  );

  const createPaymentMutation = useMutation((payload: CreateSalaryPaymentRequest) => salaryService.createPayment(payload));
  const updatePaymentMutation = useMutation(
    ({ id, payload }: { id: string; payload: CreateSalaryPaymentRequest }) =>
      salaryService.updatePayment(id, payload)
  );

  const paymentStaffOptions = useMemo(
    () =>
      historyData
        ? [
            {
              id: historyData.staffId,
              name: historyData.fullName,
              outstandingAmount: historyData.totalOutstanding ?? 0,
              dueAmount: historyData.totalDue ?? 0,
              paidAmount: historyData.totalPaid ?? 0,
            },
          ]
        : [],
    [historyData]
  );

  const handleOpenPaymentModal = (payment?: StaffSalaryHistoryDto['payments'][number]) => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      editingPayment: payment,
    }));
  };

  const handleClosePaymentModal = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
      editingPayment: undefined,
    }));
  };

  const handleSavePayment = async (payload: CreateSalaryPaymentRequest) => {
    if (paymentModalState.editingPayment) {
      const initialAmount = Number(paymentModalState.editingPayment.amount);
      const nextAmount = Number(payload.amount);
      const isAmountChanged = Number.isFinite(nextAmount) && nextAmount !== initialAmount;

      if (isAmountChanged) {
        setReasonModalState({
          isOpen: true,
          paymentId: paymentModalState.editingPayment.transactionId,
          payload: {
            ...payload,
            amountChangeReasonCode: undefined,
            amountChangeReasonOther: undefined,
          },
        });
        handleClosePaymentModal();
        return;
      }

      await updatePaymentMutation.mutate({
        id: paymentModalState.editingPayment.transactionId,
        payload,
      });
    } else {
      await createPaymentMutation.mutate(payload);
    }

    handleClosePaymentModal();
    await refetchHistory();
  };

  const handleConfirmReason = async (reason: { reasonCode: AmountChangeReasonCode; reasonOther?: string }) => {
    if (!reasonModalState.paymentId || !reasonModalState.payload) {
      return;
    }

    await updatePaymentMutation.mutate({
      id: reasonModalState.paymentId,
      payload: {
        ...reasonModalState.payload,
        amountChangeReasonCode: reason.reasonCode,
        amountChangeReasonOther: reason.reasonCode === 'OTHER' ? reason.reasonOther : undefined,
      },
    });

    setReasonModalState({ isOpen: false, paymentId: null, payload: null });
    await refetchHistory();
  };

  if (!staffId) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
          Назад к зарплатам
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Не удалось определить ID сотрудника.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
        Назад к зарплатам
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1f2530]">
              История зарплаты:{' '}
              <Link prefetch={false}
                href={`/staff/${staffId}`}
                className="text-[#467aff] transition-colors hover:underline"
              >
                {historyData?.fullName || `Сотрудник ${staffId}`}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-[#7f8897]">{staffData?.position || 'Должность не указана'}</p>
          </div>
          <Button icon={Plus} onClick={handleOpenPaymentModal} disabled={!historyData}>
            Зафиксировать выплату
          </Button>
        </div>
      </div>

      {historyLoading ? (
        <div className="crm-surface flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : historyError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5 text-sm text-red-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Не удалось загрузить историю зарплаты</p>
              <p className="mt-0.5 text-xs text-red-600">{historyError}</p>
            </div>
          </div>
          <Button variant="secondary" icon={RefreshCw} onClick={() => void refetchHistory()} className="shrink-0 bg-white hover:bg-red-100 text-red-700 border-red-200">
            Повторить попытку
          </Button>
        </div>
      ) : !historyData ? (
        <div className="crm-surface p-8 text-center text-sm text-[#7f8794]">
          Данные по зарплате сотрудника не найдены.
        </div>
      ) : (
        <>
          <div className="crm-surface p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Сотрудник</p>
                <Link prefetch={false}
                  href={`/staff/${historyData.staffId}`}
                  className="mt-1 block text-sm font-semibold text-[#467aff] hover:underline"
                >
                  {historyData.fullName}
                </Link>
                <p className="mt-1 text-xs text-[#5f6b7b]">
                  {STAFF_ROLE_LABELS[historyData.role] || historyData.role || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Условия оплаты</p>
                <p className="mt-1 text-sm font-semibold text-[#1f2530]">
                  {STAFF_SALARY_TYPE_LABELS[historyData.salaryType] || historyData.salaryType || '—'}
                </p>
                <p className="mt-1 text-xs text-[#5f6b7b]">
                  {historyData.salaryType === 'FIXED'
                    ? formatMoney(historyData.fixedSalary)
                    : historyData.salaryPercentage !== null && historyData.salaryPercentage !== undefined
                      ? `${historyData.salaryPercentage}%`
                      : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Начислено</p>
                <p className="mt-1 text-sm font-semibold text-[#1f2530]">{formatMoney(historyData.totalDue)}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Выплачено</p>
                <p className="mt-1 text-sm font-semibold text-green-600">{formatMoney(historyData.totalPaid)}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Остаток</p>
                <p className="mt-1 text-sm font-semibold"><SalaryBalance amount={historyData.totalOutstanding} /></p>
              </div>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-[#4b5563]">Разбивка по месяцам</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Активные ученики</th>
                    <th className="crm-table-th">База</th>
                    <th className="crm-table-th">Начислено</th>
                    <th className="crm-table-th">Выплачено</th>
                    <th className="crm-table-th">Остаток</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {(historyData.months || []).length > 0 ? (
                    historyData.months.map((month) => (
                      <tr key={month.month} className="crm-table-row">
                        <td className="crm-table-cell">{formatMonthLabel(month.month)}</td>
                        <td className="crm-table-cell">{month.activeStudentCount ?? 0}</td>
                        <td className="crm-table-cell">{formatMoney(month.percentageBaseAmount)}</td>
                        <td className="crm-table-cell">{formatMoney(month.dueAmount)}</td>
                        <td className="crm-table-cell text-green-600">{formatMoney(month.paidAmount)}</td>
                        <td className="crm-table-cell"><SalaryBalance amount={month.outstandingAmount} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={6} className="crm-table-cell py-8 text-center text-sm text-[#8a93a3]">
                        История по месяцам пока пуста
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-[#4b5563]">Выплаты</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Дата</th>
                    <th className="crm-table-th">Сумма</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Заметка</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {(historyData.payments || []).length > 0 ? (
                    historyData.payments.map((payment) => (
                      <tr key={payment.transactionId} className="crm-table-row">
                        <td className="crm-table-cell">{formatMonthLabel(payment.salaryMonth)}</td>
                        <td className="crm-table-cell">{formatDate(payment.paymentDate)}</td>
                        <td className="crm-table-cell">{formatMoney(payment.amount)}</td>
                        <td className="crm-table-cell">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${TRANSACTION_STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                            {TRANSACTION_STATUS_LABELS[payment.status] || payment.status || '—'}
                          </span>
                        </td>
                        <td className="crm-table-cell">{payment.notes || '—'}</td>
                        <td className="crm-table-cell">
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(payment)}
                            disabled={payment.status === 'CANCELLED' || createPaymentMutation.loading || updatePaymentMutation.loading}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Редактировать выплату"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <CancelSalaryPaymentButton id={payment.transactionId} amount={payment.amount} status={payment.status} onCancelled={refetchHistory} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={6} className="crm-table-cell py-8 text-center text-sm text-[#8a93a3]">
                        Выплат пока нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <AddSalaryModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={handleClosePaymentModal}
        onSave={handleSavePayment}
        staffOptions={paymentStaffOptions}
        defaultStaffId={staffId}
        lockStaff
        defaultMonth={paymentModalState.editingPayment?.salaryMonth || getCurrentMonth()}
        initialValues={paymentModalState.editingPayment ? {
          staffId: paymentModalState.editingPayment.staffId,
          salaryMonth: paymentModalState.editingPayment.salaryMonth,
          amount: paymentModalState.editingPayment.amount,
          paymentDate: paymentModalState.editingPayment.paymentDate.slice(0, 10),
          notes: paymentModalState.editingPayment.notes || undefined,
        } : undefined}
        title={paymentModalState.editingPayment ? 'Редактировать выплату зарплаты' : 'Зафиксировать выплату зарплаты'}
        isSubmitting={createPaymentMutation.loading || updatePaymentMutation.loading}
      />

      <AmountChangeReasonModal
        isOpen={reasonModalState.isOpen}
        onClose={() => setReasonModalState({ isOpen: false, paymentId: null, payload: null })}
        onConfirm={handleConfirmReason}
        isSubmitting={updatePaymentMutation.loading}
      />
    </div>
  );
}
