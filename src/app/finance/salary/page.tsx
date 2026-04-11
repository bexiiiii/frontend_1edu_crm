'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Search } from 'lucide-react';
import { AddSalaryModal } from '@/components/features/salary/AddSalaryModal';
import { Button } from '@/components/ui/Button';
import {
  STAFF_ROLE_LABELS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_COLORS,
  STAFF_STATUS_LABELS,
} from '@/constants/employee';
import {
  salaryService,
  staffService,
  type CreateSalaryPaymentRequest,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { SalaryFilters, SalaryReportItem } from '@/types/salary';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(month: string): string {
  if (!month) return '—';

  return new Date(`${month}-01T00:00:00`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function formatMoney(value: number, currency = 'KZT'): string {
  const suffix = currency === 'KZT' ? '₸' : currency;
  return `${value.toLocaleString('ru-RU')} ${suffix}`;
}

export default function SalaryPage() {
  const [filters, setFilters] = useState<SalaryFilters>({
    searchEmployee: '',
    position: 'all',
    month: getCurrentMonth(),
  });
  const [paymentModalState, setPaymentModalState] = useState<{
    key: number;
    isOpen: boolean;
    defaultStaffId: string;
  }>({
    key: 0,
    isOpen: false,
    defaultStaffId: '',
  });

  const { data: salaryOverview, loading, error, refetch } = useApi(
    () =>
      salaryService.getSalaryOverview({
        month: filters.month || undefined,
      }),
    [filters.month]
  );

  const { data: staffPage } = useApi(() => staffService.getAll({ page: 0, size: 1000 }), []);

  const createPaymentMutation = useMutation((data: CreateSalaryPaymentRequest) =>
    salaryService.createPayment(data)
  );

  const staffMetaMap = useMemo(() => {
    return new Map(
      (staffPage?.content ?? []).map((staff) => [
        staff.id,
        {
          position: staff.position || '—',
        },
      ])
    );
  }, [staffPage]);

  const salaries = useMemo<SalaryReportItem[]>(() => {
    const currency = salaryOverview?.currency || 'KZT';
    const period = formatMonthLabel(salaryOverview?.month || filters.month);

    return (salaryOverview?.entries ?? []).map((entry) => ({
      id: entry.staffId,
      staffId: entry.staffId,
      employeeName: entry.fullName,
      position: staffMetaMap.get(entry.staffId)?.position || '—',
      role: entry.role,
      status: entry.status,
      salaryType: entry.salaryType,
      fixedSalary: entry.fixedSalary,
      salaryPercentage: entry.salaryPercentage,
      activeStudentCount: entry.activeStudentCount,
      percentageBaseAmount: entry.percentageBaseAmount,
      dueAmount: entry.dueAmount,
      paidAmount: entry.paidAmount,
      outstandingAmount: entry.outstandingAmount,
      paymentCount: entry.payments.length,
      currency,
      period,
    }));
  }, [filters.month, salaryOverview, staffMetaMap]);

  const filteredSalaries = useMemo(() => {
    const query = filters.searchEmployee.trim().toLowerCase();

    return salaries.filter((salary) => {
      if (query) {
        const haystack = [
          salary.employeeName,
          salary.position,
          STAFF_ROLE_LABELS[salary.role],
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filters.position !== 'all' && salary.position !== filters.position) {
        return false;
      }

      return true;
    });
  }, [filters.position, filters.searchEmployee, salaries]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        salaries
          .map((salary) => salary.position)
          .filter((position) => position && position !== '—')
      )
    );
  }, [salaries]);

  const summary = useMemo(
    () => ({
      totalStaff: filteredSalaries.length,
      totalDue: filteredSalaries.reduce((sum, salary) => sum + salary.dueAmount, 0),
      totalPaid: filteredSalaries.reduce((sum, salary) => sum + salary.paidAmount, 0),
      totalOutstanding: filteredSalaries.reduce((sum, salary) => sum + salary.outstandingAmount, 0),
    }),
    [filteredSalaries]
  );

  const paymentStaffOptions = useMemo(
    () =>
      salaries.map((salary) => ({
        id: salary.staffId,
        name: salary.employeeName,
        outstandingAmount: salary.outstandingAmount,
        dueAmount: salary.dueAmount,
        paidAmount: salary.paidAmount,
      })),
    [salaries]
  );

  const openPaymentModal = (staffId = '') => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      defaultStaffId: staffId,
    }));
  };

  const closePaymentModal = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
      defaultStaffId: '',
    }));
  };

  const handleSavePayment = async (data: CreateSalaryPaymentRequest) => {
    await createPaymentMutation.mutate(data);
    closePaymentModal();
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => openPaymentModal()}>
          Зафиксировать выплату
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="crm-surface p-6">
          <p className="mb-1 text-sm text-gray-500">Сотрудников в выборке</p>
          <p className="text-2xl font-bold text-[#1f2530]">{summary.totalStaff}</p>
        </div>
        <div className="crm-surface p-6">
          <p className="mb-1 text-sm text-gray-500">Начислено</p>
          <p className="text-2xl font-bold text-[#1f2530]">{formatMoney(summary.totalDue)}</p>
        </div>
        <div className="crm-surface p-6">
          <p className="mb-1 text-sm text-gray-500">Выплачено</p>
          <p className="text-2xl font-bold text-green-600">{formatMoney(summary.totalPaid)}</p>
        </div>
        <div className="crm-surface p-6">
          <p className="mb-1 text-sm text-gray-500">Остаток</p>
          <p className="text-2xl font-bold text-red-600">{formatMoney(summary.totalOutstanding)}</p>
        </div>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по сотруднику, роли или должности"
              value={filters.searchEmployee}
              onChange={(event) => setFilters((prev) => ({ ...prev, searchEmployee: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.position}
            onChange={(event) => setFilters((prev) => ({ ...prev, position: event.target.value }))}
            className="crm-select"
          >
            <option value="all">Все должности</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={filters.month}
            onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
            className="crm-select"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : (
        <div className="crm-table-wrap overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Сотрудник</th>
                  <th className="crm-table-th">Должность</th>
                  <th className="crm-table-th">Модель</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Начислено</th>
                  <th className="crm-table-th">Выплачено</th>
                  <th className="crm-table-th">Остаток</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredSalaries.length > 0 ? (
                  filteredSalaries.map((salary, index) => (
                    <tr key={salary.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm font-medium text-gray-900">{salary.employeeName}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{STAFF_ROLE_LABELS[salary.role]}</span>
                          <span
                            className={`inline-flex rounded-lg px-2 py-0.5 font-medium ${STAFF_STATUS_COLORS[salary.status]}`}
                          >
                            {STAFF_STATUS_LABELS[salary.status]}
                          </span>
                        </div>
                      </td>
                      <td className="crm-table-cell">{salary.position}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{STAFF_SALARY_TYPE_LABELS[salary.salaryType]}</div>
                        <div className="text-xs text-gray-500">
                          {salary.salaryType === 'FIXED'
                            ? formatMoney(salary.fixedSalary, salary.currency)
                            : salary.salaryPercentage !== null
                              ? `${salary.salaryPercentage}%`
                              : '—'}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <div>{salary.period}</div>
                        <div className="text-xs text-gray-500">
                          Активных учеников: {salary.activeStudentCount}
                        </div>
                      </td>
                      <td className="crm-table-cell">{formatMoney(salary.dueAmount, salary.currency)}</td>
                      <td className="crm-table-cell text-green-600">
                        {formatMoney(salary.paidAmount, salary.currency)}
                      </td>
                      <td className="crm-table-cell text-red-600">
                        {formatMoney(salary.outstandingAmount, salary.currency)}
                      </td>
                      <td className="crm-table-cell">
                        <Link
                          href={`/finance/salary/${salary.staffId}`}
                          className="inline-flex rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                          title="Открыть историю зарплаты"
                        >
                          <Plus className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Данные по зарплатам не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddSalaryModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={closePaymentModal}
        onSave={handleSavePayment}
        staffOptions={paymentStaffOptions}
        defaultStaffId={paymentModalState.defaultStaffId}
        defaultMonth={filters.month}
        isSubmitting={createPaymentMutation.loading}
      />
    </div>
  );
}
