'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit2, FileText, Loader2, PlusCircle, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AddClassModal } from '@/components/features/classes/AddClassModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  coursesService,
  roomsService,
  staffService,
  studentsService,
  type CourseDto,
  type CourseStatus,
  type RoomDto,
  type StaffDto,
  type StudentDto,
} from '@/lib/api';
import { COURSE_FORMATS, COURSE_STATUSES, COURSE_TYPES } from '@/constants/class';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type { CourseFormValues } from '@/types/class';

type ClassDetailsData = {
  course: CourseDto;
  teacher: StaffDto | null;
  room: RoomDto | null;
  students: StudentDto[];
  allStudents: StudentDto[];
};

function getStaffFullName(staff: StaffDto | null): string {
  if (!staff) {
    return '—';
  }

  if (staff.fullName?.trim()) {
    return staff.fullName.trim();
  }

  return [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ') || '—';
}

function getStudentFullName(student: StudentDto): string {
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim() || 'Без имени';
}

function getStudentPrimaryContact(student: StudentDto): string {
  return student.phone || student.studentPhone || student.parentPhone || student.additionalPhones?.[0] || '—';
}

function formatMoney(value: number | null): string {
  if (value == null) {
    return '—';
  }

  return `${value.toLocaleString('ru-RU')} ₸`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toEditFormValues(course: CourseDto): CourseFormValues {
  return {
    type: course.type,
    format: course.format,
    name: course.name,
    description: course.description || '',
    basePrice: course.basePrice == null ? '' : String(course.basePrice),
    enrollmentLimit: course.enrollmentLimit ? String(course.enrollmentLimit) : '',
    color: course.color || '#ffffff',
    status: course.status,
    teacherId: course.teacherId || '',
    roomId: course.roomId || '',
    studentIds: course.studentIds ?? [],
  };
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classIdParam = params.classId;
  const classId = Array.isArray(classIdParam) ? classIdParam[0] : classIdParam;
  const [studentSearch, setStudentSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentsPage, setStudentsPage] = useState(1);

  const { data, loading, error, refetch } = useApi<ClassDetailsData | null>(async () => {
    if (!classId) {
      return { data: null };
    }

    let course: CourseDto | null = null;

    try {
      course = (await coursesService.getById(classId)).data;
    } catch {
      // Fallback for inconsistent teacher references on backend
      const coursesPage = await coursesService.getAll({ page: 0, size: 2000 }).catch(() => null);
      course = (coursesPage?.data.content ?? []).find((item) => item.id === classId) ?? null;
    }

    if (!course) {
      return { data: null };
    }

    const [teacherResult, roomResult, studentsPage] = await Promise.all([
      course.teacherId ? staffService.getById(course.teacherId).catch(() => null) : Promise.resolve(null),
      course.roomId ? roomsService.getById(course.roomId).catch(() => null) : Promise.resolve(null),
      studentsService.getAll({ page: 0, size: 2000 }).catch(() => null),
    ]);

    const allStudents = (studentsPage?.data.content ?? []).slice();
    const studentIds = new Set(course.studentIds ?? []);
    const students = allStudents
      .filter((student) => studentIds.has(student.id))
      .sort((left, right) => getStudentFullName(left).localeCompare(getStudentFullName(right), 'ru'));

    return {
      data: {
        course,
        teacher: teacherResult?.data ?? null,
        room: roomResult?.data ?? null,
        students,
        allStudents,
      },
    };
  }, [classId]);

  const addStudentMutation = useMutation(({ id, studentIds }: { id: string; studentIds: string[] }) =>
    coursesService.update(id, { studentIds })
  );
  const updateCourseMutation = useMutation(({ id, data }: { id: string; data: CourseDto & { status?: CourseStatus } }) =>
    coursesService.update(id, {
      type: data.type,
      format: data.format,
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      enrollmentLimit: data.enrollmentLimit,
      color: data.color,
      status: data.status,
      teacherId: data.teacherId,
      roomId: data.roomId,
      studentIds: data.studentIds,
    })
  );
  const deleteCourseMutation = useMutation((id: string) => coursesService.delete(id));

  const { data: teachersData } = useApi(() => staffService.getTeachers({ page: 0, size: 300 }), []);
  const { data: roomsData } = useApi(() => roomsService.getAll({ page: 0, size: 300 }), []);

  const course = data?.course ?? null;
  const teacher = data?.teacher ?? null;
  const room = data?.room ?? null;
  const students = data?.students ?? [];
  const allStudents = data?.allStudents ?? [];

  const typeLabel = course ? COURSE_TYPES.find((item) => item.value === course.type)?.label ?? course.type : '—';
  const formatLabel = course ? COURSE_FORMATS.find((item) => item.value === course.format)?.label ?? course.format : '—';
  const statusConfig = course ? COURSE_STATUSES.find((item) => item.value === course.status) : undefined;

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const name = getStudentFullName(student).toLowerCase();
      const phone = getStudentPrimaryContact(student).toLowerCase();
      return name.includes(query) || phone.includes(query) || student.id.toLowerCase().includes(query);
    });
  }, [studentSearch, students]);

  useEffect(() => {
    setStudentsPage(1);
  }, [studentSearch, students.length]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / 10));
  const currentStudentsPage = Math.min(studentsPage, totalStudentPages);
  const visibleStudents = useMemo(() => {
    const startIndex = (currentStudentsPage - 1) * 10;
    return filteredStudents.slice(startIndex, startIndex + 10);
  }, [currentStudentsPage, filteredStudents]);

  const availableStudents = useMemo(() => {
    const existingIds = new Set(course?.studentIds ?? []);
    const query = addSearch.trim().toLowerCase();

    return allStudents
      .filter((student) => !existingIds.has(student.id))
      .filter((student) => {
        if (!query) {
          return true;
        }
        const name = getStudentFullName(student).toLowerCase();
        const phone = getStudentPrimaryContact(student).toLowerCase();
        return name.includes(query) || phone.includes(query) || student.id.toLowerCase().includes(query);
      })
      .sort((left, right) => getStudentFullName(left).localeCompare(getStudentFullName(right), 'ru'));
  }, [addSearch, allStudents, course?.studentIds]);

  const teacherOptions = useMemo(
    () => (teachersData?.content ?? []).map((teacherItem) => ({ id: teacherItem.id, name: getStaffFullName(teacherItem) || 'Без имени' })),
    [teachersData]
  );
  const roomOptions = useMemo(
    () => (roomsData?.content ?? []).map((roomItem) => ({ id: roomItem.id, name: roomItem.name })),
    [roomsData]
  );
  const studentOptions = useMemo(
    () => allStudents.map((studentItem) => ({ id: studentItem.id, name: getStudentFullName(studentItem) })),
    [allStudents]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/classes')}>
          Назад к курсам
        </Button>
        <div className="crm-surface flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/classes')}>
          Назад к курсам
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">
          {error || 'Курс не найден'}
        </div>
      </div>
    );
  }

  const handleAddStudent = async () => {
    if (!selectedStudentId || !course) {
      return;
    }

    const nextIds = Array.from(new Set([...(course.studentIds ?? []), selectedStudentId]));
    await addStudentMutation.mutate({ id: course.id, studentIds: nextIds });
    setAddModalOpen(false);
    setSelectedStudentId(null);
    setAddSearch('');
    await refetch();
  };

  const handleDeleteCourse = async () => {
    if (!course) {
      return;
    }

    if (!confirm('Вы уверены, что хотите удалить курс?')) {
      return;
    }

    await deleteCourseMutation.mutate(course.id);
    router.push('/classes');
  };

  const handleEditCourse = async (payload: Omit<CourseDto, 'id' | 'createdAt' | 'updatedAt'> & { status?: CourseStatus }) => {
    if (!course) {
      return;
    }

    await updateCourseMutation.mutate({
      id: course.id,
      data: {
        ...course,
        ...payload,
      },
    });

    setEditModalOpen(false);
    await refetch();
  };

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/classes')}>
        Назад к курсам
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: course.color || '#dbe2e8' }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-[#1f2530]">{course.name}</h2>
              <p className="mt-1 truncate text-sm text-[#7f8794]">{course.description || 'Описание не указано'}</p>
            </div>
          </div>

          <div className="flex min-w-fit flex-col items-end gap-2 max-sm:w-full max-sm:items-start">
            <div className="flex flex-wrap items-center justify-end gap-2 max-sm:justify-start">
              <span className="rounded-lg bg-[#eaf5ff] px-3 py-1 text-xs font-semibold text-[#2a6cc8]">
                {typeLabel}
              </span>
              <span
                className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                  statusConfig?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {statusConfig?.label ?? '—'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 max-sm:justify-start">
              <Button
                variant="outline"
                icon={Edit2}
                onClick={() => setEditModalOpen(true)}
              >
                Редактировать
              </Button>
              <Button icon={PlusCircle} onClick={() => setAddModalOpen(true)}>
                Добавить ученика
              </Button>
              <Button
                variant="outline"
                icon={Trash2}
                onClick={() => void handleDeleteCourse()}
                disabled={deleteCourseMutation.loading}
                className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Преподаватель</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{getStaffFullName(teacher)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Кабинет</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{room?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Формат</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{formatLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Базовая цена</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{formatMoney(course.basePrice)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Лимит учеников</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">
              {course.enrollmentLimit != null ? `${course.enrollmentLimit}/${students.length}` : `—/${students.length}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Создан</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{formatDateTime(course.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Обновлен</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{formatDateTime(course.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-700">
              Найдено участников: <span className="font-semibold text-gray-900">{filteredStudents.length}</span>
            </p>

            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a94a3]" />
              <input
                type="text"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Поиск по ученику, телефону или ID"
                className="crm-input crm-input-with-icon"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">#</th>
                <th className="crm-table-th">Ученик</th>
                <th className="crm-table-th">Контакт</th>
                <th className="crm-table-th">Статус</th>
                <th className="crm-table-th">Действия</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {visibleStudents.length > 0 ? (
                visibleStudents.map((student, index) => (
                  <tr key={student.id} className="crm-table-row">
                    <td className="crm-table-cell">{(currentStudentsPage - 1) * 10 + index + 1}</td>
                    <td className="crm-table-cell">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-[#273142]">{getStudentFullName(student)}</div>
                        <div className="text-xs text-[#8a93a3]">ID: {student.id}</div>
                      </div>
                    </td>
                    <td className="crm-table-cell">{getStudentPrimaryContact(student)}</td>
                    <td className="crm-table-cell">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_STATUS_COLORS[student.status]}`}>
                        {STUDENT_STATUS_LABELS[student.status]}
                      </span>
                    </td>
                    <td className="crm-table-cell">
                      <Link
                        href={`/students/${student.id}`}
                        className="inline-flex rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                        title="Карточка ученика"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="crm-table-row">
                  <td colSpan={5} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                    Участники не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ebf0] px-6 py-4">
          <p className="text-sm text-[#7f8794]">
            Страница <span className="font-semibold text-[#1f2530]">{currentStudentsPage}</span> из{' '}
            <span className="font-semibold text-[#1f2530]">{totalStudentPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStudentsPage((prev) => Math.max(1, prev - 1))}
              disabled={currentStudentsPage <= 1}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStudentsPage((prev) => Math.min(totalStudentPages, prev + 1))}
              disabled={currentStudentsPage >= totalStudentPages}
            >
              Вперед
            </Button>
          </div>
        </div>
      </div>

      <AddClassModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditCourse}
        teachers={teacherOptions}
        rooms={roomOptions}
        students={studentOptions}
        initialValues={course ? toEditFormValues(course) : undefined}
        isSubmitting={updateCourseMutation.loading}
        title="Редактировать курс"
        includeStatus
      />

      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedStudentId(null);
          setAddSearch('');
        }}
        title="Добавить ученика в курс"
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setAddModalOpen(false);
                setSelectedStudentId(null);
                setAddSearch('');
              }}
              disabled={addStudentMutation.loading}
            >
              Отмена
            </Button>
            <Button
              onClick={() => void handleAddStudent()}
              disabled={!selectedStudentId || addStudentMutation.loading}
            >
              {addStudentMutation.loading ? 'Добавляем...' : 'Добавить'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a94a3]" />
            <input
              type="text"
              value={addSearch}
              onChange={(event) => setAddSearch(event.target.value)}
              placeholder="Поиск ученика"
              className="crm-input crm-input-with-icon"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-[#dbe2e8]">
            {availableStudents.length > 0 ? (
              availableStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-[#eef2f6] px-3 py-2 text-left last:border-b-0 ${
                    selectedStudentId === student.id ? 'bg-[#edf3ff]' : 'hover:bg-[#f8fbfd]'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-[#1f2530]">{getStudentFullName(student)}</div>
                    <div className="text-xs text-[#8a94a3]">{getStudentPrimaryContact(student)}</div>
                  </div>
                  <span className="text-xs text-[#8a94a3]">{student.id.slice(0, 8)}...</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-[#8a93a3]">
                Нет доступных учеников для добавления
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
