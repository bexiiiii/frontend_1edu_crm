'use client';

import { useMemo, useState } from 'react';
import { Edit2, Eye, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddStudentModal } from '@/components/features/students/AddStudentModal';
import { StudentDetailModal } from '@/components/features/students/StudentDetailModal';
import {
  STUDENT_GENDER_LABELS,
  STUDENT_STATUS_COLORS,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_OPTIONS,
} from '@/constants/student';
import { studentsService, type CreateStudentRequest, type UpdateStudentRequest } from '@/lib/api';
import { useApi, useMutation, usePaginatedApi } from '@/hooks/useApi';
import type { StudentFilters, StudentFormValues, StudentListItem } from '@/types/student';

function toFormValues(student: StudentListItem): StudentFormValues {
  return {
    fullName: student.fullName,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName,
    customer: student.customer,
    studentPhoto: student.studentPhoto,
    email: student.email,
    phone: student.phone,
    studentPhone: student.studentPhone,
    birthDate: student.birthDate,
    gender: student.gender,
    status: student.status,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    address: student.address,
    city: student.city,
    school: student.school,
    grade: student.grade,
    additionalInfo: student.additionalInfo,
    contract: student.contract,
    discount: student.discount,
    comment: student.comment,
    stateOrderParticipant: student.stateOrderParticipant,
    loyalty: student.loyalty,
    additionalPhones: student.additionalPhones.join(', '),
    notes: student.notes,
  };
}

function formatDate(value: string): string {
  if (!value) {
    return '—';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
}

function getDisplayName(student: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim();
}

export default function Students() {
  const [filters, setFilters] = useState<StudentFilters>({
    search: '',
    status: 'all',
  });
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    studentId: string | null;
    initialValues?: StudentFormValues;
  }>({
    key: 0,
    isOpen: false,
    studentId: null,
  });

  const {
    data: studentItems,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    setPage,
    refetch,
  } = usePaginatedApi(
    (pageNum, size) => {
      const query = filters.search.trim();
      const status = filters.status !== 'all' ? filters.status : undefined;

      if (query) {
        return studentsService.search({ query, page: pageNum, size });
      }

      return studentsService.getAll({
        page: pageNum,
        size,
        status,
      });
    },
    0,
    20,
    [filters.search, filters.status]
  );

  const { data: statsData } = useApi(() => studentsService.getStats(), []);

  const createMutation = useMutation((data: CreateStudentRequest) => studentsService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateStudentRequest }) =>
    studentsService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => studentsService.delete(id));

  const students = useMemo<StudentListItem[]>(
    () =>
      studentItems
        .map((student) => ({
          id: student.id,
          fullName: getDisplayName(student),
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          middleName: student.middleName || '',
          customer: student.customer || '',
          studentPhoto: student.studentPhoto || '',
          email: student.email || '',
          phone: student.phone || '',
          studentPhone: student.studentPhone || '',
          birthDate: student.birthDate || '',
          gender: student.gender || '',
          status: student.status,
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          address: student.address || '',
          city: student.city || '',
          school: student.school || '',
          grade: student.grade || '',
          additionalInfo: student.additionalInfo || '',
          contract: student.contract || '',
          discount: student.discount || '',
          comment: student.comment || '',
          stateOrderParticipant: Boolean(student.stateOrderParticipant),
          loyalty: student.loyalty || '',
          additionalPhones: student.additionalPhones || [],
          notes: student.notes || '',
          createdAt: student.createdAt || '',
          updatedAt: student.updatedAt || '',
        }))
        .filter((student) => (filters.status === 'all' ? true : student.status === filters.status)),
    [filters.status, studentItems]
  );

  const summary = useMemo(
    () => ({
      total: filters.search.trim() || filters.status !== 'all' ? totalElements : statsData?.totalStudents ?? totalElements,
      active:
        filters.search.trim() || filters.status !== 'all'
          ? students.filter((student) => student.status === 'ACTIVE').length
          : statsData?.activeStudents ?? students.filter((student) => student.status === 'ACTIVE').length,
    }),
    [filters.search, filters.status, statsData, students, totalElements]
  );

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      studentId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = () => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      studentId: null,
      initialValues: undefined,
    }));
  };

  const openEditModal = (student: StudentListItem) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(false);
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      studentId: student.id,
      initialValues: toFormValues(student),
    }));
  };

  const handleViewStudent = (student: StudentListItem) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const handleSaveStudent = async (data: CreateStudentRequest | UpdateStudentRequest) => {
    if (modalState.studentId) {
      await updateMutation.mutate({
        id: modalState.studentId,
        data: data as UpdateStudentRequest,
      });
    } else {
      await createMutation.mutate(data as CreateStudentRequest);
    }

    closeModal();
    await refetch();
  };

  const handleDeleteStudent = async (student?: StudentListItem | null) => {
    const target = student ?? selectedStudent;
    if (!target || !confirm('Вы уверены, что хотите удалить ученика?')) {
      return;
    }

    await deleteMutation.mutate(target.id);
    setIsDetailModalOpen(false);
    setSelectedStudent(null);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить ученика
        </Button>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону, email"
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
                status: event.target.value as StudentFilters['status'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            {STUDENT_STATUS_OPTIONS.map((option) => (
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
            Всего учеников: <span className="font-semibold text-gray-900">{summary.total}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Активных: <span className="font-semibold text-gray-900">{summary.active}</span>
          </p>
        </div>

        {error ? (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Ученик</th>
                  <th className="crm-table-th">Контакты</th>
                  <th className="crm-table-th">Заказчик / родитель</th>
                  <th className="crm-table-th">Школа</th>
                  <th className="crm-table-th">Лояльность</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <tr key={student.id} className="crm-table-row">
                      <td className="crm-table-cell">{page * 20 + index + 1}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {student.gender ? STUDENT_GENDER_LABELS[student.gender] : 'Пол не указан'}
                          {student.birthDate ? ` • ${formatDate(student.birthDate)}` : ''}
                          {student.city ? ` • ${student.city}` : ''}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{student.phone || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {student.studentPhone || student.email || 'Контакты не указаны'}
                        </div>
                        {student.additionalPhones.length > 0 ? (
                          <div className="mt-1 text-xs text-gray-500">
                            {student.additionalPhones.join(', ')}
                          </div>
                        ) : null}
                      </td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{student.customer || student.parentName || '—'}</div>
                        <div className="text-xs text-gray-500">{student.parentPhone || '—'}</div>
                      </td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{student.school || '—'}</div>
                        <div className="text-xs text-gray-500">{student.grade || student.address || '—'}</div>
                      </td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-gray-900">{student.loyalty || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {student.discount ? `Скидка: ${student.discount}` : 'Без скидки'}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_STATUS_COLORS[student.status]}`}
                        >
                          {STUDENT_STATUS_LABELS[student.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewStudent(student)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDeleteStudent(student)}
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
                    <td colSpan={8} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Ученики не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[#e6ebf0] px-6 py-4">
            <p className="text-sm text-gray-500">
              Страница {page + 1} из {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Назад
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page + 1 >= totalPages}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Вперёд
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AddStudentModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveStudent}
        initialValues={modalState.initialValues}
        isSubmitting={createMutation.loading || updateMutation.loading}
        title={modalState.studentId ? 'Редактировать ученика' : 'Добавить ученика'}
        includeStatus={Boolean(modalState.studentId)}
      />

      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedStudent}
        onEdit={() => {
          if (selectedStudent) {
            openEditModal(selectedStudent);
          }
        }}
        onDelete={() => void handleDeleteStudent()}
        isMutating={deleteMutation.loading}
      />
    </div>
  );
}
