import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  PAYMENT_METHOD_LABELS,
  STUDENT_PAYMENT_STATUS_COLORS,
  STUDENT_PAYMENT_STATUS_LABELS,
} from '@/constants/finance';
import type { StudentPaymentDto, StudentPaymentHistoryResponse } from '@/lib/api';

interface StudentPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  history: StudentPaymentHistoryResponse | null;
  loading: boolean;
  error: string | null;
  onAddPayment: (subscriptionId: string) => void;
  onDeletePayment: (payment: StudentPaymentDto) => void;
  getCourseName: (courseId: string) => string;
  isMutating?: boolean;
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

export const StudentPaymentHistoryModal = ({
  isOpen,
  onClose,
  studentName,
  history,
  loading,
  error,
  onAddPayment,
  onDeletePayment,
  getCourseName,
  isMutating = false,
}: StudentPaymentHistoryModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`История платежей: ${studentName}`}
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : !history ? (
        <div className="rounded-xl border border-[#e6ebf0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#8a93a3]">
          История платежей не найдена
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Оплачено всего</p>
              <p className="mt-1 text-lg font-bold text-[#1f2530]">{formatMoney(history.totalPaid)}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-rose-500">Осталось оплатить</p>
              <p className="mt-1 text-lg font-bold text-rose-700">{formatMoney(history.totalDebt)}</p>
            </div>
          </div>

          {history.subscriptions.length > 0 ? (
            history.subscriptions.map((subscription) => (
              <div key={subscription.subscriptionId} className="rounded-2xl border border-[#e6ebf0] bg-white">
                <div className="flex flex-col gap-4 border-b border-[#e6ebf0] px-5 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-[#1f2530]">
                      {getCourseName(subscription.courseId)}
                    </h3>
                    <p className="text-sm text-[#7f8897]">
                      Абонемент: {subscription.subscriptionId}
                    </p>
                    <p className="text-sm text-[#7f8897]">
                      Период: {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                    </p>
                  </div>
                  <Button
                    icon={Plus}
                    size="sm"
                    onClick={() => onAddPayment(subscription.subscriptionId)}
                  >
                    Записать платёж
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 border-b border-[#eef2f5] px-5 py-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Общая сумма</p>
                    <p className="mt-1 text-sm font-semibold text-[#1f2530]">{formatMoney(subscription.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Ежемесячно</p>
                    <p className="mt-1 text-sm font-semibold text-[#1f2530]">{formatMoney(subscription.monthlyExpected)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Оплачено</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(subscription.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Долг</p>
                    <p className="mt-1 text-sm font-semibold text-rose-700">{formatMoney(subscription.totalDebt)}</p>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  {subscription.months.length > 0 ? (
                    subscription.months.map((month) => (
                      <div key={`${subscription.subscriptionId}-${month.month}`} className="rounded-2xl border border-[#eef2f5] bg-[#fbfcfd] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#1f2530]">{formatMonth(month.month)}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#556070]">
                              <span>Ожидалось: {formatMoney(month.expected)}</span>
                              <span>Оплачено: {formatMoney(month.paid)}</span>
                              <span>Осталось: {formatMoney(month.debt)}</span>
                            </div>
                          </div>
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_PAYMENT_STATUS_COLORS[month.status]}`}>
                            {STUDENT_PAYMENT_STATUS_LABELS[month.status]}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {month.payments.length > 0 ? (
                            month.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex flex-col gap-3 rounded-xl border border-[#e6ebf0] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-[#1f2530]">{formatMoney(payment.amount)}</p>
                                  <div className="flex flex-wrap gap-3 text-xs text-[#7f8897]">
                                    <span>{formatDate(payment.paidAt)}</span>
                                    <span>{PAYMENT_METHOD_LABELS[payment.method]}</span>
                                    <span>Месяц: {payment.paymentMonth}</span>
                                  </div>
                                  {payment.notes ? (
                                    <p className="text-sm text-[#556070]">{payment.notes}</p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onDeletePayment(payment)}
                                  disabled={isMutating}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#c34c4c] transition-colors hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Удалить платёж"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#8a93a3]">За этот месяц платежей пока нет</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#8a93a3]">Разбивка по месяцам отсутствует</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[#e6ebf0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#8a93a3]">
              У студента нет данных по абонементам и платежам
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
