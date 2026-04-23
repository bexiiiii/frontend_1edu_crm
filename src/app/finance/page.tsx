'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Edit2, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { AddIncomeModal } from '@/components/features/finance/AddIncomeModal';
import { AddExpenseModal } from '@/components/features/finance/AddExpenseModal';
import { AmountChangeReasonModal } from '@/components/features/finance/AmountChangeReasonModal';
import {
  FINANCE_AMOUNT_CHANGE_REASON_LABELS,
  FINANCE_TAB_LABELS,
  TRANSACTION_STATUS_COLORS,
  TRANSACTION_STATUS_LABELS,
} from '@/constants/finance';
import {
  financeService,
  studentsService,
  type AmountChangeReasonCode,
  type CreateTransactionRequest,
  type TransactionDto,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { FinanceFilters, FinanceTab, FinanceTransactionItem, TransactionFormValues } from '@/types/finance';

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

function toFormValues(transaction: FinanceTransactionItem): TransactionFormValues {
  return {
    amount: String(transaction.amount),
    originalAmount: String(transaction.originalAmount),
    transactionDate: transaction.transactionDate,
    status: transaction.status,
    category: transaction.category,
    description: transaction.description,
    notes: transaction.notes,
    amountChangeReasonCode: transaction.amountChangeReasonCode,
    amountChangeReasonOther: transaction.amountChangeReasonOther,
    studentId: transaction.studentId,
  };
}

function toListItem(transaction: TransactionDto, studentMap: Map<string, string>): FinanceTransactionItem {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    originalAmount: transaction.amount,
    currency: transaction.currency || 'KZT',
    transactionDate: transaction.transactionDate,
    category: transaction.category || '',
    description: transaction.description || '',
    notes: transaction.notes || '',
    amountChangeReasonCode: transaction.amountChangeReasonCode || '',
    amountChangeReasonOther: transaction.amountChangeReasonOther || '',
    status: transaction.status,
    studentId: transaction.studentId || '',
    studentName: transaction.studentId ? studentMap.get(transaction.studentId) || transaction.studentId : '',
    createdAt: transaction.createdAt || '',
    updatedAt: transaction.updatedAt || '',
  };
}

function formatDate(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function shiftDays(date: string, delta: number): string {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + delta);
  const timezoneOffset = nextDate.getTimezoneOffset() * 60_000;
  return new Date(nextDate.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export default function Finance() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('INCOME');
  const [filters, setFilters] = useState<FinanceFilters>({
    search: '',
    status: 'all',
    studentId: 'all',
    periodStart: '',
    periodEnd: '',
  });
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    transactionId: string | null;
    type: FinanceTab;
    initialValues?: TransactionFormValues;
  }>({
    key: 0,
    isOpen: false,
    transactionId: null,
    type: 'INCOME',
  });
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    transactionId: string | null;
    payload: Partial<CreateTransactionRequest> | null;
  }>({
    isOpen: false,
    transactionId: null,
    payload: null,
  });
  const hasPartialPeriod = Boolean(filters.periodStart) !== Boolean(filters.periodEnd);
  const hasCompletePeriod = Boolean(filters.periodStart && filters.periodEnd);
  const hasInvalidPeriod = hasCompletePeriod && filters.periodStart > filters.periodEnd;
  const canUsePeriodRange = hasCompletePeriod && !hasInvalidPeriod;

  const { data: studentsPage } = useApi(() => studentsService.getAll({ page: 0, size: 500 }), []);

  const studentOptions = useMemo(
    () =>
      (studentsPage?.content ?? []).map((student) => ({
        id: student.id,
        name: getStudentFullName(student) || student.email || student.phone || 'Без имени',
      })),
    [studentsPage]
  );

  const studentMap = useMemo(() => new Map(studentOptions.map((student) => [student.id, student.name])), [studentOptions]);

  const { data: transactionsPage, loading, error, refetch } = useApi(() => {
    const params = { page: 0, size: 1000 };

    if (canUsePeriodRange) {
      return financeService.getByDate({
        ...params,
        from: filters.periodStart,
        to: filters.periodEnd,
      });
    }

    return financeService.getTransactions({
      ...params,
      type: activeTab,
    });
  }, [activeTab, canUsePeriodRange, filters.periodEnd, filters.periodStart]);

  const createMutation = useMutation((data: CreateTransactionRequest) => financeService.createTransaction(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: Partial<CreateTransactionRequest> }) =>
    financeService.updateTransaction(id, data)
  );
  const deleteMutation = useMutation((id: string) => financeService.deleteTransaction(id));

  const transactions = useMemo<FinanceTransactionItem[]>(
    () =>
      (transactionsPage?.content ?? [])
        .filter((transaction) => transaction.type === activeTab)
        .map((transaction) => toListItem(transaction, studentMap)),
    [activeTab, studentMap, transactionsPage]
  );

  const filteredTransactions = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (query) {
        const haystack = [
          transaction.category,
          transaction.description,
          transaction.notes,
          transaction.studentName,
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filters.status !== 'all' && transaction.status !== filters.status) {
        return false;
      }

      if (filters.studentId !== 'all' && transaction.studentId !== filters.studentId) {
        return false;
      }

      if (canUsePeriodRange && transaction.transactionDate < filters.periodStart) {
        return false;
      }

      if (canUsePeriodRange && transaction.transactionDate > filters.periodEnd) {
        return false;
      }

      return true;
    });
  }, [canUsePeriodRange, filters.periodEnd, filters.periodStart, filters.search, filters.status, filters.studentId, transactions]);

  const summary = useMemo(
    () => ({
      totalAmount: filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      count: filteredTransactions.length,
      periodLabel: canUsePeriodRange
        ? `${formatDate(filters.periodStart)} - ${formatDate(filters.periodEnd)}`
        : hasPartialPeriod
          ? 'Укажите обе даты'
          : 'За всё время',
    }),
    [canUsePeriodRange, filteredTransactions, filters.periodEnd, filters.periodStart, hasPartialPeriod]
  );

  const financeTabs: { id: FinanceTab; label: string }[] = [
    { id: 'INCOME', label: FINANCE_TAB_LABELS.INCOME },
    { id: 'EXPENSE', label: FINANCE_TAB_LABELS.EXPENSE },
    { id: 'REFUND', label: FINANCE_TAB_LABELS.REFUND },
  ];

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      transactionId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = () => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      transactionId: null,
      type: activeTab,
      initialValues: undefined,
    }));
  };

  const openEditModal = (transaction: FinanceTransactionItem) => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      transactionId: transaction.id,
      type: transaction.type,
      initialValues: toFormValues(transaction),
    }));
  };

  const handleSaveTransaction = async (data: CreateTransactionRequest) => {
    if (modalState.transactionId) {
      const initialAmount = Number(modalState.initialValues?.originalAmount || modalState.initialValues?.amount || '0');
      const nextAmount = Number(data.amount);
      const isAmountChanged = Number.isFinite(nextAmount) && nextAmount !== initialAmount;

      if (isAmountChanged) {
        setReasonModalState({
          isOpen: true,
          transactionId: modalState.transactionId,
          payload: {
            ...data,
            amountChangeReasonCode: undefined,
            amountChangeReasonOther: undefined,
          },
        });
        closeModal();
        return;
      }

      await updateMutation.mutate({
        id: modalState.transactionId,
        data,
      });
    } else {
      await createMutation.mutate(data);
    }

    closeModal();
    await refetch();
  };

  const handleConfirmReason = async (reason: { reasonCode: AmountChangeReasonCode; reasonOther?: string }) => {
    if (!reasonModalState.transactionId || !reasonModalState.payload) {
      return;
    }

    await updateMutation.mutate({
      id: reasonModalState.transactionId,
      data: {
        ...reasonModalState.payload,
        amountChangeReasonCode: reason.reasonCode,
        amountChangeReasonOther: reason.reasonCode === 'OTHER' ? reason.reasonOther : undefined,
      },
    });

    setReasonModalState({ isOpen: false, transactionId: null, payload: null });
    await refetch();
  };

  const handleDeleteTransaction = async (transaction: FinanceTransactionItem) => {
    if (!confirm('Вы уверены, что хотите удалить транзакцию?')) {
      return;
    }

    await deleteMutation.mutate(transaction.id);
    await refetch();
  };

  const totalColor =
    activeTab === 'EXPENSE' || activeTab === 'REFUND' ? 'text-red-600' : 'text-green-600';
  const hasDirtyFilters =
    filters.search.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.studentId !== 'all' ||
    Boolean(filters.periodStart) ||
    Boolean(filters.periodEnd);
  const periodFeedback = hasInvalidPeriod
    ? 'Дата окончания должна быть не раньше даты начала.'
    : hasPartialPeriod
      ? 'Чтобы применить фильтр по периоду по документации API, укажите обе даты.'
      : null;

  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    const today = getTodayDate();

    if (preset === 'today') {
      setFilters((prev) => ({
        ...prev,
        periodStart: today,
        periodEnd: today,
      }));
      return;
    }

    if (preset === 'week') {
      setFilters((prev) => ({
        ...prev,
        periodStart: shiftDays(today, -6),
        periodEnd: today,
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      periodStart: `${today.slice(0, 7)}-01`,
      periodEnd: today,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      studentId: 'all',
      periodStart: '',
      periodEnd: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreateModal}>
          {activeTab === 'INCOME' ? 'Добавить доход' : activeTab === 'EXPENSE' ? 'Добавить расход' : 'Добавить возврат'}
        </Button>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={financeTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as FinanceTab)}
          aria-label="Финансовые вкладки"
          className="w-fit"
        />
      </div>

      <div className="crm-surface p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202938]">
              Реестр: {FINANCE_TAB_LABELS[activeTab]}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="inline-flex h-9 items-center rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-medium text-[#485465] transition-colors hover:bg-[#f4f7f9]"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => applyPreset('week')}
              className="inline-flex h-9 items-center rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-medium text-[#485465] transition-colors hover:bg-[#f4f7f9]"
            >
              7 дней
            </button>
            <button
              type="button"
              onClick={() => applyPreset('month')}
              className="inline-flex h-9 items-center rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-medium text-[#485465] transition-colors hover:bg-[#f4f7f9]"
            >
              Этот месяц
            </button>
            {hasDirtyFilters ? (
              <Button size="sm" variant="secondary" icon={RotateCcw} onClick={resetFilters}>
                Сбросить
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] p-4">
            <p className="text-sm text-[#7f8794]">Показано транзакций</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">{summary.count}</p>
          </div>
          <div className="rounded-2xl border border-[#dbe2e8] bg-white p-4">
            <p className="text-sm text-[#7f8794]">Сумма по выборке</p>
            <p className={`mt-1 text-2xl font-bold ${totalColor}`}>
              {summary.totalAmount.toLocaleString('ru-RU')} ₸
            </p>
          </div>
          <div className="rounded-2xl border border-[#dbe2e8] bg-[#eef5ff] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6480b8]">
              <CalendarDays className="h-4 w-4" />
              Период
            </div>
            <p className="mt-1 text-lg font-semibold text-[#20314f]">{summary.periodLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по категории, описанию, заметкам"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                status: event.target.value as FinanceFilters['status'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            <option value="PENDING">{TRANSACTION_STATUS_LABELS.PENDING}</option>
            <option value="COMPLETED">{TRANSACTION_STATUS_LABELS.COMPLETED}</option>
            <option value="CANCELLED">{TRANSACTION_STATUS_LABELS.CANCELLED}</option>
          </select>

          <select
            value={filters.studentId}
            onChange={(event) => setFilters((prev) => ({ ...prev, studentId: event.target.value }))}
            className="crm-select"
          >
            <option value="all">Все студенты</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.periodStart}
            onChange={(event) => setFilters((prev) => ({ ...prev, periodStart: event.target.value }))}
            className="crm-select"
          />

          <input
            type="date"
            value={filters.periodEnd}
            onChange={(event) => setFilters((prev) => ({ ...prev, periodEnd: event.target.value }))}
            className="crm-select"
          />
        </div>

        {periodFeedback ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              hasInvalidPeriod
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {periodFeedback}
          </div>
        ) : null}
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e6ebf0] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
            <p>
              Транзакций: <span className="font-semibold text-gray-900">{summary.count}</span>
            </p>
            <p>
              Сумма: <span className={`font-semibold ${totalColor}`}>{summary.totalAmount.toLocaleString('ru-RU')} ₸</span>
            </p>
          </div>
          <p className="text-sm font-medium text-[#667085]">
            Период выборки: <span className="font-semibold text-[#202938]">{summary.periodLabel}</span>
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Категория</th>
                  <th className="crm-table-th">Сумма</th>
                  <th className="crm-table-th">Дата</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Студент</th>
                  <th className="crm-table-th">Описание</th>
                  <th className="crm-table-th">Причина изменения суммы</th>
                  <th className="crm-table-th">Заметки</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">{transaction.category || '—'}</td>
                      <td className={`crm-table-cell font-semibold ${totalColor}`}>
                        {transaction.amount.toLocaleString('ru-RU')} {transaction.currency}
                      </td>
                      <td className="crm-table-cell">{formatDate(transaction.transactionDate)}</td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${TRANSACTION_STATUS_COLORS[transaction.status]}`}
                        >
                          {TRANSACTION_STATUS_LABELS[transaction.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">{transaction.studentName || '—'}</td>
                      <td className="crm-table-cell">{transaction.description || '—'}</td>
                      <td className="crm-table-cell">
                        {transaction.amountChangeReasonCode
                          ? `${FINANCE_AMOUNT_CHANGE_REASON_LABELS[transaction.amountChangeReasonCode]}${
                              transaction.amountChangeReasonCode === 'OTHER' && transaction.amountChangeReasonOther
                                ? `: ${transaction.amountChangeReasonOther}`
                                : ''
                            }`
                          : '—'}
                      </td>
                      <td className="crm-table-cell">{transaction.notes || '—'}</td>
                      <td className="crm-table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#edf3ff] hover:text-[#3568eb]"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDeleteTransaction(transaction)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={10} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Транзакции не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modalState.type === 'INCOME' || modalState.type === 'REFUND') && (
        <AddIncomeModal
          key={modalState.key}
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveTransaction}
          initialValues={modalState.initialValues}
          students={studentOptions}
          isSubmitting={createMutation.loading || updateMutation.loading}
          title={
            modalState.type === 'INCOME'
              ? modalState.transactionId
                ? 'Редактировать доход'
                : 'Добавить доход'
              : modalState.transactionId
                ? 'Редактировать возврат'
                : 'Добавить возврат'
          }
          transactionType={modalState.type}
        />
      )}

      {modalState.type === 'EXPENSE' && (
        <AddExpenseModal
          key={modalState.key}
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveTransaction}
          initialValues={modalState.initialValues}
          students={studentOptions}
          isSubmitting={createMutation.loading || updateMutation.loading}
          title={modalState.transactionId ? 'Редактировать расход' : 'Добавить расход'}
        />
      )}

      <AmountChangeReasonModal
        isOpen={reasonModalState.isOpen}
        onClose={() => setReasonModalState({ isOpen: false, transactionId: null, payload: null })}
        onConfirm={handleConfirmReason}
        isSubmitting={updateMutation.loading}
      />
    </div>
  );
}
