'use client';
import type { DiscountPeriod } from '@/lib/api/types';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Calendar, Edit2, FileText, Loader2, PauseCircle, PlayCircle, PlusCircle, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AddClassModal } from '@/components/features/classes/AddClassModal';
import { notifyCourseLifecycle, useCourseLifecycle } from '@/components/features/classes/CourseLifecycle';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/vercel-tabs';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  coursesService,
  roomsService,
  schedulesService,
  settingsService,
  staffService,
  studentsService,
  type CourseDto,
  type CourseEnrollmentDto,
  type CourseStatus,
  type CreateCourseRequest,
  type UpdateCourseRequest,
  type RoomDto,
  type ScheduleDto,
  type StaffDto,
  type StudentDto,
} from '@/lib/api';
import { studentPaymentsService } from '@/lib/api/finance';
import {
  formatScheduleDays,
  formatSchedulePeriod,
  formatScheduleTimeRange,
} from '@/lib/scheduleUtils';
import { COURSE_FORMATS, COURSE_STATUSES, COURSE_TYPES } from '@/constants/class';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type { CourseFormValues } from '@/types/class';
import { useAuthStore } from '@/store/authStore';
import { formatFullName } from '@/lib/utils';

type ClassDetailsTab = 'students' | 'schedule';

type ClassDetailsData = {
  course: CourseDto;
  teacher: StaffDto | null;
  room: RoomDto | null;
  students: StudentDto[];
  allStudents: StudentDto[];
  schedules: ScheduleDto[];
  enrollments: Record<string, CourseEnrollmentDto>;
};

const classDetailsTabs: Array<{ id: ClassDetailsTab; label: string }> = [
  { id: 'students', label: 'Ученики' },
  { id: 'schedule', label: 'Расписание' },
];

const SCHEDULE_STATUS_LABELS: Record<ScheduleDto['status'], string> = {
  ACTIVE: 'Активна',
  PAUSED: 'Пауза',
  COMPLETED: 'Завершена',
};

function getStaffFullName(staff: StaffDto | null): string {
  return formatFullName(staff) || '—';
}

function getStudentFullName(student: StudentDto): string {
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim()
    || student.fullName?.trim()
    || 'Без имени';
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toEditFormValues(course: CourseDto): CourseFormValues {
  return {
    type: course.type,
    format: course.format,
    name: course.name,
    description: course.description || '',
    basePrice: course.basePrice == null ? '' : String(course.basePrice),
    totalLessons: course.totalLessons == null ? '' : String(course.totalLessons),
    levelId: course.levelId || '00000000-0000-0000-0000-000000000101',
    enrollmentLimit: course.enrollmentLimit ? String(course.enrollmentLimit) : '',
    color: course.color || '#ffffff',
    status: course.status,
    teacherId: course.teacherId || '',
    teacherIds: course.teacherIds ?? (course.teacherId ? [course.teacherId] : []),
    roomId: course.roomId || '',
    studentIds: course.studentIds ?? [],
  };
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const { roles, setBranchId } = useAuthStore();
  const isTeacher = roles.includes('TEACHER');
  const params = useParams();
  const classIdParam = params.classId;
  const classId = Array.isArray(classIdParam) ? classIdParam[0] : classIdParam;
  const [studentSearch, setStudentSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDiscount, setStudentDiscount] = useState<number>(0);
  const [enrollmentStartDate, setEnrollmentStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentsPage, setStudentsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ClassDetailsTab>('students');
  const [enrollmentDateModal, setEnrollmentDateModal] = useState<{
    student: StudentDto;
    startDate: string;
  } | null>(null);
  // Keeps the table responsive after changing an effective start date without
  // briefly replacing the entire course page with a loading state.
  const [enrollmentStartDateOverrides, setEnrollmentStartDateOverrides] = useState<Record<string, string>>({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [targetLevelId, setTargetLevelId] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');

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

    const [teacherResult, roomResult, studentsPage, schedulesResult, enrollmentsResult] = await Promise.all([
      course.teacherId ? staffService.getById(course.teacherId).catch(() => null) : Promise.resolve(null),
      course.roomId ? roomsService.getById(course.roomId).catch(() => null) : Promise.resolve(null),
      studentsService.getAll({ page: 0, size: 2000 }).catch(() => null),
      schedulesService.getAll({ page: 0, size: 500, courseId: classId }).catch(() => null),
      coursesService.getCourseEnrollments(classId).catch(() => null),
    ]);

    const allStudents = (studentsPage?.data.content ?? []).slice();
    const studentIds = new Set(course.studentIds ?? []);
    const students = allStudents
      .filter((student) => studentIds.has(student.id))
      .sort((left, right) => getStudentFullName(left).localeCompare(getStudentFullName(right), 'ru'));

    const enrollments: Record<string, CourseEnrollmentDto> = {};
    (enrollmentsResult?.data ?? []).forEach((enrollment) => {
      if (enrollment.studentId) {
        enrollments[enrollment.studentId] = enrollment;
      }
    });

    return {
      data: {
        course,
        teacher: teacherResult?.data ?? null,
        room: roomResult?.data ?? null,
        students,
        allStudents,
        schedules: schedulesResult?.data.content ?? [],
        enrollments,
      },
    };
  }, [classId]);

  const addStudentMutation = useMutation(({ courseId: id, studentId, startDate }: { courseId: string; studentId: string; startDate: string }) =>
    coursesService.enrollStudent(id, studentId, undefined, startDate)
  );
  const removeStudentMutation = useMutation(({ courseId: id, studentId }: { courseId: string; studentId: string }) =>
    coursesService.removeStudent(id, studentId)
  );
  const updateEnrollmentDateMutation = useMutation(
    ({ courseId: id, studentId, startDate }: { courseId: string; studentId: string; startDate: string }) =>
      coursesService.updateEnrollmentDate(id, studentId, startDate)
  );
  const updateCourseMutation = useMutation(({ id, data }: { id: string; data: UpdateCourseRequest }) =>
    coursesService.update(id, data)
  );
  const transferCourseMutation = useMutation(
    ({ id, targetBranchId: branchId, targetLevelId: levelId, targetRoomId: roomId }: {
      id: string;
      targetBranchId: string;
      targetLevelId: string;
      targetRoomId?: string | null;
    }) => coursesService.transferToBranch(id, { targetBranchId: branchId, targetLevelId: levelId, targetRoomId: roomId })
  );

  const { data: teachersData } = useApi(
    () => isTeacher
      ? Promise.resolve({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 300 })
      : staffService.getTeachers({ page: 0, size: 300 }),
    [isTeacher]
  );
  const { data: roomsData } = useApi(() => roomsService.getAll({ page: 0, size: 300 }), []);
  const { data: levelsData } = useApi(() => settingsService.getCourseLevels(), []);
  const { data: branchesData } = useApi(() => settingsService.getBranches(), []);
  const { data: targetLevelsData } = useApi(
    () => targetBranchId ? settingsService.getCourseLevels(targetBranchId) : Promise.resolve({ data: [] }),
    [targetBranchId]
  );
  const { data: targetRoomsData } = useApi(
    () => targetBranchId
      ? roomsService.getAll({ page: 0, size: 300 }, targetBranchId)
      : Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 300 } }),
    [targetBranchId]
  );

  const course = data?.course ?? null;
  const courseLifecycle = useCourseLifecycle(async (_updated, deleted) => {
    if (deleted) {
      router.push('/classes');
      return;
    }
    await refetch();
  });
  const teacher = data?.teacher ?? null;
  const room = data?.room ?? null;
  const students = useMemo(() => data?.students ?? [], [data?.students]);
  const allStudents = useMemo(() => data?.allStudents ?? [], [data?.allStudents]);
  const schedules = useMemo(() => data?.schedules ?? [], [data?.schedules]);
  const transferBranches = useMemo(
    () => (branchesData ?? []).filter((branch) => branch.active && branch.id !== course?.branchId),
    [branchesData, course?.branchId]
  );
  const targetLevels = useMemo(() => targetLevelsData ?? [], [targetLevelsData]);
  const targetRooms = useMemo(() => targetRoomsData?.content ?? [], [targetRoomsData]);

  const typeLabel = course ? COURSE_TYPES.find((item) => item.value === course.type)?.label ?? course.type : '—';
  const formatLabel = course ? COURSE_FORMATS.find((item) => item.value === course.format)?.label ?? course.format : '—';
  const statusConfig = course ? COURSE_STATUSES.find((item) => item.value === course.status) : undefined;
  const teacherMap = useMemo(
    () => new Map((teachersData?.content ?? []).map((teacherItem) => [teacherItem.id, getStaffFullName(teacherItem)])),
    [teachersData]
  );
  const roomMap = useMemo(
    () => new Map((roomsData?.content ?? []).map((roomItem) => [roomItem.id, roomItem.name])),
    [roomsData]
  );

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
      .filter((student) => !student.deleted && !existingIds.has(student.id))
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
  const scheduleRows = useMemo(
    () =>
      schedules
        .slice()
        .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.startTime.localeCompare(right.startTime))
        .map((schedule) => ({
          id: schedule.id,
          name: schedule.name,
          teacherName: schedule.teacherId
            ? teacherMap.get(schedule.teacherId) || '—'
            : getStaffFullName(teacher),
          roomName: schedule.roomId
            ? roomMap.get(schedule.roomId) || '—'
            : room?.name || '—',
          daysText: formatScheduleDays(schedule.daysOfWeek),
          timeText: formatScheduleTimeRange(schedule.startTime, schedule.endTime),
          periodText: formatSchedulePeriod(schedule.startDate, schedule.endDate),
          status: schedule.status,
        })),
    [room?.name, roomMap, schedules, teacher, teacherMap]
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

    await addStudentMutation.mutate({ courseId: course.id, studentId: selectedStudentId, startDate: enrollmentStartDate });
    if (studentDiscount > 0) {
      await studentPaymentsService.updateSubscriptionDiscount(selectedStudentId, course.id, studentDiscount).catch(() => {});
    }
    setAddModalOpen(false);
    setEnrollmentStartDate(new Date().toISOString().slice(0, 10));
    setSelectedStudentId(null);
    setStudentDiscount(0);
    setAddSearch('');
    await refetch();
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!course || !confirm('Удалить ученика из курса?')) {
      return;
    }

    await removeStudentMutation.mutate({ courseId: course.id, studentId });
    await refetch();
  };

  const handleSaveEnrollmentDate = async () => {
    if (!course || !enrollmentDateModal?.student?.id || !enrollmentDateModal.startDate) return;
    const { student, startDate } = enrollmentDateModal;
    await updateEnrollmentDateMutation.mutate({
      courseId: course.id,
      studentId: student.id,
      startDate,
    });
    setEnrollmentStartDateOverrides((previous) => ({ ...previous, [student.id]: startDate }));
    setEnrollmentDateModal(null);
  };

  const handleDeleteCourse = async () => {
    if (!course) {
      return;
    }
    await courseLifecycle.requestDelete({ id: course.id, name: course.name });
  };

  const openTransferModal = () => {
    setTargetBranchId('');
    setTargetLevelId(course?.levelId || '');
    setTargetRoomId('');
    setTransferModalOpen(true);
  };

  const handleTransferCourse = async () => {
    if (!course || !targetBranchId || !targetLevelId) return;
    await transferCourseMutation.mutate({
      id: course.id,
      targetBranchId,
      targetLevelId,
      targetRoomId: targetRoomId || null,
    });
    setTransferModalOpen(false);
    setBranchId(targetBranchId);
    router.push('/classes');
  };

  const handleEditCourse = async (
    payload: CreateCourseRequest & { status?: CourseStatus },
    studentDiscounts?: Record<string, number>,
    studentDiscountPeriods?: Record<string, DiscountPeriod>
  ) => {
    if (!course) {
      return;
    }

    const updatedCourse = await updateCourseMutation.mutate({
      id: course.id,
      data: payload,
    });
    // ARCHIVED/INACTIVE -> ACTIVE restores students and subscriptions on the backend.
    notifyCourseLifecycle(updatedCourse);

    if (studentDiscounts && Object.keys(studentDiscounts).length > 0) {
      await Promise.all(
        Object.entries(studentDiscounts).map(async ([studentId, discount]) => {
          if (discount > 0) {
            await studentPaymentsService
              .updateSubscriptionDiscount(studentId, course.id, discount, undefined, undefined, studentDiscountPeriods?.[studentId])
              .catch(() => {});
          }
        })
      );
    }

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
            {!isTeacher ? (
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
            ) : null}

            {!isTeacher ? (
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
                <Button variant="outline" icon={ArrowRightLeft} onClick={openTransferModal}>
                  Перевести в филиал
                </Button>
                {course?.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    icon={PauseCircle}
                    onClick={() => course && courseLifecycle.requestStop({ id: course.id, name: course.name })}
                    disabled={courseLifecycle.busy}
                  >
                    Остановить курс
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    icon={PlayCircle}
                    onClick={() => course && courseLifecycle.requestResume({ id: course.id, name: course.name })}
                    disabled={courseLifecycle.busy}
                    className="border-[#bfe8e3] bg-[#eaf9f7] text-[#12998f] hover:bg-[#d8f3ef]"
                  >
                    Возобновить
                  </Button>
                )}
                <Button
                  variant="outline"
                  icon={Trash2}
                  onClick={() => void handleDeleteCourse()}
                  disabled={courseLifecycle.busy}
                  className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Удалить
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-2 xl:grid-cols-5">
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
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Уровень</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{course.levelName || '—'}</p>
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
            <p className="mt-1 text-sm font-semibold text-[#273142]">{course.createdByName || course.createdBy || 'Администратор'}</p>
            <p className="text-xs text-[#8a93a3]">{formatDateTime(course.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Обновлен</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{course.updatedByName || course.updatedBy || 'Администратор'}</p>
            <p className="text-xs text-[#8a93a3]">{formatDateTime(course.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={classDetailsTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as ClassDetailsTab)}
          className="w-fit"
          aria-label="Вкладки карточки курса"
        />
      </div>

      {activeTab === 'students' && (
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
                  onChange={(event) => {
                    setStudentsPage(1);
                    setStudentSearch(event.target.value);
                  }}
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
                  <th className="crm-table-th">Начало действия</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">{isTeacher ? 'Просмотр' : 'Действия'}</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {visibleStudents.length > 0 ? (
                  visibleStudents.map((student, index) => {
                    const enrollment = data?.enrollments?.[student.id];
                    const startDateStr = enrollmentStartDateOverrides[student.id]
                      ?? (enrollment?.enrolledAt ? enrollment.enrolledAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
                    return (
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[#273142]">
                            {enrollment?.enrolledAt || enrollmentStartDateOverrides[student.id]
                              ? formatDate(startDateStr)
                              : '—'}
                          </span>
                          {!isTeacher ? (
                            <button
                              type="button"
                              onClick={() => setEnrollmentDateModal({ student, startDate: startDateStr })}
                              className="inline-flex rounded-md p-1 text-[#8a93a3] transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Изменить начало действия"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_STATUS_COLORS[student.status]}`}>
                          {STUDENT_STATUS_LABELS[student.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/students/${student.id}`}
                            className="inline-flex rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                            title="Карточка ученика"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                          {!isTeacher ? (
                            <button
                              type="button"
                              onClick={() => setEnrollmentDateModal({ student, startDate: startDateStr })}
                              className="inline-flex rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Начало действия"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!isTeacher ? <button
                            type="button"
                            onClick={() => void handleRemoveStudent(student.id)}
                            disabled={removeStudentMutation.loading}
                            className="inline-flex rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Удалить из курса"
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
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
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
      )}

      {activeTab === 'schedule' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              Расписаний курса: <span className="font-semibold text-gray-900">{scheduleRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Группа</th>
                  <th className="crm-table-th">Преподаватель</th>
                  <th className="crm-table-th">Кабинет</th>
                  <th className="crm-table-th">Дни</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {scheduleRows.length > 0 ? (
                  scheduleRows.map((schedule, index) => (
                    <tr key={schedule.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell font-medium text-[#273142]">{schedule.name}</td>
                      <td className="crm-table-cell">{schedule.teacherName}</td>
                      <td className="crm-table-cell">{schedule.roomName}</td>
                      <td className="crm-table-cell">{schedule.daysText}</td>
                      <td className="crm-table-cell">{schedule.timeText}</td>
                      <td className="crm-table-cell">{schedule.periodText}</td>
                      <td className="crm-table-cell">{SCHEDULE_STATUS_LABELS[schedule.status]}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={8} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Для курса пока не найдено расписаний
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isTeacher ? courseLifecycle.dialogs : null}
      {!isTeacher ? <AddClassModal
        key={`${course?.id ?? 'course'}-${editModalOpen ? 'open' : 'closed'}`}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditCourse}
        teachers={teacherOptions}
        rooms={roomOptions}
        students={studentOptions}
        levels={(levelsData ?? []).map((level) => ({ id: level.id, name: level.name, active: level.active }))}
        initialValues={course ? toEditFormValues(course) : undefined}
        isSubmitting={updateCourseMutation.loading}
        title="Редактировать курс"
        includeStatus
      /> : null}

      {!isTeacher ? (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Перевести курс в филиал"
          footer={(
            <>
              <Button variant="ghost" onClick={() => setTransferModalOpen(false)} disabled={transferCourseMutation.loading}>
                Отмена
              </Button>
              <Button
                icon={ArrowRightLeft}
                onClick={() => void handleTransferCourse()}
                disabled={!targetBranchId || !targetLevelId || transferCourseMutation.loading}
              >
                {transferCourseMutation.loading ? 'Переносим...' : 'Перевести курс'}
              </Button>
            </>
          )}
        >
          <div className="space-y-4">
            <p className="rounded-xl border border-[#dbe7ff] bg-[#f5f8ff] px-3 py-2.5 text-sm leading-5 text-[#526173]">
              Вместе с курсом будут перенесены его ученики, расписание, уроки, посещения, абонементы, оплаты и долги.
              История старых кассовых смен остаётся в исходном филиале.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#273142]">Новый филиал *</label>
              <select
                value={targetBranchId}
                onChange={(event) => {
                  const nextBranchId = event.target.value;
                  setTargetBranchId(nextBranchId);
                  setTargetLevelId('');
                  setTargetRoomId('');
                }}
                className="crm-input"
              >
                <option value="">Выберите филиал</option>
                {transferBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#273142]">Уровень курса в новом филиале *</label>
              <select
                value={targetLevelId}
                onChange={(event) => setTargetLevelId(event.target.value)}
                disabled={!targetBranchId}
                className="crm-input disabled:cursor-not-allowed disabled:bg-[#f3f5f7]"
              >
                <option value="">Выберите уровень</option>
                {targetLevels.filter((level) => level.active).map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#273142]">Кабинет в новом филиале</label>
              <select
                value={targetRoomId}
                onChange={(event) => setTargetRoomId(event.target.value)}
                disabled={!targetBranchId}
                className="crm-input disabled:cursor-not-allowed disabled:bg-[#f3f5f7]"
              >
                <option value="">Не назначать кабинет</option>
                {targetRooms.map((targetRoom) => <option key={targetRoom.id} value={targetRoom.id}>{targetRoom.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      ) : null}

      {!isTeacher ? <Modal
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

          {selectedStudentId ? (
            <div className="space-y-3 rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[#273142]">Начало действия:</label>
                <input
                  type="date"
                  value={enrollmentStartDate}
                  onChange={(event) => setEnrollmentStartDate(event.target.value)}
                  className="rounded-lg border border-[#cfd8e1] bg-white px-2.5 py-1.5 text-sm text-[#273142] focus:border-[#467aff] focus:outline-none"
                />
              </div>
              <p className="text-xs text-[#8a93a3]">Можно выбрать прошедшую или будущую дату. До неё посещаемость недоступна.</p>
              <div className="flex items-center justify-between gap-3 border-t border-[#e3e9ef] pt-3">
                <label className="text-sm font-medium text-[#273142]">Скидка на курс:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={studentDiscount || ''}
                    onChange={(event) => {
                      const val = parseInt(event.target.value, 10);
                      setStudentDiscount(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    placeholder="0"
                    className="w-16 rounded-lg border border-[#cfd8e1] bg-white px-2 py-1 text-center text-sm font-semibold text-[#273142] focus:border-[#467aff] focus:outline-none"
                  />
                  <span className="text-sm font-medium text-[#8a93a3]">%</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal> : null}

      {!isTeacher ? (
        <Modal
          isOpen={Boolean(enrollmentDateModal)}
          onClose={() => setEnrollmentDateModal(null)}
          title={`Начало действия: ${enrollmentDateModal ? getStudentFullName(enrollmentDateModal.student) : ''}`}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setEnrollmentDateModal(null)}
                disabled={updateEnrollmentDateMutation.loading}
              >
                Отмена
              </Button>
              <Button
                onClick={() => void handleSaveEnrollmentDate()}
                disabled={!enrollmentDateModal?.startDate || updateEnrollmentDateMutation.loading}
              >
                {updateEnrollmentDateMutation.loading ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                Дата начала действия в курсе *
              </label>
              <input
                type="date"
                value={enrollmentDateModal?.startDate || ''}
                onChange={(e) =>
                  setEnrollmentDateModal((prev) => (prev ? { ...prev, startDate: e.target.value } : prev))
                }
                className="crm-input"
              />
              <p className="mt-1.5 text-xs text-[#8a93a3]">
                Дата будет синхронизирована с абонементом и членством в группе.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
