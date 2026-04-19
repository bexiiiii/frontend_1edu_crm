'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit2, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AddClassModal } from '@/components/features/classes/AddClassModal';
import {
  COURSE_FORMATS,
  COURSE_STATUSES,
  COURSE_TYPES,
} from '@/constants/class';
import {
  coursesService,
  roomsService,
  staffService,
  studentsService,
  type CourseDto,
  type CourseStatus,
  type CreateCourseRequest,
  type UpdateCourseRequest,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { CourseFilters, CourseFormValues, CourseListItem } from '@/types/class';

type CourseSavePayload = CreateCourseRequest & { status?: CourseStatus };

function toFormValues(course: CourseListItem): CourseFormValues {
  return {
    type: course.type,
    format: course.format,
    name: course.name,
    description: course.description,
    basePrice: course.basePrice == null ? '' : String(course.basePrice),
    enrollmentLimit: course.enrollmentLimit ? String(course.enrollmentLimit) : '',
    color: course.color,
    status: course.status,
    teacherId: course.teacherId || '',
    roomId: course.roomId || '',
    studentIds: course.studentIds,
  };
}

function getStaffFullName(staff: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  if (staff.fullName?.trim()) {
    return staff.fullName.trim();
  }

  return [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ');
}

function formatCurrency(value: number | null): string {
  if (value == null) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU').format(value);
}

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

function toCourseListItem(
  course: CourseDto,
  teacherMap: Map<string, string>,
  roomMap: Map<string, string>,
  studentMap: Map<string, string>
): CourseListItem {
  return {
    id: course.id,
    type: course.type,
    format: course.format,
    name: course.name,
    description: course.description || '',
    basePrice: course.basePrice,
    enrollmentLimit: course.enrollmentLimit,
    color: course.color || '#ffffff',
    status: course.status,
    teacherId: course.teacherId,
    teacherName: course.teacherId ? teacherMap.get(course.teacherId) || '—' : '—',
    roomId: course.roomId,
    roomName: course.roomId ? roomMap.get(course.roomId) || '—' : '—',
    studentIds: course.studentIds ?? [],
    studentNames: (course.studentIds ?? []).map((studentId) => studentMap.get(studentId) || studentId),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function applyCoursePayload(course: CourseDto, payload: CourseSavePayload): CourseDto {
  return {
    ...course,
    type: payload.type ?? course.type,
    format: payload.format ?? course.format,
    name: payload.name ?? course.name,
    description: payload.description !== undefined ? payload.description ?? null : course.description,
    basePrice: payload.basePrice ?? course.basePrice,
    enrollmentLimit:
      payload.enrollmentLimit !== undefined ? payload.enrollmentLimit : course.enrollmentLimit,
    color: payload.color !== undefined ? payload.color ?? null : course.color,
    teacherId: payload.teacherId !== undefined ? payload.teacherId ?? null : course.teacherId,
    roomId: payload.roomId !== undefined ? payload.roomId ?? null : course.roomId,
    studentIds: payload.studentIds ?? course.studentIds,
    status: payload.status ?? course.status,
  };
}

export default function Classes() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editCourseIdFromQuery = searchParams.get('editCourseId');

  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null);
  const [courseOverrides, setCourseOverrides] = useState<Record<string, CourseDto>>({});
  const [handledEditCourseId, setHandledEditCourseId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    courseId: string | null;
    initialValues?: CourseFormValues;
  }>({
    key: 0,
    isOpen: false,
    courseId: null,
  });

  const [filters, setFilters] = useState<CourseFilters>({
    search: '',
    type: 'all',
    format: 'all',
    status: 'all',
    teacherId: 'all',
  });

  const {
    data: coursesPage,
    loading: coursesLoading,
    error: coursesError,
    refetch,
  } = useApi(() => {
    const query = filters.search.trim();
    const teacherId = filters.teacherId !== 'all' ? filters.teacherId : undefined;

    if (query) {
      return coursesService.search(query, { page: 0, size: 1000 });
    }

    if (teacherId) {
      return coursesService.getByTeacher(teacherId, { page: 0, size: 1000 });
    }

    return coursesService.getAll({
      page: 0,
      size: 1000,
      type: filters.type !== 'all' ? filters.type : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    });
  }, [filters.search, filters.status, filters.teacherId, filters.type]);

  const { data: teachersData, loading: teachersLoading } = useApi(
    () => staffService.getTeachers({ page: 0, size: 300 }),
    []
  );
  const { data: roomsData, loading: roomsLoading } = useApi(
    () => roomsService.getAll({ page: 0, size: 300 }),
    []
  );
  const { data: studentsData, loading: studentsLoading } = useApi(
    () => studentsService.getAll({ page: 0, size: 1000 }),
    []
  );

  const createMutation = useMutation((data: CreateCourseRequest) => coursesService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateCourseRequest }) =>
    coursesService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => coursesService.delete(id));

  const isLoading = coursesLoading || teachersLoading || roomsLoading || studentsLoading;
  const isSaving = createMutation.loading || updateMutation.loading;
  const isActionMutating = deleteMutation.loading;

  const teacherMap = useMemo(
    () => new Map((teachersData?.content ?? []).map((teacher) => [teacher.id, getStaffFullName(teacher) || '—'])),
    [teachersData]
  );
  const roomMap = useMemo(
    () => new Map((roomsData?.content ?? []).map((room) => [room.id, room.name])),
    [roomsData]
  );
  const studentMap = useMemo(
    () =>
      new Map(
        (studentsData?.content ?? []).map((student) => [
          student.id,
          getStudentFullName(student) || student.fullName || '—',
        ])
      ),
    [studentsData]
  );

  const courses = useMemo<CourseListItem[]>(() => {
    const content = coursesPage?.content ?? [];

    return content.map((course) =>
      toCourseListItem(courseOverrides[course.id] ?? course, teacherMap, roomMap, studentMap)
    );
  }, [courseOverrides, coursesPage, roomMap, studentMap, teacherMap]);

  const filteredCourses = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return courses.filter((course) => {
      if (query) {
        const haystack = [course.name, course.description, course.teacherName, course.roomName]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filters.type !== 'all' && course.type !== filters.type) {
        return false;
      }

      if (filters.format !== 'all' && course.format !== filters.format) {
        return false;
      }

      if (filters.status !== 'all' && course.status !== filters.status) {
        return false;
      }

      if (filters.teacherId !== 'all' && course.teacherId !== filters.teacherId) {
        return false;
      }

      return true;
    });
  }, [courses, filters.format, filters.search, filters.status, filters.teacherId, filters.type]);

  const teacherOptions = useMemo(
    () => (teachersData?.content ?? []).map((teacher) => ({ id: teacher.id, name: getStaffFullName(teacher) || 'Без имени' })),
    [teachersData]
  );
  const roomOptions = useMemo(
    () => (roomsData?.content ?? []).map((room) => ({ id: room.id, name: room.name })),
    [roomsData]
  );
  const studentOptions = useMemo(
    () =>
      (studentsData?.content ?? []).map((student) => ({
        id: student.id,
        name: getStudentFullName(student) || student.fullName || 'Без имени',
      })),
    [studentsData]
  );

  const summary = useMemo(
    () => ({
      totalCourses: filteredCourses.length,
      activeCourses: filteredCourses.filter((course) => course.status === 'ACTIVE').length,
    }),
    [filteredCourses]
  );

  const closeModal = () => {
    setModalState((previous) => ({
      ...previous,
      isOpen: false,
      courseId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = () => {
    setModalState((previous) => ({
      key: previous.key + 1,
      isOpen: true,
      courseId: null,
      initialValues: undefined,
    }));
  };

  const openEditModal = async (course: CourseListItem) => {
    setSelectedCourse(course);

    let sourceCourse = course;

    try {
      const latestCourse = (await coursesService.getById(course.id)).data;
      setCourseOverrides((previous) => ({
        ...previous,
        [latestCourse.id]: latestCourse,
      }));
      sourceCourse = toCourseListItem(latestCourse, teacherMap, roomMap, studentMap);
    } catch {
      sourceCourse = course;
    }

    setModalState((previous) => ({
      key: previous.key + 1,
      isOpen: true,
      courseId: course.id,
      initialValues: toFormValues(sourceCourse),
    }));
  };

  useEffect(() => {
    if (!editCourseIdFromQuery || isLoading) {
      return;
    }

    if (handledEditCourseId === editCourseIdFromQuery) {
      return;
    }

    const target = courses.find((course) => course.id === editCourseIdFromQuery);
    if (!target) {
      return;
    }

    void openEditModal(target);
    setHandledEditCourseId(editCourseIdFromQuery);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('editCourseId');

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  }, [courses, editCourseIdFromQuery, handledEditCourseId, isLoading, pathname, router, searchParams]);

  const handleSaveCourse = async (data: CourseSavePayload) => {
    let savedCourse: CourseDto;

    if (modalState.courseId) {
      savedCourse = await updateMutation.mutate({
        id: modalState.courseId,
        data,
      });
    } else {
      savedCourse = await createMutation.mutate({
        type: data.type,
        format: data.format,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        enrollmentLimit: data.enrollmentLimit,
        color: data.color,
        teacherId: data.teacherId,
        roomId: data.roomId,
        studentIds: data.studentIds,
      });
    }

    let nextCourse = applyCoursePayload(savedCourse, data);

    try {
      const latestCourse = (await coursesService.getById(savedCourse.id)).data;
      nextCourse = applyCoursePayload(latestCourse, data);
      setCourseOverrides((previous) => ({
        ...previous,
        [nextCourse.id]: nextCourse,
      }));
    } catch {
      setCourseOverrides((previous) => ({
        ...previous,
        [nextCourse.id]: nextCourse,
      }));
    }

    setSelectedCourse(toCourseListItem(nextCourse, teacherMap, roomMap, studentMap));

    closeModal();
    await refetch();
  };

  const handleDeleteCourse = async (course?: CourseListItem | null) => {
    const target = course ?? selectedCourse;
    if (!target || !confirm('Вы уверены, что хотите удалить курс?')) {
      return;
    }

    await deleteMutation.mutate(target.id);
    setSelectedCourse(null);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить курс
        </Button>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию курса"
              value={filters.search}
              onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                type: event.target.value as CourseFilters['type'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все типы</option>
            {COURSE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filters.format}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                format: event.target.value as CourseFilters['format'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все форматы</option>
            {COURSE_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                status: event.target.value as CourseFilters['status'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            {COURSE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.teacherId}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                teacherId: event.target.value,
              }))
            }
            className="crm-select"
          >
            <option value="all">Все преподаватели</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-gray-700">
            Всего курсов: <span className="font-semibold text-gray-900">{summary.totalCourses}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Активных: <span className="font-semibold text-gray-900">{summary.activeCourses}</span>
          </p>
        </div>

        {coursesError ? (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {coursesError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Курс</th>
                  <th className="crm-table-th">Тип</th>
                  <th className="crm-table-th">Формат</th>
                  <th className="crm-table-th">Цена</th>
                  <th className="crm-table-th">Преподаватель</th>
                  <th className="crm-table-th">Кабинет</th>
                  <th className="crm-table-th">Ученики</th>
                  <th className="crm-table-th">Лимит</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course, index) => {
                    const typeConfig = COURSE_TYPES.find((item) => item.value === course.type);
                    const formatConfig = COURSE_FORMATS.find((item) => item.value === course.format);
                    const statusConfig = COURSE_STATUSES.find((item) => item.value === course.status);

                    return (
                      <tr key={course.id} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-1 h-3 w-3 shrink-0 rounded-full border border-[#dbe2e8]"
                              style={{ backgroundColor: course.color }}
                            />
                            <div>
                              <div className="text-sm font-semibold text-[#202938]">{course.name}</div>
                              <div className="mt-0.5 text-xs text-[#8690a0]">
                                {course.description || 'Описание не указано'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="crm-table-cell">{typeConfig?.label ?? course.type}</td>
                        <td className="crm-table-cell">{formatConfig?.label ?? course.format}</td>
                        <td className="crm-table-cell">{formatCurrency(course.basePrice)}</td>
                        <td className="crm-table-cell">{course.teacherName}</td>
                        <td className="crm-table-cell">{course.roomName}</td>
                        <td className="crm-table-cell">
                          {course.studentIds.length > 0 ? `${course.studentIds.length}` : '—'}
                        </td>
                        <td className="crm-table-cell">{course.enrollmentLimit ?? '—'}</td>
                        <td className="crm-table-cell">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusConfig?.color ?? ''}`}>
                            {statusConfig?.label ?? course.status}
                          </span>
                        </td>
                        <td className="crm-table-cell">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/classes/${course.id}`}
                              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                              title="Карточка курса"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => void openEditModal(course)}
                              className="rounded-lg p-2 text-[#12998f] transition-colors hover:bg-[#eaf9f7]"
                              title="Редактировать"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="rounded-lg p-2 text-[#c34c4c] transition-colors hover:bg-[#fff1f1]"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={11} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Курсы не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddClassModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveCourse}
        teachers={teacherOptions}
        rooms={roomOptions}
        students={studentOptions}
        initialValues={modalState.initialValues}
        isSubmitting={isSaving}
        title={modalState.courseId ? 'Редактировать курс' : 'Добавить курс'}
        includeStatus={Boolean(modalState.courseId)}
      />
    </div>
  );
}
