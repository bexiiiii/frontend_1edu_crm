'use client';
import { AttendanceTotals } from '@/components/features/attendance/AttendanceTotals';

import Link from 'next/link';

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Save, UserPlus, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { AxiosRequestConfig } from 'axios';
import { AttendanceMonthlyTable } from '@/components/features/attendance/AttendanceMonthlyTable';
import { AddStudentModal } from '@/components/features/students/AddStudentModal';
import { useAttendanceUnlock } from '@/components/features/attendance/useAttendanceUnlock';
import {
  RedListChip,
  RedListModal,
  canManageRedList,
  formatRedListDate,
  type RedListModalTarget,
} from '@/components/features/attendance/RedListModal';
import { useAuthStore } from '@/store/authStore';
import { AssignSubstituteModal } from '@/components/features/schedule/AssignSubstituteModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/vercel-tabs';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  attendanceService,
  coursesService,
  lessonsService,
  redListService,
  roomsService,
  schedulesService,
  staffService,
  studentsService,
  subscriptionsService,
  type CreateStudentRequest,
} from '@/lib/api';
import {
  ATTENDANCE_STATUS_OPTIONS,
  formatLongRuDate,
  formatShortRuDate,
  formatTimeRange,
  isPresentStatus,
} from '@/constants/attendance';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type { AttendanceDto, AttendanceStatus, LessonDto, RedListDto, StudentDto } from '@/lib/api/types';
import { formatFullName } from '@/lib/utils';
import { useBackNavigation, useUrlState } from '@/hooks/useUrlState';

type AttendanceViewMode = 'lesson' | 'month';

type LessonAttendanceData = {
  lesson: Awaited<ReturnType<typeof lessonsService.getById>>['data'];
  courseId?: string | null;
  groupName: string;
  roomName: string;
  teacherName: string;
  substituteTeacherName: string;
  staffOptions: { id: string; name: string }[];
  students: StudentDto[];
  attendanceRecords: Awaited<ReturnType<typeof attendanceService.getByLesson>>['data'];
  availableStudents: StudentDto[];
  monthlyStudents: StudentDto[];
  monthlyLessons: LessonDto[];
  monthlyAttendanceByLessonId: Record<string, AttendanceDto[]>;
  monthlyError: string | null;
  /** studentId → ISO date/instant when their subscription for this course was cancelled. */
  cancelledAtByStudentId: Record<string, string>;
  /** studentId → the student's open «Редлист» period in this course (no end date yet). */
  openRedListByStudentId: Record<string, RedListDto>;
};

type LessonDraftState = {
  key: string;
  topic: string;
  homework: string;
  notes: string;
  statusDrafts: Record<string, AttendanceStatus>;
  selectedStudentId: string;
};

const attendanceViewTabs: Array<{ id: AttendanceViewMode; label: string }> = [
  { id: 'lesson', label: 'Урок' },
  { id: 'month', label: 'Месяц' },
];

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

function getStaffFullName(staff: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return formatFullName(staff);
}

function getErrorMessage(error: unknown, fallback: string) {
  // The backend message (e.g. «Ученик в редлисте с …») first: an axios error's own
  // message is only "Request failed with status code 400".
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function getInitialStatuses(
  students: StudentDto[],
  attendanceRecords: Array<{ studentId: string; status: AttendanceStatus }>
) {
  const recordMap = new Map(attendanceRecords.map((record) => [record.studentId, record.status]));

  return Object.fromEntries(
    students.map((student) => [student.id, recordMap.get(student.id) ?? 'PLANNED'])
  ) as Record<string, AttendanceStatus>;
}

async function getStudentByIdSafe(studentId: string) {
  try {
    const response = await studentsService.getById(studentId);
    return response.data;
  } catch {
    return null;
  }
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthRange(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    from: toIsoDate(monthStart),
    to: toIsoDate(monthEnd),
    daysInMonth: monthEnd.getDate(),
    monthLabel: monthStart.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    }),
  };
}

function mergeStudentsById(students: StudentDto[]) {
  const studentMap = new Map<string, StudentDto>();

  for (const student of students) {
    if (!studentMap.has(student.id)) {
      studentMap.set(student.id, student);
    }
  }

  return Array.from(studentMap.values());
}

function createDraftState(key: string, data: LessonAttendanceData | null): LessonDraftState {
  if (!data) {
    return {
      key,
      topic: '',
      homework: '',
      notes: '',
      statusDrafts: {},
      selectedStudentId: '',
    };
  }

  return {
    key,
    topic: data.lesson.topic || '',
    homework: data.lesson.homework || '',
    notes: data.lesson.notes || '',
    statusDrafts: getInitialStatuses(data.students, data.attendanceRecords),
    selectedStudentId: data.availableStudents[0]?.id ?? '',
  };
}

export default function AttendanceLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonIdParam = params.lessonId;
  const lessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam;

  const [pageError, setPageError] = useState<string | null>(null);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [attendanceViewState, setAttendanceViewState] = useState<{
    lessonId: string | undefined;
    mode: AttendanceViewMode;
  }>({
    // Not chosen yet: «Месяц» opens by itself when the URL has ?month=.
    lessonId: undefined,
    mode: 'lesson',
  });
  // Month shown in «Месяц» (?month=YYYY-MM); default is the lesson's month.
  const [monthParamRaw, setMonthParam] = useUrlState('month');
  const monthParam = /^\d{4}-\d{2}$/.test(monthParamRaw) ? monthParamRaw : '';
  const monthBaseDate = (lessonDate: string) => (monthParam ? `${monthParam}-01` : lessonDate);
  const [draftState, setDraftState] = useState<LessonDraftState>(() =>
    createDraftState(lessonId ? `pending:${lessonId}` : 'empty', null)
  );
  const [monthlyAttendanceOverrides, setMonthlyAttendanceOverrides] = useState<
    Record<string, Record<string, AttendanceStatus>>
  >({});

  const { data, loading, error, refetch } = useApi<LessonAttendanceData | null>(async () => {
    if (!lessonId) {
      return { data: null };
    }

    const lessonResponse = await lessonsService.getById(lessonId);
    const lesson = lessonResponse.data;

    const [attendanceResponse, staffResponse, scheduleResponse, roomResponse] = await Promise.all([
      attendanceService.getByLesson(lessonId).catch(() => ({ data: [] })),
      staffService.getAll({ page: 0, size: 500 }).catch(() => ({ data: { content: [] } })),
      lesson.groupId ? schedulesService.getById(lesson.groupId).catch(() => null) : Promise.resolve(null),
      lesson.roomId ? roomsService.getById(lesson.roomId).catch(() => null) : Promise.resolve(null),
    ]);

    const schedule = scheduleResponse?.data;
    const courseId = schedule?.courseId || lesson.serviceId || undefined;
    const courseResponse = courseId ? await coursesService.getById(courseId).catch(() => null) : null;
    const course = courseResponse?.data;

    let students: StudentDto[] = [];
    let availableStudents: StudentDto[] = [];

    if (lesson.groupId) {
      const [groupStudentsResponse, allStudentsResponse] = await Promise.all([
        studentsService.getByGroup(lesson.groupId, { page: 0, size: 500 }).catch(() => ({
          data: { content: [] },
        })),
        studentsService.getAll({ page: 0, size: 500 }).catch(() => ({
          data: { content: [] },
        })),
      ]);

      students = groupStudentsResponse.data.content ?? [];
      availableStudents = allStudentsResponse.data.content ?? [];

      if (students.length === 0 && courseId && courseId !== lesson.groupId) {
        const courseStudents = await studentsService.getByGroup(courseId, { page: 0, size: 500 }).catch(() => null);
        if (courseStudents && (courseStudents.data.content ?? []).length > 0) {
          students = courseStudents.data.content ?? [];
        }
      }
    }

    const knownCurrentStudentIds = new Set(students.map((student) => student.id));
    const missingCurrentStudentIds = Array.from(
      new Set(
        (attendanceResponse.data ?? [])
          .map((record) => record.studentId)
          .filter((studentId) => !knownCurrentStudentIds.has(studentId))
      )
    );

    if (missingCurrentStudentIds.length > 0) {
      const extraStudents = await Promise.all(
        missingCurrentStudentIds.map((studentId) => getStudentByIdSafe(studentId))
      );
      students = mergeStudentsById([
        ...students,
        ...extraStudents.filter((student): student is StudentDto => student !== null),
      ]);
    }

    const eligibleCurrentStudentIds = new Set((attendanceResponse.data ?? []).map((record) => record.studentId));
    students = students.filter((student) => eligibleCurrentStudentIds.has(student.id));
    const currentLessonStudentIds = new Set(students.map((student) => student.id));
    availableStudents = availableStudents.filter(
      (student) => !student.deleted && !currentLessonStudentIds.has(student.id)
    );

    let monthlyStudents = students;
    let monthlyLessons: LessonDto[] = [];
    let monthlyAttendanceByLessonId: Record<string, AttendanceDto[]> = {};
    let monthlyError: string | null = null;

    if (lesson.groupId) {
      const monthRange = getMonthRange(monthBaseDate(lesson.lessonDate));

      try {
        const monthlyLessonsResponse = await lessonsService.getByGroup(lesson.groupId, {
          page: 0,
          size: 500,
          from: monthRange.from,
          to: monthRange.to,
        });

        monthlyLessons = (monthlyLessonsResponse.data.content ?? []).sort((left, right) => {
          const leftKey = `${left.lessonDate}T${left.startTime}`;
          const rightKey = `${right.lessonDate}T${right.startTime}`;
          return leftKey.localeCompare(rightKey);
        });

        const monthlyAttendanceEntries = await Promise.all(
          monthlyLessons.map(async (monthlyLesson) => {
            try {
              const response = await attendanceService.getByLesson(monthlyLesson.id);
              return [monthlyLesson.id, response.data ?? []] as const;
            } catch {
              return [monthlyLesson.id, [] as AttendanceDto[]] as const;
            }
          })
        );

        monthlyAttendanceByLessonId = Object.fromEntries(monthlyAttendanceEntries);

        const knownMonthlyStudentIds = new Set(monthlyStudents.map((student) => student.id));
        const missingMonthlyStudentIds = Array.from(
          new Set(
            monthlyAttendanceEntries
              .flatMap(([, records]) => records.map((record) => record.studentId))
              .filter((studentId) => !knownMonthlyStudentIds.has(studentId))
          )
        );

        if (missingMonthlyStudentIds.length > 0) {
          const extraStudents = await Promise.all(
            missingMonthlyStudentIds.map((studentId) => getStudentByIdSafe(studentId))
          );
          monthlyStudents = mergeStudentsById([
            ...monthlyStudents,
            ...extraStudents.filter((student): student is StudentDto => student !== null),
          ]);
        }
      } catch (monthlyFetchError) {
        monthlyError = getErrorMessage(
          monthlyFetchError,
          'Не удалось загрузить посещаемость группы за месяц.'
        );
      }
    }

    // Дата отмены абонемента по ученику — для обрезки сетки расписания после дня отмены.
    // Важно: при повторном зачислении остаётся исторический CANCELLED-абонемент.
    // Он не должен скрывать новые уроки, пока есть действующий абонемент по этому курсу.
    const cancelledAtByStudentId: Record<string, string> = {};
    if (courseId) {
      try {
        const [cancelledSubs, activeSubs] = await Promise.all([
          subscriptionsService.getAll({
            courseId,
            status: 'CANCELLED',
            page: 0,
            size: 500,
          }),
          subscriptionsService.getAll({
            courseId,
            status: 'ACTIVE',
            page: 0,
            size: 500,
          }),
        ]);
        const activeStudentIds = new Set(
          (activeSubs.data.content ?? [])
            .map((sub) => sub.studentId)
            .filter((studentId): studentId is string => Boolean(studentId))
        );
        for (const sub of cancelledSubs.data.content ?? []) {
          if (!sub.studentId || !sub.cancelledAt || activeStudentIds.has(sub.studentId)) continue;
          const existing = cancelledAtByStudentId[sub.studentId];
          if (!existing || sub.cancelledAt > existing) {
            cancelledAtByStudentId[sub.studentId] = sub.cancelledAt;
          }
        }
      } catch {
        // Best-effort: if this fails we just don't trim the grid by cancellation date.
      }
    }

    // Open «Редлист» periods of the course: drive the «В редлист» / «Вывести из редлиста» actions.
    const openRedListByStudentId: Record<string, RedListDto> = {};
    if (courseId) {
      try {
        const redListResponse = await redListService.list({ courseId, active: true });
        for (const period of redListResponse.data ?? []) {
          if (!period.toDate && (!period.groupId || period.groupId === lesson.groupId)) {
            openRedListByStudentId[period.studentId] = period;
          }
        }
      } catch {
        // Best-effort: without the list the actions are just hidden.
      }
    }

    const staffMap = new Map(
      (staffResponse.data.content ?? []).map((staff) => [
        staff.id,
        getStaffFullName(staff) || 'Без имени',
      ])
    );

    const isIndividual = course?.type === 'INDIVIDUAL' || lesson.lessonType === 'INDIVIDUAL';
    const courseName = course?.name || '';
    const scheduleName = schedule?.name || '';
    let resolvedGroupName = 'Без группы';
    if (courseName && scheduleName && courseName !== scheduleName) {
      resolvedGroupName = `${courseName} (${scheduleName})`;
    } else if (courseName) {
      resolvedGroupName = courseName;
    } else if (scheduleName) {
      resolvedGroupName = scheduleName;
    }

    return {
      data: {
        lesson: {
          ...lesson,
          lessonType: isIndividual ? 'INDIVIDUAL' : (lesson.lessonType || 'GROUP'),
        },
        courseId: course?.id || null,
        groupName: resolvedGroupName,
        roomName: roomResponse?.data.name ?? 'Не указан',
        teacherName: lesson.teacherId
          ? staffMap.get(lesson.teacherId) || 'Не назначен'
          : 'Не назначен',
        substituteTeacherName: lesson.substituteTeacherId
          ? staffMap.get(lesson.substituteTeacherId) || 'Не назначен'
          : '',
        staffOptions: (staffResponse.data.content ?? [])
          .map((staff) => ({ id: staff.id, name: getStaffFullName(staff) || 'Без имени' }))
          .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
        students,
        attendanceRecords: attendanceResponse.data ?? [],
        availableStudents,
        monthlyStudents,
        monthlyLessons,
        monthlyAttendanceByLessonId,
        monthlyError,
        cancelledAtByStudentId,
        openRedListByStudentId,
      },
    };
  }, [lessonId, monthParam]);

  const roles = useAuthStore((s) => s.roles);
  const canEditRedList = canManageRedList(roles);
  const [redListTarget, setRedListTarget] = useState<RedListModalTarget | null>(null);

  const saveLessonMutation = useMutation(
    ({ id, payload }: {
      id: string;
      payload: { topic?: string; homework?: string; notes?: string; substituteTeacherId?: string | null };
    }) => lessonsService.update(id, payload)
  );
  const saveAttendanceMutation = useMutation(
    ({ id, attendances, unlockReason, requestConfig }: {
      id: string;
      attendances: Array<{ studentId: string; status: AttendanceStatus }>;
      unlockReason?: string;
      requestConfig?: AxiosRequestConfig;
    }) => attendanceService.bulkMark(id, attendances, unlockReason, requestConfig)
  );
  const markAllMutation = useMutation(
    ({ id, studentIds, unlockReason, requestConfig }: {
      id: string;
      studentIds: string[];
      unlockReason?: string;
      requestConfig?: AxiosRequestConfig;
    }) => attendanceService.markAll(id, studentIds, unlockReason, requestConfig)
  );
  const attendanceUnlock = useAttendanceUnlock();
  const addToGroupMutation = useMutation(
    ({ studentId, groupId }: { studentId: string; groupId: string }) =>
      studentsService.addToGroup(studentId, groupId)
  );
  const createStudentMutation = useMutation((payload: CreateStudentRequest) =>
    studentsService.create(payload)
  );

  const draftStateKey = useMemo(() => {
    if (!data) {
      return lessonId ? `pending:${lessonId}` : 'empty';
    }

    const studentKey = data.students
      .map((student) => student.id)
      .sort((left, right) => left.localeCompare(right))
      .join('|');
    const availableKey = data.availableStudents
      .map((student) => student.id)
      .sort((left, right) => left.localeCompare(right))
      .join('|');
    const attendanceKey = data.attendanceRecords
      .map((record) => `${record.studentId}:${record.status}`)
      .sort((left, right) => left.localeCompare(right))
      .join('|');

    return [
      data.lesson.id,
      data.lesson.updatedAt,
      data.lesson.topic || '',
      data.lesson.homework || '',
      data.lesson.notes || '',
      studentKey,
      availableKey,
      attendanceKey,
    ].join('::');
  }, [data, lessonId]);

  const resolvedDraftState = useMemo(
    () => createDraftState(draftStateKey, data),
    [data, draftStateKey]
  );

  const activeDraftState = draftState.key === draftStateKey ? draftState : resolvedDraftState;
  const attendanceView =
    attendanceViewState.lessonId === lessonId ? attendanceViewState.mode : monthParam ? 'month' : 'lesson';
  const shiftMonth = (delta: number) => {
    if (!data) return;
    const current = monthParam || data.lesson.lessonDate.slice(0, 7);
    const [year, month] = current.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setAttendanceViewState({ lessonId, mode: 'month' });
    setMonthParam(nextKey === data.lesson.lessonDate.slice(0, 7) ? '' : nextKey);
  };
  const topic = activeDraftState.topic;
  const homework = activeDraftState.homework;
  const notes = activeDraftState.notes;
  const statusDrafts = activeDraftState.statusDrafts;
  const selectedStudentId = activeDraftState.selectedStudentId;

  const updateDraftState = (updater: (previous: LessonDraftState) => LessonDraftState) => {
    setDraftState((previous) => {
      const baseState = previous.key === draftStateKey ? previous : resolvedDraftState;
      return updater(baseState);
    });
  };

  const redListRecordByStudentId = useMemo(
    () => new Map((data?.attendanceRecords ?? []).filter((record) => record.redList).map((record) => [record.studentId, record])),
    [data]
  );

  const attendanceRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.students.map((student) => ({
      id: student.id,
      fullName: getStudentFullName(student) || 'Без имени',
      phone: student.phone || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      status: statusDrafts[student.id] ?? 'PLANNED',
      studentStatus: student.status,
      redList: redListRecordByStudentId.get(student.id) ?? null,
    }));
  }, [data, statusDrafts, redListRecordByStudentId]);

  /** Students whose attendance can be marked in this lesson (not in the red list). */
  const markableRows = useMemo(() => attendanceRows.filter((student) => !student.redList), [attendanceRows]);

  const monthlyViewData = useMemo(() => {
    if (!data) {
      return null;
    }

    const monthRange = getMonthRange(monthBaseDate(data.lesson.lessonDate));
    const lessonsByDate = new Map<string, LessonDto[]>();

    for (const monthlyLesson of data.monthlyLessons) {
      const dayLessons = lessonsByDate.get(monthlyLesson.lessonDate) ?? [];
      dayLessons.push(monthlyLesson);
      lessonsByDate.set(monthlyLesson.lessonDate, dayLessons);
    }

    const statusMapByLessonId = new Map<string, Map<string, AttendanceStatus>>(
      Object.entries(data.monthlyAttendanceByLessonId).map(([monthlyLessonId, records]) => [
        monthlyLessonId,
        new Map(records.map((record) => [record.studentId, record.status])),
      ])
    );
    const redListMapByLessonId = new Map<string, Map<string, AttendanceDto>>(
      Object.entries(data.monthlyAttendanceByLessonId).map(([monthlyLessonId, records]) => [
        monthlyLessonId,
        new Map(records.filter((record) => record.redList).map((record) => [record.studentId, record])),
      ])
    );

    const monthPrefix = monthRange.from.slice(0, 8);
    // Only show days that have lessons
    const days = Array.from(lessonsByDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, lessons]) => {
        const dayNumber = String(parseInt(date.split('-')[2], 10));
        const dateValue = new Date(`${date}T00:00:00`);

        return {
          date,
          dayNumber,
          weekdayLabel: dateValue.toLocaleDateString('ru-RU', { weekday: 'short' }),
          lessonsCount: lessons.length,
          isCurrentDate: date === data.lesson.lessonDate,
        };
      });

    const viewedMonthPrefix = monthRange.from.slice(0, 7);

    // Ученик со статусом "Выбыл" виден в сетке до конца месяца, в котором выбыл, дальше — нет.
    // Ученик, чей абонемент на этот курс отменён, виден по день отмены включительно —
    // после этого дня его ячейки в сетке не показываются (cancelCutoffByStudentId).
    const cancelCutoffByStudentId = new Map<string, string>();
    const monthlyStudents = [...data.monthlyStudents]
      .filter((student) => {
        if (student.status === 'DROPPED' && student.statusChangedAt) {
          const droppedMonthPrefix = student.statusChangedAt.slice(0, 7);
          if (droppedMonthPrefix < viewedMonthPrefix) {
            return false;
          }
        }

        const cancelledAt = data.cancelledAtByStudentId[student.id];
        if (cancelledAt) {
          const cancelledDate = cancelledAt.slice(0, 10);
          if (cancelledDate < monthRange.from) {
            return false;
          }
          cancelCutoffByStudentId.set(student.id, cancelledDate);
        }

        return true;
      })
      .sort((left, right) =>
        (getStudentFullName(left) || 'Без имени').localeCompare(
          getStudentFullName(right) || 'Без имени',
          'ru-RU'
        )
      );

    const rows = monthlyStudents.map((student) => {
      let presentCount = 0;
      let markedCount = 0;
      const cutoffDate = cancelCutoffByStudentId.get(student.id);

      const cells = days.map((day) => {
        if (cutoffDate && day.date > cutoffDate) {
          return { date: day.date, entries: [] };
        }

        const lessonsForDay = lessonsByDate.get(day.date) ?? [];

        const entries = lessonsForDay.map((monthlyLesson) => {
          const overrideStatus = monthlyAttendanceOverrides[monthlyLesson.id]?.[student.id];
          const hasRecord = statusMapByLessonId.get(monthlyLesson.id)?.has(student.id);
          const rawStatus = statusMapByLessonId.get(monthlyLesson.id)?.get(student.id);
          const isEligible = hasRecord || (overrideStatus !== undefined);
          const status = overrideStatus ?? rawStatus ?? (isEligible ? 'PLANNED' : null);
          const redListRecord = redListMapByLessonId.get(monthlyLesson.id)?.get(student.id) ?? null;

          if (redListRecord) {
            return {
              lessonId: monthlyLesson.id,
              status,
              isEligible,
              redList: redListRecord,
              timeLabel: formatTimeRange(monthlyLesson.startTime, monthlyLesson.endTime),
              isCurrentLesson: monthlyLesson.id === lessonId,
            };
          }

          if (status && status !== 'PLANNED') {
            markedCount += 1;
          }

          if (status && isPresentStatus(status)) {
            presentCount += 1;
          }

          return {
            lessonId: monthlyLesson.id,
            status,
            isEligible,
            redList: null as AttendanceDto | null,
            timeLabel: formatTimeRange(monthlyLesson.startTime, monthlyLesson.endTime),
            isCurrentLesson: monthlyLesson.id === lessonId,
          };
        });

        return {
          date: day.date,
          entries,
        };
      });

      return {
        studentId: student.id,
        fullName: getStudentFullName(student) || 'Без имени',
        studentStatus: student.status,
        presentCount,
        markedCount,
        totalLessons: 0,
        attendanceRate: markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0,
        cells,
      };
    });

    const substituteNameById = new Map(data.staffOptions.map((staff) => [staff.id, staff.name]));

    // Flatten cells: each lesson becomes a separate column
    const lessonColumns = days.flatMap((day) =>
      (lessonsByDate.get(day.date) ?? []).map((lesson) => ({
        date: day.date,
        dayNumber: day.dayNumber,
        weekdayLabel: day.weekdayLabel,
        isCurrentDate: day.isCurrentDate,
        lessonId: lesson.id,
        timeLabel: formatTimeRange(lesson.startTime, lesson.endTime),
        substituteTeacherName: lesson.substituteTeacherId
          ? substituteNameById.get(lesson.substituteTeacherId) || 'Замена'
          : null,
      }))
    );

    const studentRows = monthlyStudents.map((student) => {
      const lessonEntries = new Map<string, { status: AttendanceStatus | null; isEligible: boolean; redList: AttendanceDto | null }>();

      // Build status map for this student
      for (const cell of (rows.find(r => r.studentId === student.id)?.cells ?? [])) {
        for (const entry of cell.entries) {
          lessonEntries.set(entry.lessonId, {
            status: entry.status,
            isEligible: entry.isEligible,
            redList: entry.redList,
          });
        }
      }

      let presentCount = 0;
      let markedCount = 0;
      let totalLessons = 0;

      const cells = lessonColumns.map((col) => {
        const entry = lessonEntries.get(col.lessonId);
        const redList = entry?.redList ?? null;
        // A red-listed lesson does not count for the student: not held, not marked.
        const isEligible = entry?.isEligible === true && !redList;
        const status = entry?.status ?? null;

        if (isEligible) {
          totalLessons += 1;
        }

        if (isEligible && status && status !== 'PLANNED') {
          markedCount += 1;
        }
        if (isEligible && status && isPresentStatus(status)) {
          presentCount += 1;
        }

        return {
          lessonId: col.lessonId,
          status,
          timeLabel: col.timeLabel,
          isCurrentLesson: col.lessonId === lessonId,
          isEligible,
          redList: redList
            ? { fromDate: redList.redListFromDate ?? null, toDate: redList.redListToDate ?? null }
            : null,
        };
      });

      return {
        studentId: student.id,
        fullName: getStudentFullName(student) || 'Без имени',
        studentStatus: student.status,
        presentCount,
        markedCount,
        totalLessons,
        attendanceRate: markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0,
        cells,
        openRedList: data.openRedListByStudentId[student.id]
          ? { id: data.openRedListByStudentId[student.id].id, fromDate: data.openRedListByStudentId[student.id].fromDate }
          : null,
      };
    });

    return {
      monthLabel: monthRange.monthLabel,
      totalLessons: data.monthlyLessons.length,
      lessonDaysCount: lessonsByDate.size,
      totalStudents: studentRows.length,
      lessonColumns,
      rows: studentRows,
    };
  }, [data, lessonId, monthlyAttendanceOverrides, monthParam]);

  const originalStatusMap = useMemo(
    () => new Map((data?.attendanceRecords ?? []).map((record) => [record.studentId, record.status])),
    [data]
  );

  const summary = useMemo(
    () => ({
      totalStudents: markableRows.length,
      markedStudents: markableRows.filter((student) => student.status !== 'PLANNED').length,
      presentStudents: markableRows.filter((student) => isPresentStatus(student.status)).length,
    }),
    [markableRows]
  );

  const hasAttendanceChanges = useMemo(
    () =>
      markableRows.some(
        (student) => (originalStatusMap.get(student.id) ?? 'PLANNED') !== student.status
      ),
    [markableRows, originalStatusMap]
  );

  const hasLessonChanges =
    topic !== (data?.lesson.topic || '') ||
    homework !== (data?.lesson.homework || '') ||
    notes !== (data?.lesson.notes || '');

  const isSavingLesson = saveLessonMutation.loading;
  const isSavingAttendance = saveAttendanceMutation.loading || markAllMutation.loading;
  const isAddingStudent = addToGroupMutation.loading || createStudentMutation.loading;

  // Back to the previous page (the attendance day the lesson was opened from);
  // opened by a direct link: the attendance page of the lesson's day.
  const goBack = useBackNavigation(
    data?.lesson.lessonDate ? `/attendance?date=${data.lesson.lessonDate.slice(0, 10)}` : '/attendance'
  );

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    updateDraftState((previous) => ({
      ...previous,
      statusDrafts: {
        ...previous.statusDrafts,
        [studentId]: status,
      },
    }));
  };

  const handleAssignSubstitute = async (substituteTeacherId: string | null) => {
    if (!lessonId) return;
    setPageError(null);
    try {
      await lessonsService.assignSubstitute(lessonId, substituteTeacherId);
      await refetch();
    } catch (saveError) {
      setPageError(getErrorMessage(saveError, 'Не удалось назначить замену.'));
      throw saveError;
    }
  };

  const handleAssignSubstituteRange = async (params: {
    substituteTeacherId: string | null;
    fromDate: string;
    toDate: string;
  }) => {
    if (!data?.lesson.groupId || !data.lesson.teacherId) return;
    setPageError(null);
    try {
      await lessonsService.bulkAssignSubstitute({
        groupId: data.lesson.groupId,
        teacherId: data.lesson.teacherId,
        substituteTeacherId: params.substituteTeacherId,
        fromDate: params.fromDate,
        toDate: params.toDate,
      });
      await refetch();
    } catch (saveError) {
      setPageError(getErrorMessage(saveError, 'Не удалось назначить замену на период.'));
      throw saveError;
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonId) {
      return;
    }

    setPageError(null);

    try {
      await saveLessonMutation.mutate({
        id: lessonId,
        payload: {
          topic: topic.trim(),
          homework: homework.trim(),
          notes: notes.trim(),
        },
      });
      await refetch();
    } catch (saveError) {
      setPageError(getErrorMessage(saveError, 'Не удалось сохранить данные урока.'));
    }
  };

  const handleSaveAttendance = async () => {
    if (!lessonId || markableRows.length === 0) {
      return;
    }

    setPageError(null);

    try {
      const attendances = markableRows.map((student) => ({
        studentId: student.id,
        status: student.status,
      }));
      await attendanceUnlock.run((unlockReason, requestConfig) =>
        saveAttendanceMutation.mutate({ id: lessonId, attendances, unlockReason, requestConfig })
      );
      await refetch();
    } catch (saveError) {
      setPageError(getErrorMessage(saveError, 'Не удалось сохранить посещаемость.'));
    }
  };

  const handleMarkAll = async () => {
    if (!lessonId || markableRows.length === 0) {
      return;
    }

    setPageError(null);

    try {
      const studentIds = markableRows.map((student) => student.id);
      await attendanceUnlock.run((unlockReason, requestConfig) =>
        markAllMutation.mutate({ id: lessonId, studentIds, unlockReason, requestConfig })
      );
      await refetch();
    } catch (markError) {
      setPageError(getErrorMessage(markError, 'Не удалось отметить всех как посетивших.'));
    }
  };

  const handleAddExistingStudent = async () => {
    if (!data?.lesson.groupId || !selectedStudentId) {
      setIsStudentPickerOpen(false);
      return;
    }

    setPageError(null);

    try {
      await addToGroupMutation.mutate({
        studentId: selectedStudentId,
        groupId: data.lesson.groupId,
      });
      setIsStudentPickerOpen(false);
      await refetch();
    } catch (addError) {
      setPageError(getErrorMessage(addError, 'Не удалось добавить ученика в группу.'));
    }
  };

  const handleCreateStudent = async (payload: CreateStudentRequest) => {
    if (!data?.lesson.groupId) {
      setPageError('Нельзя добавить ученика: у урока не указана группа.');
      return;
    }

    setPageError(null);

    try {
      const createdStudent = await createStudentMutation.mutate(payload);
      await addToGroupMutation.mutate({
        studentId: createdStudent.id,
        groupId: data.lesson.groupId,
      });
      setIsAddStudentModalOpen(false);
      await refetch();
    } catch (createError) {
      setPageError(getErrorMessage(createError, 'Не удалось создать и добавить ученика.'));
      throw createError;
    }
  };

  const showRedListActions = canEditRedList && Boolean(data?.courseId);

  const openRedListAction = (studentId: string, studentName: string) => {
    if (!data?.courseId) return;
    const openPeriod = data.openRedListByStudentId[studentId];
    if (openPeriod) {
      setRedListTarget({
        mode: 'close',
        redListId: openPeriod.id,
        studentName,
        fromDate: openPeriod.fromDate,
        courseName: data.groupName,
      });
    } else {
      setRedListTarget({
        mode: 'add',
        studentId,
        studentName,
        courseId: data.courseId,
        courseName: data.groupName,
        defaultDate: data.lesson.lessonDate,
      });
    }
  };

  const handleOpenMonthlyLesson = (targetLessonId: string) => {
    if (targetLessonId === lessonId) {
      setAttendanceViewState({
        lessonId,
        mode: 'lesson',
      });
      return;
    }

    router.push(`/attendance/${targetLessonId}`);
  };

  const handleMonthlyStatusChange = async (
    studentId: string,
    targetLessonId: string,
    status: AttendanceStatus
  ) => {
    setPageError(null);

    // Optimistically update the UI immediately without full page reloading / spinner
    setMonthlyAttendanceOverrides((prev) => ({
      ...prev,
      [targetLessonId]: {
        ...(prev[targetLessonId] || {}),
        [studentId]: status,
      },
    }));

    if (targetLessonId === lessonId) {
      updateDraftState((prev) => ({
        ...prev,
        statusDrafts: {
          ...prev.statusDrafts,
          [studentId]: status,
        },
      }));
    }

    try {
      await attendanceUnlock.run((unlockReason, requestConfig) =>
        saveAttendanceMutation.mutate({
          id: targetLessonId,
          attendances: [{ studentId, status }],
          unlockReason,
          requestConfig,
        })
      );
    } catch (saveError) {
      // Revert optimistic update on error
      setMonthlyAttendanceOverrides((prev) => {
        const next = { ...prev };
        if (next[targetLessonId]) {
          const lessonOverrides = { ...next[targetLessonId] };
          delete lessonOverrides[studentId];
          next[targetLessonId] = lessonOverrides;
        }
        return next;
      });
      setPageError(getErrorMessage(saveError, 'Не удалось сохранить посещаемость.'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
      </div>
    );
  }

  if (!lessonId || !data) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
          Назад к посещаемости
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">{error || 'Урок не найден'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
        Назад к посещаемости
      </Button>

      <div className="crm-surface space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-[#7f8794]">{formatLongRuDate(data.lesson.lessonDate)}</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">
              {data.groupName !== 'Без группы' ? data.groupName : 'Урок без группы'}
            </p>
            <p className="mt-1 text-sm text-[#667084]">
              {formatTimeRange(data.lesson.startTime, data.lesson.endTime)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={Save}
              onClick={handleSaveLesson}
              disabled={!hasLessonChanges || isSavingLesson}
            >
              {isSavingLesson ? 'Сохраняем урок...' : 'Сохранить урок'}
            </Button>
            <Button
              icon={Save}
              onClick={handleSaveAttendance}
              disabled={!hasAttendanceChanges || isSavingAttendance}
            >
              {isSavingAttendance ? 'Сохраняем посещаемость...' : 'Сохранить посещаемость'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {pageError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="crm-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">Время</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">
              {formatTimeRange(data.lesson.startTime, data.lesson.endTime)}
            </p>
          </div>
          <div className="crm-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">Кабинет</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{data.roomName}</p>
          </div>
          <div className="crm-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">
              Преподаватель
            </p>
            {data.lesson.teacherId ? (
              <Link prefetch={false}
                href={`/staff/${data.lesson.teacherId}`}
                className="mt-1 block text-sm font-semibold text-[#273142] transition-colors hover:text-[#467aff] hover:underline"
              >
                {data.teacherName}
              </Link>
            ) : (
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.teacherName}</p>
            )}
            {data.substituteTeacherName ? (
              <p className="mt-1 text-xs text-[#7f8794]">
                Замена:{' '}
                {data.lesson.substituteTeacherId ? (
                  <Link prefetch={false}
                    href={`/staff/${data.lesson.substituteTeacherId}`}
                    className="text-[#467aff] hover:underline"
                  >
                    {data.substituteTeacherName}
                  </Link>
                ) : (
                  data.substituteTeacherName
                )}
              </p>
            ) : null}
            <button
              type="button"
              className="mt-2 rounded-lg border border-[#dbe2e8] bg-white px-2 py-1 text-xs font-semibold text-[#467aff] transition-colors hover:bg-[#f0f5ff]"
              onClick={() => setIsSubstituteModalOpen(true)}
            >
              {data.lesson.substituteTeacherId ? 'Изменить замену' : 'Замена'}
            </button>
          </div>
          <div className="crm-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">Группа</p>
            {data.courseId || data.lesson.groupId ? (
              <Link prefetch={false}
                href={`/classes/${data.courseId || data.lesson.groupId}`}
                className="mt-1 block text-sm font-semibold text-[#273142] transition-colors hover:text-[#467aff] hover:underline"
              >
                {data.groupName}
              </Link>
            ) : (
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.groupName}</p>
            )}
          </div>
        </div>

        <div className="crm-surface-soft p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#273142]">Посещаемость урока</p>
              {attendanceView === 'lesson' ? (
                <p className="mt-1 text-xs text-[#6f7786]">
                  Отмечено {summary.markedStudents} из {summary.totalStudents}, посетили{' '}
                  {summary.presentStudents}
                </p>
              ) : data.monthlyError ? (
                <p className="mt-1 text-xs text-rose-600">{data.monthlyError}</p>
              ) : monthlyViewData ? (
                <p className="mt-1 text-xs text-[#6f7786]">
                  Сетка за {monthlyViewData.monthLabel}: {monthlyViewData.totalLessons} уроков,{' '}
                  {monthlyViewData.lessonDaysCount} учебных дней
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#6f7786]">
                  Месячная посещаемость появится после загрузки данных.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="rounded-2xl border border-[#dbe2e8] bg-white p-2">
                <Tabs
                  tabs={attendanceViewTabs}
                  activeTab={attendanceView}
                  onTabChange={(tabId) =>
                    setAttendanceViewState({
                      lessonId,
                      mode: tabId as AttendanceViewMode,
                    })
                  }
                  className="w-fit"
                  aria-label="Режим отображения посещаемости"
                />
              </div>

              {attendanceView === 'month' && data.lesson.groupId ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" icon={ChevronLeft} onClick={() => shiftMonth(-1)} disabled={loading}>
                    Назад
                  </Button>
                  <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-[#1f2530]">
                    {getMonthRange(monthBaseDate(data.lesson.lessonDate)).monthLabel}
                  </span>
                  <Button size="sm" variant="secondary" icon={ChevronRight} onClick={() => shiftMonth(1)} disabled={loading}>
                    Вперёд
                  </Button>
                </div>
              ) : null}

              {attendanceView === 'lesson' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleMarkAll}
                    disabled={markableRows.length === 0 || isSavingAttendance}
                  >
                    Отметить всех как посетивших
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Users}
                    onClick={() => setIsStudentPickerOpen(true)}
                    disabled={
                      !data.lesson.groupId ||
                      data.availableStudents.length === 0 ||
                      isAddingStudent
                    }
                  >
                    Добавить из студентов
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={UserPlus}
                    onClick={() => setIsAddStudentModalOpen(true)}
                    disabled={!data.lesson.groupId || isAddingStudent}
                  >
                    Новый ученик
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {attendanceView === 'lesson' && !data.lesson.groupId ? (
            <p className="mt-3 text-xs text-[#7f8794]">
              Для этого урока не указана группа, поэтому добавление учеников недоступно.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Тема урока</label>
            <input
              type="text"
              value={topic}
              onChange={(event) =>
                updateDraftState((previous) => ({
                  ...previous,
                  topic: event.target.value,
                }))
              }
              placeholder="Введите тему урока"
              className="crm-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">
              Домашнее задание
            </label>
            <textarea
              rows={3}
              value={homework}
              onChange={(event) =>
                updateDraftState((previous) => ({
                  ...previous,
                  homework: event.target.value,
                }))
              }
              placeholder="Введите домашнее задание"
              className="crm-textarea resize-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметки</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                updateDraftState((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
              placeholder="Внутренние заметки по уроку"
              className="crm-textarea resize-none"
            />
          </div>
        </div>

        {attendanceView === 'lesson' ? (
          <div className="crm-table-wrap overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th w-14">#</th>
                  <th className="crm-table-th">Ученик</th>
                  <th className="crm-table-th w-56">Контакты</th>
                  <th className="crm-table-th w-44">Статус ученика</th>
                  <th className="crm-table-th w-56">Посещаемость</th>
                  {showRedListActions ? <th className="crm-table-th w-44">Редлист</th> : null}
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {attendanceRows.length > 0 ? (
                  attendanceRows.map((student, index) => (
                    <tr key={student.id} className="crm-table-row">
                      <td className="crm-table-cell font-semibold text-[#273142]">
                        {index + 1}
                      </td>
                      <td className="crm-table-cell">
                        <Link prefetch={false}
                          href={`/students/${student.id}`}
                          className="font-semibold text-[#467aff] hover:underline"
                        >
                          {student.fullName}
                        </Link>
                      </td>
                      <td className="crm-table-cell">
                        <p className="text-sm text-[#273142]">
                          {student.phone || 'Телефон не указан'}
                        </p>
                        {student.parentName || student.parentPhone ? (
                          <p className="mt-1 text-xs text-[#7f8794]">
                            {student.parentName || 'Родитель'}
                            {student.parentPhone ? ` • ${student.parentPhone}` : ''}
                          </p>
                        ) : null}
                      </td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${STUDENT_STATUS_COLORS[student.studentStatus]}`}
                        >
                          {STUDENT_STATUS_LABELS[student.studentStatus]}
                        </span>
                      </td>
                      <td className="crm-table-cell">
                        {student.redList ? (
                          <RedListChip
                            fromDate={student.redList.redListFromDate}
                            toDate={student.redList.redListToDate}
                          />
                        ) : (
                        <select
                          value={student.status}
                          onChange={(event) =>
                            handleStatusChange(
                              student.id,
                              event.target.value as AttendanceStatus
                            )
                          }
                          className="crm-select h-9"
                        >
                          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        )}
                      </td>
                      {showRedListActions ? (
                        <td className="crm-table-cell">
                          {data.openRedListByStudentId[student.id] ? (
                            <button
                              type="button"
                              className="rounded-lg border border-[#dbe2e8] bg-white px-2 py-1 text-xs font-semibold text-[#467aff] transition-colors hover:bg-[#f0f5ff]"
                              onClick={() => openRedListAction(student.id, student.fullName)}
                              title={`В редлисте с ${formatRedListDate(data.openRedListByStudentId[student.id].fromDate)}`}
                            >
                              Вывести из редлиста
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg border border-[#e2e6ee] bg-white px-2 py-1 text-xs font-medium text-[#8a93a3] transition-colors hover:border-red-200 hover:text-red-600"
                              onClick={() => openRedListAction(student.id, student.fullName)}
                            >
                              Добавить в редлист
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td
                      colSpan={showRedListActions ? 6 : 5}
                      className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]"
                    >
                      Для этого урока пока нет учеников
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <AttendanceTotals statuses={markableRows.map((student) => student.status)} />
          </div>
        ) : !data.lesson.groupId ? (
          <div className="crm-surface-soft p-6 text-sm text-[#7f8794]">
            У этого урока нет привязанной группы, поэтому месячный табличный вид недоступен.
          </div>
        ) : data.monthlyError && data.monthlyLessons.length === 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {data.monthlyError}
          </div>
        ) : monthlyViewData && monthlyViewData.totalLessons > 0 ? (
          <AttendanceMonthlyTable
            monthLabel={monthlyViewData.monthLabel}
            groupName={data.groupName}
            totalLessons={monthlyViewData.totalLessons}
            lessonDaysCount={monthlyViewData.lessonDaysCount}
            totalStudents={monthlyViewData.totalStudents}
            lessonColumns={monthlyViewData.lessonColumns}
            rows={monthlyViewData.rows}
            onStatusChange={handleMonthlyStatusChange}
            onRedListAction={
              showRedListActions
                ? (row) => openRedListAction(row.studentId, row.fullName)
                : undefined
            }
          />
        ) : (
          <div className="crm-surface-soft p-6 text-sm text-[#7f8794]">
            В этом месяце по группе пока нет уроков для отображения в таблице.
          </div>
        )}
      </div>

      <Modal
        isOpen={isStudentPickerOpen}
        onClose={() => setIsStudentPickerOpen(false)}
        title="Добавить ученика в группу"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsStudentPickerOpen(false)}
              disabled={isAddingStudent}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddExistingStudent}
              disabled={!selectedStudentId || isAddingStudent}
            >
              {isAddingStudent ? 'Добавляем...' : 'Добавить'}
            </Button>
          </>
        }
      >
        <Select
          label="Ученик"
          value={selectedStudentId}
          onChange={(event) =>
            updateDraftState((previous) => ({
              ...previous,
              selectedStudentId: event.target.value,
            }))
          }
          helperText="Ученик будет добавлен в группу этого урока и появится в посещаемости."
        >
          <option value="">Выберите ученика</option>
          {data.availableStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {getStudentFullName(student)}
            </option>
          ))}
        </Select>
      </Modal>

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSave={(payload) => handleCreateStudent(payload as CreateStudentRequest)}
        isSubmitting={isAddingStudent}
        title="Создать ученика и добавить в группу"
      />

      <AssignSubstituteModal
        isOpen={isSubstituteModalOpen}
        onClose={() => setIsSubstituteModalOpen(false)}
        teacherName={data.teacherName}
        lessonDate={data.lesson.lessonDate}
        currentSubstituteId={data.lesson.substituteTeacherId}
        staffOptions={data.staffOptions}
        saving={isSavingLesson}
        onSave={handleAssignSubstitute}
        onSaveRange={data.lesson.groupId && data.lesson.teacherId ? handleAssignSubstituteRange : undefined}
      />

      {attendanceUnlock.modal}

      <RedListModal
        target={redListTarget}
        onClose={() => setRedListTarget(null)}
        onDone={async () => {
          setMonthlyAttendanceOverrides({});
          await refetch();
        }}
      />
    </div>
  );
}
