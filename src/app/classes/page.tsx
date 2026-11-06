'use client';
import type { DiscountPeriod } from '@/lib/api/types';

import { useEffect, useMemo, useState } from 'react';
import { Edit2, FileText, Loader2, PauseCircle, PlayCircle, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AddClassModal } from '@/components/features/classes/AddClassModal';
import { notifyCourseLifecycle, useCourseLifecycle } from '@/components/features/classes/CourseLifecycle';
import {
  COURSE_FORMATS,
  COURSE_STATUSES,
  COURSE_TYPES,
} from '@/constants/class';
import {
  coursesService,
  roomsService,
  settingsService,
  staffService,
  studentsService,
  type CourseDto,
  type CourseStatus,
  type CreateCourseRequest,
  type UpdateCourseRequest,
} from '@/lib/api';
import { studentPaymentsService } from '@/lib/api/finance';
import { useApi, useMutation } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { formatFullName } from '@/lib/utils';
import { ExportExcelButton } from '@/components/analytics/ExportExcelButton';
import { fetchAllPages, type ExcelSheet } from '@/lib/excel-export';
import { describeFilters } from '@/lib/excel-crm';
import type { CourseFilters, CourseFormValues, CourseListItem } from '@/types/class';
import { useUrlFilters } from '@/hooks/useUrlState';

type CourseSavePayload = CreateCourseRequest & { status?: CourseStatus };

function toFormValues(course: CourseListItem): CourseFormValues {
  return {
    type: course.type,
    format: course.format,
    name: course.name,
    description: course.description,
    basePrice: course.basePrice == null ? '' : String(course.basePrice),
    totalLessons: course.totalLessons == null ? '' : String(course.totalLessons),
    levelId: course.levelId || '00000000-0000-0000-0000-000000000101',
    enrollmentLimit: course.enrollmentLimit ? String(course.enrollmentLimit) : '',
    color: course.color,
    status: course.status,
    teacherId: course.teacherId || '',
    teacherIds: course.teacherIds,
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
  return formatFullName(staff);
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
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ')
    || student.fullName?.trim()
    || '';
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
    totalLessons: course.totalLessons,
    levelId: course.levelId,
    levelName: course.levelName,
    enrollmentLimit: course.enrollmentLimit,
    color: course.color || '#ffffff',
    status: course.status,
    teacherId: course.teacherId,
    teacherName: (course.teacherIds ?? (course.teacherId ? [course.teacherId] : [])).map((id) => teacherMap.get(id) || '—').join(', ') || '—',
    teacherIds: course.teacherIds ?? (course.teacherId ? [course.teacherId] : []),
    teacherNames: (course.teacherIds ?? (course.teacherId ? [course.teacherId] : [])).map((id) => teacherMap.get(id) || '—'),
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
    totalLessons: payload.totalLessons !== undefined ? payload.totalLessons : course.totalLessons,
    levelId: payload.levelId ?? course.levelId,
    levelName: payload.levelId !== course.levelId ? course.levelName : course.levelName,
    enrollmentLimit:
      payload.enrollmentLimit !== undefined ? payload.enrollmentLimit : course.enrollmentLimit,
    color: payload.color !== undefined ? payload.color ?? null : course.color,
    teacherId: payload.teacherId !== undefined ? payload.teacherId ?? null : course.teacherId,
    teacherIds: payload.teacherIds ?? course.teacherIds,
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

  const [filters, setFilters] = useUrlFilters<CourseFilters>({
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

  const { roles, permissions, user } = useAuthStore();
  const isTeacher = roles.includes('TEACHER');
  const canViewStaff = roles.includes('TENANT_ADMIN') || permissions.includes('STAFF_VIEW');

  const { data: teachersData, loading: teachersLoading } = useApi(
    () => (canViewStaff ? staffService.getTeachers({ page: 0, size: 300 }) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 300 })),
    [canViewStaff]
  );
  const { data: roomsData, loading: roomsLoading } = useApi(
    () => roomsService.getAll({ page: 0, size: 300 }),
    []
  );
  const { data: studentsData, loading: studentsLoading } = useApi(
    () => isTeacher
      ? Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 1000 } })
      : studentsService.getAll({ page: 0, size: 1000 }),
    [isTeacher]
  );
  const { data: levelsData, loading: levelsLoading } = useApi(() => settingsService.getCourseLevels(), []);

  const createMutation = useMutation((data: CreateCourseRequest) => coursesService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateCourseRequest }) =>
    coursesService.update(id, data)
  );

  const isLoading = coursesLoading || teachersLoading || roomsLoading || studentsLoading || levelsLoading;
  const isSaving = createMutation.loading || updateMutation.loading;

  const teacherMap = useMemo(
    () => {
      const map = new Map((teachersData?.content ?? []).map((teacher) => [teacher.id, getStaffFullName(teacher) || '—']));
      if (isTeacher && user?.staffId) {
        map.set(user.staffId, [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email);
      }
      return map;
    },
    [isTeacher, teachersData, user]
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

      if (filters.teacherId !== 'all' && !course.teacherIds.includes(filters.teacherId)) {
        return false;
      }

      return true;
    });
  }, [courses, filters.format, filters.search, filters.status, filters.teacherId, filters.type]);

  const teacherOptions = useMemo(
    () =>
      (teachersData?.content ?? [])
        .map((teacher) => ({ id: teacher.id, name: getStaffFullName(teacher) || 'Без имени' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [teachersData]
  );
  const roomOptions = useMemo(
    () => (roomsData?.content ?? []).map((room) => ({ id: room.id, name: room.name })),
    [roomsData]
  );
  // Picker for enrolling students: soft-deleted students cannot be added.
  const studentOptions = useMemo(
    () =>
      (studentsData?.content ?? []).filter((student) => !student.deleted).map((student) => ({
        id: student.id,
        name: getStudentFullName(student) || student.fullName || 'Без имени',
      })),
    [studentsData]
  );
  const levelOptions = useMemo(
    () => (levelsData ?? []).map((level) => ({ id: level.id, name: level.name, active: level.active })),
    [levelsData]
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

  const handleSaveCourse = async (
    data: CourseSavePayload,
    studentDiscounts?: Record<string, number>,
    studentDiscountPeriods?: Record<string, DiscountPeriod>
  ) => {
    let savedCourse: CourseDto;

    if (modalState.courseId) {
      savedCourse = await updateMutation.mutate({
        id: modalState.courseId,
        data,
      });
      // ARCHIVED/INACTIVE -> ACTIVE restores students and subscriptions on the backend.
      notifyCourseLifecycle(savedCourse);
    } else {
      savedCourse = await createMutation.mutate({
        type: data.type,
        format: data.format,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        totalLessons: data.totalLessons,
        levelId: data.levelId,
        enrollmentLimit: data.enrollmentLimit,
        color: data.color,
        teacherId: data.teacherId,
        teacherIds: data.teacherIds,
        roomId: data.roomId,
        studentIds: data.studentIds,
      });
    }

    if (studentDiscounts && Object.keys(studentDiscounts).length > 0) {
      await Promise.all(
        Object.entries(studentDiscounts).map(async ([studentId, discount]) => {
          if (discount > 0) {
            await studentPaymentsService
              .updateSubscriptionDiscount(studentId, savedCourse.id, discount, undefined, undefined, studentDiscountPeriods?.[studentId])
              .catch(() => {});
          }
        })
      );
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

  const courseLifecycle = useCourseLifecycle(async () => {
    setSelectedCourse(null);
    await refetch();
  });

  const handleDeleteCourse = async (course?: CourseListItem | null) => {
    const target = course ?? selectedCourse;
    if (!target) {
      return;
    }
    await courseLifecycle.requestDelete({ id: target.id, name: target.name });
  };

  // «Скачать в Excel»: the courses/groups list with the current filters (the page already loads all of them).
  const buildCoursesExcel = async (): Promise<ExcelSheet[]> => {
    let studentNames = new Map<string, string>();
    if (!isTeacher) {
      const students = await fetchAllPages((pageNum, size) => studentsService.getAll({ page: pageNum, size })).catch(() => []);
      studentNames = new Map(students.map((student) => [student.id, getStudentFullName(student) || student.fullName || '']));
    }
    const label = <T extends string>(options: { value: T; label: string }[], value: T) =>
      options.find((option) => option.value === value)?.label ?? value;

    return [
      {
        name: 'Курсы и группы',
        tables: [{
          columns: [
            { header: '№', type: 'number' },
            { header: 'Курс' },
            { header: 'Описание' },
            { header: 'Тип' },
            { header: 'Формат' },
            { header: 'Уровень' },
            { header: 'Цена, ₸', type: 'money' },
            { header: 'Занятий в абонементе', type: 'number' },
            { header: 'Преподаватели' },
            { header: 'Кабинет' },
            { header: 'Учеников', type: 'number' },
            { header: 'Лимит', type: 'number' },
            { header: 'Статус' },
            { header: 'Создан', type: 'date' },
          ],
          rows: filteredCourses.map((course, index) => [
            index + 1,
            course.name,
            course.description,
            label(COURSE_TYPES, course.type),
            label(COURSE_FORMATS, course.format),
            course.levelName,
            course.basePrice,
            course.totalLessons,
            course.teacherNames.filter(Boolean).join(', '),
            course.roomName,
            course.studentIds.length,
            course.enrollmentLimit,
            label(COURSE_STATUSES, course.status),
            course.createdAt,
          ]),
        }],
      },
      {
        name: 'Состав групп',
        tables: [{
          columns: [{ header: 'Курс' }, { header: 'Преподаватели' }, { header: 'Ученик' }],
          rows: filteredCourses.flatMap((course) =>
            course.studentIds.map((studentId, index) => [
              course.name,
              course.teacherNames.filter(Boolean).join(', '),
              studentNames.get(studentId) || course.studentNames[index] || studentId,
            ])
          ),
        }],
      },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <ExportExcelButton
          page="courses"
          filePrefix=""
          reportTitle="Курсы и группы"
          note={describeFilters([
            filters.type !== 'all' && `тип «${COURSE_TYPES.find((item) => item.value === filters.type)?.label ?? filters.type}»`,
            filters.format !== 'all' && `формат «${COURSE_FORMATS.find((item) => item.value === filters.format)?.label ?? filters.format}»`,
            filters.status !== 'all' && `статус «${COURSE_STATUSES.find((item) => item.value === filters.status)?.label ?? filters.status}»`,
            filters.teacherId !== 'all' && `преподаватель «${teacherMap.get(filters.teacherId) ?? ''}»`,
            filters.search.trim() && `поиск «${filters.search.trim()}»`,
          ])}
          buildSnapshot={buildCoursesExcel}
          disabled={isLoading}
        />
        {!isTeacher ? (
          <Button icon={Plus} onClick={openCreateModal}>
            Добавить курс
          </Button>
        ) : null}
      </div>

      <div className="crm-surface p-6">
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${isTeacher ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
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

          {!isTeacher ? <select
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
          </select> : null}

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
                  <th className="crm-table-th">Уровень</th>
                  <th className="crm-table-th">Цена</th>
                  <th className="crm-table-th">Преподаватель</th>
                  <th className="crm-table-th">Кабинет</th>
                  <th className="crm-table-th">Ученики</th>
                  <th className="crm-table-th">Лимит</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">{isTeacher ? 'Просмотр' : 'Действия'}</th>
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
                          <Link prefetch={false}
                            href={`/classes/${course.id}`}
                            className="group flex items-start gap-3 transition-colors hover:text-[#467aff]"
                          >
                            <span
                              className="mt-1 h-3 w-3 shrink-0 rounded-full border border-[#dbe2e8]"
                              style={{ backgroundColor: course.color }}
                            />
                            <div>
                              <div className="text-sm font-semibold text-[#202938] transition-colors group-hover:text-[#467aff] group-hover:underline">
                                {course.name}
                              </div>
                              <div className="mt-0.5 text-xs text-[#8690a0]">
                                {course.description || 'Описание не указано'}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="crm-table-cell">{typeConfig?.label ?? course.type}</td>
                        <td className="crm-table-cell">{formatConfig?.label ?? course.format}</td>
                        <td className="crm-table-cell">{course.levelName || '—'}</td>
                        <td className="crm-table-cell">{formatCurrency(course.basePrice)}</td>
                        <td className="crm-table-cell">
                          {course.teacherIds.length ? (
                            <div className="flex flex-wrap gap-x-1 gap-y-1">
                              {course.teacherIds.map((teacherId, teacherIndex) => (
                                <span key={teacherId}>
                                  {teacherIndex > 0 ? <span className="text-[#8b95a4]">, </span> : null}
                                  <Link prefetch={false} href={`/staff/${teacherId}`} className="text-[#273142] hover:text-[#467aff] hover:underline">
                                    {course.teacherNames[teacherIndex] || 'Преподаватель'}
                                  </Link>
                                </span>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="crm-table-cell">{course.roomName}</td>
                        <td className="crm-table-cell">
                          {course.studentIds.length > 0 ? (
                            <Link prefetch={false}
                              href={`/classes/${course.id}`}
                              className="font-semibold text-[#467aff] hover:underline"
                            >
                              {course.studentIds.length}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="crm-table-cell">{course.enrollmentLimit ?? '—'}</td>
                        <td className="crm-table-cell">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusConfig?.color ?? ''}`}>
                            {statusConfig?.label ?? course.status}
                          </span>
                        </td>
                        <td className="crm-table-cell">
                          <div className="flex items-center gap-2">
                            <Link prefetch={false}
                              href={`/classes/${course.id}`}
                              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                              title="Карточка курса"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            {!isTeacher ? <button
                              onClick={() => void openEditModal(course)}
                              className="rounded-lg p-2 text-[#12998f] transition-colors hover:bg-[#eaf9f7]"
                              title="Редактировать"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button> : null}
                            {!isTeacher && course.status === 'ACTIVE' ? <button
                              onClick={() => courseLifecycle.requestStop({ id: course.id, name: course.name })}
                              className="rounded-lg p-2 text-[#b7791f] transition-colors hover:bg-[#fff8eb]"
                              title="Остановить курс"
                            >
                              <PauseCircle className="h-4 w-4" />
                            </button> : null}
                            {!isTeacher && course.status !== 'ACTIVE' ? <button
                              onClick={() => courseLifecycle.requestResume({ id: course.id, name: course.name })}
                              className="rounded-lg p-2 text-[#12998f] transition-colors hover:bg-[#eaf9f7]"
                              title="Возобновить"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </button> : null}
                            {!isTeacher ? <button
                              onClick={() => handleDeleteCourse(course)}
                              disabled={courseLifecycle.busy}
                              className="rounded-lg p-2 text-[#c34c4c] transition-colors hover:bg-[#fff1f1]"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={12} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Курсы не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isTeacher ? <AddClassModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveCourse}
        teachers={teacherOptions}
        rooms={roomOptions}
        students={studentOptions}
        levels={levelOptions}
        initialValues={modalState.initialValues}
        isSubmitting={isSaving}
        title={modalState.courseId ? 'Редактировать курс' : 'Добавить курс'}
        includeStatus={Boolean(modalState.courseId)}
      /> : null}
      {!isTeacher ? courseLifecycle.dialogs : null}
    </div>
  );
}
