'use client';

import { ExternalLink, Loader2, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  apiPayInvoicesService,
  studentsService,
  type ApiPayInvoiceDto,
  type ApiPayInvoiceStatus,
  type ContactRecipientField,
} from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ApiPayInvoiceModal } from '@/components/features/settings/ApiPayInvoiceModal';
import { Modal } from '@/components/ui/Modal';
import { pushToast } from '@/lib/toast';

const APIPAY_STATUS_LABELS: Record<ApiPayInvoiceStatus, string> = {
  CREATED: 'Создан',
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменен',
  EXPIRED: 'Истек',
  REFUNDED: 'Возвращен',
};

const APIPAY_STATUS_COLORS: Record<ApiPayInvoiceStatus, string> = {
  CREATED: 'border-slate-200 bg-slate-100 text-slate-700',
  PENDING: 'border-amber-200 bg-amber-100 text-amber-700',
  PAID: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  FAILED: 'border-rose-200 bg-rose-100 text-rose-700',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  EXPIRED: 'border-orange-200 bg-orange-100 text-orange-700',
  REFUNDED: 'border-cyan-200 bg-cyan-100 text-cyan-700',
};

const RECIPIENT_FIELD_LABELS: Record<ContactRecipientField, string> = {
  PHONE: 'Телефон',
  STUDENT_PHONE: 'Телефон ученика',
  PARENT_PHONE: 'Телефон родителя',
  ADDITIONAL_PHONE_1: 'Доп. номер',
};

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | ApiPayInvoiceStatus; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  ...Object.entries(APIPAY_STATUS_LABELS).map(([value, label]) => ({
    value: value as ApiPayInvoiceStatus,
    label,
  })),
];

function formatMoney(value: number, currency: string): string {
  return `${value.toLocaleString('ru-RU')} ${currency}`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStudentDisplayName(student: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  id: string;
}): string {
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  const fromParts = [student.lastName, student.firstName, student.middleName]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();

  if (fromParts) {
    return fromParts;
  }

  return student.email || student.phone || student.id;
}

function getInvoicePaymentState(invoice: ApiPayInvoiceDto): { label: string; className: string } {
  if (invoice.status === 'REFUNDED') {
    return {
      label: 'Возвращено',
      className: 'border-cyan-200 bg-cyan-100 text-cyan-700',
    };
  }

  if (invoice.status === 'PAID' || invoice.paidAt) {
    return {
      label: 'Оплачено',
      className: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: 'Не оплачено',
    className: 'border-rose-200 bg-rose-100 text-rose-700',
  };
}

export default function ApiPayInvoicesPage() {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApiPayInvoiceStatus>('all');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ApiPayInvoiceDto | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const {
    data: invoices,
    loading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useApi(
    () =>
      apiPayInvoicesService.getAll({
        month: selectedMonth || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [selectedMonth, statusFilter]
  );

  const { data: studentsPage } = useApi(() => studentsService.getAll({ page: 0, size: 1000 }), []);

  const studentNameById = useMemo(() => {
    return new Map((studentsPage?.content ?? []).map((student) => [student.id, getStudentDisplayName(student)]));
  }, [studentsPage]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...(invoices ?? [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((invoice) => {
      const studentName = (studentNameById.get(invoice.studentId) || invoice.studentId).toLowerCase();
      const status = APIPAY_STATUS_LABELS[invoice.status].toLowerCase();
      const recipientField = RECIPIENT_FIELD_LABELS[invoice.recipientField].toLowerCase();

      return (
        studentName.includes(query) ||
        (invoice.recipientValue || '').toLowerCase().includes(query) ||
        invoice.studentId.toLowerCase().includes(query) ||
        invoice.subscriptionId.toLowerCase().includes(query) ||
        invoice.merchantInvoiceId.toLowerCase().includes(query) ||
        (invoice.externalInvoiceId || '').toLowerCase().includes(query) ||
        status.includes(query) ||
        recipientField.includes(query)
      );
    });
  }, [invoices, search, studentNameById]);

  const paidCount = useMemo(
    () => rows.filter((invoice) => invoice.status === 'PAID' || Boolean(invoice.paidAt)).length,
    [rows]
  );

  const handleViewDetails = async (invoiceId: string) => {
    try {
      const response = await apiPayInvoicesService.getById(invoiceId);
      setSelectedInvoice(response.data);
      setDetailModalOpen(true);
    } catch {
      pushToast({ message: 'Не удалось загрузить детали счета.', tone: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="crm-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1f2530]">ApiPay инвойсы</h1>
            <p className="mt-1 text-sm text-[#5f6b7b]">
              Все отправленные инвойсы и результаты оплаты: кому отправили, через какой контакт, когда отправили, когда оплатили и текущий статус.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInvoiceModalOpen(true)}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#467aff] bg-[#467aff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3568eb]"
            >
              Создать счет
            </button>
            <button
              type="button"
              onClick={() => void refetchInvoices()}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#dbe2e8] bg-white px-4 text-sm font-medium text-[#2f3640] transition-colors hover:bg-[#f6f8fb]"
            >
              Обновить
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a94a3]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск: ученик, инвойс, телефон"
              className="crm-input crm-input-with-icon"
            />
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="crm-select"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ApiPayInvoiceStatus)}
            className="crm-select"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#e6ebf0] px-6 py-4 text-sm text-[#4e5968]">
          <span>
            Всего инвойсов: <span className="font-semibold text-[#1f2530]">{rows.length}</span>
          </span>
          <span>
            Оплачено: <span className="font-semibold text-emerald-700">{paidCount}</span>
          </span>
          <span>
            Не оплачено: <span className="font-semibold text-rose-700">{Math.max(rows.length - paidCount, 0)}</span>
          </span>
        </div>

        {invoicesError ? (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {invoicesError}
          </div>
        ) : null}

        {invoicesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-312.5">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Кому</th>
                  <th className="crm-table-th">Как отправили</th>
                  <th className="crm-table-th">Сумма</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Отправлено</th>
                  <th className="crm-table-th">Оплачено</th>
                  <th className="crm-table-th">Статус оплаты</th>
                  <th className="crm-table-th">Статус ApiPay</th>
                  <th className="crm-table-th">Результат</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {rows.length > 0 ? (
                  rows.map((invoice, index) => {
                    const studentName = studentNameById.get(invoice.studentId) || invoice.studentId;
                    const paymentState = getInvoicePaymentState(invoice);

                    return (
                      <tr key={invoice.id} className="crm-table-row align-top">
                        <td className="crm-table-cell">{index + 1}</td>

                        <td className="crm-table-cell">
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-[#1f2530]">{studentName}</div>
                            <div className="text-xs text-[#7d8795]">Student ID: {invoice.studentId}</div>
                            <div className="text-xs text-[#7d8795]">Subscription: {invoice.subscriptionId}</div>
                          </div>
                        </td>

                        <td className="crm-table-cell">
                          <div className="space-y-0.5">
                            <div className="text-sm text-[#1f2530]">{RECIPIENT_FIELD_LABELS[invoice.recipientField]}</div>
                            <div className="text-xs text-[#7d8795]">{invoice.recipientValue || '—'}</div>
                          </div>
                        </td>

                        <td className="crm-table-cell font-medium text-[#1f2530]">
                          {formatMoney(invoice.amount, invoice.currency)}
                        </td>

                        <td className="crm-table-cell text-sm text-[#374151]">{invoice.paymentMonth}</td>
                        <td className="crm-table-cell text-sm text-[#374151]">{formatDateTime(invoice.createdAt)}</td>
                        <td className="crm-table-cell text-sm text-[#374151]">{formatDateTime(invoice.paidAt)}</td>

                        <td className="crm-table-cell">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${paymentState.className}`}
                          >
                            {paymentState.label}
                          </span>
                        </td>

                        <td className="crm-table-cell">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${APIPAY_STATUS_COLORS[invoice.status]}`}
                          >
                            {APIPAY_STATUS_LABELS[invoice.status]}
                          </span>
                        </td>

                        <td className="crm-table-cell">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => void handleViewDetails(invoice.id)}
                              className="text-xs font-medium text-[#3568eb] hover:text-[#2f5fd0]"
                            >
                              Merchant: {invoice.merchantInvoiceId}
                            </button>
                            <div className="text-xs text-[#667183]">External: {invoice.externalInvoiceId || '—'}</div>
                            <div className="text-xs text-[#667183]">Txn: {invoice.externalTransactionId || '—'}</div>
                            <div className="text-xs text-[#667183]">Метод оплаты: {invoice.externalPaymentMethod || '—'}</div>

                            {invoice.paymentUrl ? (
                              <a
                                href={invoice.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#3568eb] hover:text-[#2f5fd0]"
                              >
                                Ссылка на оплату
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}

                            {invoice.errorMessage ? (
                              <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                                {invoice.errorMessage}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={10} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      По выбранным фильтрам инвойсы не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApiPayInvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={() => void refetchInvoices()}
      />

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInvoice(null);
        }}
        title="Детали ApiPay счета"
      >
        {selectedInvoice ? (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Основная информация</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Student ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Subscription ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.subscriptionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Период оплаты:</span>
                  <span className="font-medium text-[#1f2530]">{selectedInvoice.paymentMonth}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="rounded-xl border border-[#dbe2e8] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Сумма и валюта</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Сумма:</span>
                  <span className="text-lg font-bold text-[#1f2530]">
                    {formatMoney(selectedInvoice.amount, selectedInvoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="rounded-xl border border-[#dbe2e8] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Получатель</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Поле контакта:</span>
                  <span className="font-medium text-[#1f2530]">
                    {RECIPIENT_FIELD_LABELS[selectedInvoice.recipientField]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Значение:</span>
                  <span className="font-mono text-[#1f2530]">{selectedInvoice.recipientValue || '—'}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl border border-[#dbe2e8] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Статус</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Статус ApiPay:</span>
                  <span
                    className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${APIPAY_STATUS_COLORS[selectedInvoice.status]}`}
                  >
                    {APIPAY_STATUS_LABELS[selectedInvoice.status]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Статус оплаты:</span>
                  <span
                    className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${getInvoicePaymentState(selectedInvoice).className}`}
                  >
                    {getInvoicePaymentState(selectedInvoice).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-xl border border-[#dbe2e8] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Даты</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Создан:</span>
                  <span className="text-[#1f2530]">{formatDateTime(selectedInvoice.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Обновлен:</span>
                  <span className="text-[#1f2530]">{formatDateTime(selectedInvoice.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Оплачен:</span>
                  <span className="text-[#1f2530]">{formatDateTime(selectedInvoice.paidAt)}</span>
                </div>
              </div>
            </div>

            {/* External IDs */}
            <div className="rounded-xl border border-[#dbe2e8] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Внешние идентификаторы</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Merchant Invoice ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.merchantInvoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">External Invoice ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.externalInvoiceId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Transaction ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.externalTransactionId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Метод оплаты:</span>
                  <span className="text-[#1f2530]">{selectedInvoice.externalPaymentMethod || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f6b7b]">Student Payment ID:</span>
                  <span className="font-mono text-xs text-[#1f2530]">{selectedInvoice.studentPaymentId || '—'}</span>
                </div>
              </div>
            </div>

            {/* Payment URL */}
            {selectedInvoice.paymentUrl && (
              <div className="rounded-xl border border-[#dbe2e8] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Ссылка на оплату</h3>
                <a
                  href={selectedInvoice.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#3568eb] hover:text-[#2f5fd0]"
                >
                  {selectedInvoice.paymentUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Error Message */}
            {selectedInvoice.errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-rose-700">Ошибка</h3>
                <p className="text-sm text-rose-700">{selectedInvoice.errorMessage}</p>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#dbe2e8] bg-white px-4 py-2 text-sm font-medium text-[#5f6b7b] transition-colors hover:bg-[#f6f8fb]"
              >
                <X className="h-4 w-4" />
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        )}
      </Modal>
    </div>
  );
}
