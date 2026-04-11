'use client';

import { useMemo, useState } from 'react';
import { Edit2, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AddEmployeeModal } from '@/components/features/employees/AddEmployeeModal';
import {
  STAFF_ROLE_LABELS,
  STAFF_ROLE_OPTIONS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_COLORS,
  STAFF_STATUS_LABELS,
  STAFF_STATUS_OPTIONS,
} from '@/constants/employee';
import { staffService, type CreateStaffRequest, type UpdateStaffRequest } from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { StaffFilters, StaffFormValues, StaffListItem } from '@/types/employee';

const PAGE_SIZE = 20;

function toFormValues(employee: StaffListItem): StaffFormValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    middleName: employee.middleName,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    status: employee.status,
    customStatus: employee.customStatus,
    position: employee.position,
    salary: employee.salary !== null ? String(employee.salary) : '',
    salaryType: employee.salaryType,
    salaryPercentage: employee.salaryPercentage !== null ? String(employee.salaryPercentage) : '',
    hireDate: employee.hireDate,
    notes: employee.notes,
  };
}

export default function Employees() {
  const [filters, setFilters] = useState<StaffFilters>({
    search: '',
    role: 'all',
    status: 'all',
  });
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    employeeId: string | null;
    initialValues?: StaffFormValues;
  }>({
    key: 0,
    isOpen: false,
    employeeId: null,
  });
  const [page, setPage] = useState(0);

  const searchQuery = filters.search.trim();
  const { data: staffPage, loading, error, refetch } = useApi(() => {
    if (searchQuery) {
      return staffService.search({
        query: searchQuery,
        page: 0,
        size: 1000,
      });
    }

    return staffService.getAll({
      page: 0,
      size: 1000,
      role: filters.role !== 'all' ? filters.role : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    });
  }, [searchQuery, filters.role, filters.status]);

  const createMutation = useMutation((data: CreateStaffRequest) => staffService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateStaffRequest }) =>
    staffService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => staffService.delete(id));

  const employees = useMemo<StaffListItem[]>(
    () =>
      (staffPage?.content ?? []).map((staff) => ({
        id: staff.id,
        fullName: staff.fullName || [staff.lastName, staff.firstName, staff.middleName || ''].filter(Boolean).join(' '),
        firstName: staff.firstName,
        lastName: staff.lastName,
        middleName: staff.middleName || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role,
        status: staff.status,
        customStatus: staff.customStatus || '',
        position: staff.position || '',
        salary: staff.salary,
        salaryType: staff.salaryType,
        salaryPercentage: staff.salaryPercentage,
        hireDate: staff.hireDate || '',
        notes: staff.notes || '',
      })),
    [staffPage]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (filters.role !== 'all' && employee.role !== filters.role) {
        return false;
      }

      if (filters.status !== 'all' && employee.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [employees, filters.role, filters.status]);

  const totalElements = filteredEmployees.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / PAGE_SIZE);
  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const paginatedEmployees = useMemo(
    () => filteredEmployees.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [currentPage, filteredEmployees]
  );

  const summary = useMemo(
    () => ({
      total: totalElements,
      active: filteredEmployees.filter((employee) => employee.status === 'ACTIVE').length,
    }),
    [filteredEmployees, totalElements]
  );

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      employeeId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = () => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      employeeId: null,
      initialValues: undefined,
    }));
  };

  const openEditModal = (employee: StaffListItem) => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      employeeId: employee.id,
      initialValues: toFormValues(employee),
    }));
  };

  const handleSaveEmployee = async (data: CreateStaffRequest | UpdateStaffRequest) => {
    if (modalState.employeeId) {
      await updateMutation.mutate({
        id: modalState.employeeId,
        data: data as UpdateStaffRequest,
      });
    } else {
      await createMutation.mutate(data as CreateStaffRequest);
    }

    closeModal();
    await refetch();
  };

  const handleDeleteEmployee = async (employee?: StaffListItem | null) => {
    const target = employee;
    if (!target || !confirm('Вы уверены, что хотите удалить сотрудника?')) {
      return;
    }

    await deleteMutation.mutate(target.id);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить сотрудника
        </Button>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону, email"
              value={filters.search}
              onChange={(event) => {
                setPage(0);
                setFilters((prev) => ({ ...prev, search: event.target.value }));
              }}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.role}
            onChange={(event) =>
              {
                setPage(0);
                setFilters((prev) => ({
                  ...prev,
                  role: event.target.value as StaffFilters['role'],
                }));
              }
            }
            className="crm-select"
          >
            <option value="all">Все роли</option>
            {STAFF_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              {
                setPage(0);
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value as StaffFilters['status'],
                }));
              }
            }
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            {STAFF_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-gray-700">
            Всего сотрудников: <span className="font-semibold text-gray-900">{summary.total}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Активных в выборке: <span className="font-semibold text-gray-900">{summary.active}</span>
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Сотрудник</th>
                  <th className="crm-table-th">Телефон</th>
                  <th className="crm-table-th">Email</th>
                  <th className="crm-table-th">Роль</th>
                  <th className="crm-table-th">Кастомный статус</th>
                  <th className="crm-table-th">Должность</th>
                  <th className="crm-table-th">Оплата</th>
                  <th className="crm-table-th">Дата найма</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((employee, index) => (
                    <tr key={employee.id} className="crm-table-row">
                      <td className="crm-table-cell">{currentPage * PAGE_SIZE + index + 1}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm font-medium text-gray-900">{employee.fullName}</div>
                        <div className="text-xs text-gray-500">{employee.position || '—'}</div>
                      </td>
                      <td className="crm-table-cell">{employee.phone || '—'}</td>
                      <td className="crm-table-cell">{employee.email || '—'}</td>
                      <td className="crm-table-cell">{STAFF_ROLE_LABELS[employee.role]}</td>
                      <td className="crm-table-cell">{employee.customStatus || '—'}</td>
                      <td className="crm-table-cell">{employee.position || '—'}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{STAFF_SALARY_TYPE_LABELS[employee.salaryType]}</div>
                        <div className="text-xs text-gray-500">
                          {employee.salaryType === 'FIXED'
                            ? employee.salary !== null
                              ? `${employee.salary.toLocaleString('ru-RU')} ₸`
                              : '—'
                            : employee.salaryPercentage !== null
                              ? `${employee.salaryPercentage}%`
                              : '—'}
                        </div>
                      </td>
                      <td className="crm-table-cell">{employee.hireDate || '—'}</td>
                      <td className="crm-table-cell">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${STAFF_STATUS_COLORS[employee.status]}`}>
                          {STAFF_STATUS_LABELS[employee.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/staff/${employee.id}`}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                            title="Карточка сотрудника"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(employee)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#edf3ff] hover:text-[#3568eb]"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee)}
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
                    <td colSpan={11} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Сотрудники не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e6ebf0] px-6 py-4">
            <p className="text-sm text-gray-500">
              Страница {currentPage + 1} из {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Назад
              </button>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>

      <AddEmployeeModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveEmployee}
        initialValues={modalState.initialValues}
        isSubmitting={createMutation.loading || updateMutation.loading}
        title={modalState.employeeId ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        includeStatus={Boolean(modalState.employeeId)}
      />
    </div>
  );
}
