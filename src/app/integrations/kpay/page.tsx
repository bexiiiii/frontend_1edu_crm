'use client';

import { ExternalLink, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  kpayInvoicesService,
  studentsService,
  type KpayInvoiceDto,
  type KpayInvoiceStatus,
  type ContactRecipientField,
  type GenerateKpayInvoicesResponse,
} from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';

const KPAY_STATUS_LABELS: Record<KpayInvoiceStatus, string> = {
  CREATED: 'Создан',
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменен',
  EXPIRED: 'Истек',
};

const KPAY_STATUS_COLORS: Record<KpayInvoiceStatus, string> = {
  CREATED: 'border-slate-200 bg-slate-100 text-slate-700',
  PENDING: 'border-amber-200 bg-amber-100 text-amber-700',
  PAID: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  FAILED: 'border-rose-200 bg-rose-100 text-rose-700',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  EXPIRED: 'border-orange-200 bg-orange-100 text-orange-700',
};

const RECIPIENT_FIELD_LABELS: Record<ContactRecipientField, string> = {
  PHONE: 'Телефон',
  STUDENT_PHONE: 'Телефон ученика',
  PARENT_PHONE: 'Телефон родителя',
  ADDITIONAL_PHONE_1: 'Доп. номер',
};

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | KpayInvoiceStatus; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  ...Object.entries(KPAY_STATUS_LABELS).map(([value, label]) => ({
    value: value as KpayInvoiceStatus,
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

function getInvoicePaymentState(invoice: KpayInvoiceDto): { label: string; className: string } {
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

export default function KpayInvoicesPage() {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | KpayInvoiceStatus>('all');
  const [generating, setGenerating] = useState(false);

  const {
    data: invoices,
    loading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useApi(
    () =>
      kpayInvoicesService.getAll({
        month: selectedMonth || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [selectedMonth, statusFilter]
  );

  const { data: studentsPage } = useApi(() => studentsService.getAll({ page: 0, size: 1000 }), []);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const response = await kpayInvoicesService.generate(
        selectedMonth ? { month: selectedMonth } : undefined
      );
      const result = response.data as GenerateKpayInvoicesResponse;
      pushToast({
        message: `Счета сгенерированы: ${result.generated} создано, ${result.skipped} пропущено, ${result.failed} ошибка`,
        tone: result.failed > 0 ? 'warning' : 'success',
      });
      await refetchInvoices();
    } catch (error) {
      pushToast({ message: 'Не удалось сгенерировать счета.', tone: 'error' });
    } finally {
      setGenerating(false);
    }
  };

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
      const status = KPAY_STATUS_LABELS[invoice.status].toLowerCase();
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

  const paidCount = useMemo(() => rows.filter((invoice) => invoice.status === 'PAID' || Boolean(invoice.paidAt)).length, [rows]);

  return (
    <div className="space-y-6">
      <div className="crm-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1f2530]">KPAY инвойсы</h1>
            <p className="mt-1 text-sm text-[#5f6b7b]">
              Все отправленные инвойсы и результаты оплаты: кому отправили, через какой контакт, когда отправили, когда оплатили и текущий статус.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleGenerateInvoices()}
              disabled={generating}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#467aff] bg-[#467aff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3568eb] disabled:opacity-50"
            >
              {generating ? 'Генерация...' : 'Сгенерировать счета'}
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
            onChange={(event) => setStatusFilter(event.target.value as 'all' | KpayInvoiceStatus)}
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
                  <th className="crm-table-th">Статус KPAY</th>
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
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${KPAY_STATUS_COLORS[invoice.status]}`}
                          >
                            {KPAY_STATUS_LABELS[invoice.status]}
                          </span>
                        </td>

                        <td className="crm-table-cell">
                          <div className="space-y-1">
                            <div className="text-xs text-[#667183]">Merchant: {invoice.merchantInvoiceId}</div>
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
    </div>
  );
}
