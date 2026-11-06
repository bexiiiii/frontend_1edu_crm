'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AxiosRequestConfig } from 'axios';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AddAttendanceModal } from '@/components/features/attendance/AddAttendanceModal';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  attendanceService,
  coursesService,
  lessonsService,
  roomsService,
  schedulesService,
  staffService,
  studentsService,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatFullName } from '@/lib/utils';
import { ExportExcelButton } from '@/components/analytics/ExportExcelButton';
import {
  fetchAllPages,
  mapWithConcurrency,
  type ExcelExportPeriod,
  type ExcelSheet,
} from '@/lib/excel-export';
import { useAttendanceUnlock } from '@/components/features/attendance/useAttendanceUnlock';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  formatLongRuDate,
  formatShortRuDate,
  formatTimeRange,
  isPresentStatus,
  toDateInputValue,
} from '@/constants/attendance';
import type { AttendanceDto, AttendanceStatus, CourseDto, LessonStatus, LessonType, StudentDto } from '@/lib/api/types';
import { cachedLookup } from '@/lib/lookup-cache';
import { useUrlState } from '@/hooks/useUrlState';

type AttendanceLessonRow = {
  id: string;
  title: string;
  subtitle: string;
  teacherId: string | null;
  teacherName: string;
  substituteTeacherId: string | null;
  substituteTeacherName: string;
  roomName: string;
  timeRange: string;
  groupId: string | null;
  courseId: string | null;
  status: LessonStatus;
  lessonType: LessonType;
  markedCount: number;
  totalStudents: number;
  presentCount: number;
};

const ATTENDANCE_EXPORT_MAX_LESSONS = 1500;

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  GROUP: 'Групповое занятие',
  INDIVIDUAL: 'Индивидуальное занятие',
  TRIAL: 'Пробный урок',
};

const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  PLANNED: 'Запланировано',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  TEACHER_ABSENT: 'Преподаватель отсутствует',
  TEACHER_SICK: 'Преподаватель болеет',
};

const LESSON_STATUS_COLORS: Record<LessonStatus, string> = {
  PLANNED: 'border-sky-200 bg-sky-100 text-sky-700',
  COMPLETED: 'border-green-200 bg-green-100 text-green-700',
  CANCELLED: 'border-red-200 bg-red-100 text-red-700',
  TEACHER_ABSENT: 'border-orange-200 bg-orange-100 text-orange-700',
  TEACHER_SICK: 'border-amber-200 bg-amber-100 text-amber-700',
};

function getStaffFullName(staff: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return formatFullName(staff);
}

function getMarkedCount(records: AttendanceDto[]): number {
  return records.filter((record) => record.status !== 'PLANNED').length;
}

function getPresentCount(records: AttendanceDto[]): number {
  return records.filter((record) => isPresentStatus(record.status)).length;
}

function getDominantAttendanceStatus(records: AttendanceDto[]): AttendanceStatus | null {
  if (records.length === 0) {
    return null;
  }

  const priority: AttendanceStatus[] = [
    'ABSENT',
    'SICK',
    'VACATION',
    'AUTO_ATTENDED',
    'ONE_TIME_VISIT',
    'WITHDRAWN',
    'ATTENDED',
    'PLANNED',
  ];

  for (const status of priority) {
    if (records.some((record) => record.status === status)) {
      return status;
    }
  }

  return null;
}

export default function AttendancePage() {
  const router = useRouter();
  const { roles, permissions } = useAuthStore();
  const canViewStaff = roles.includes('TENANT_ADMIN') || permissions.includes('STAFF_VIEW');
  // The chosen day lives in the URL (?date=YYYY-MM-DD): «Назад» from a lesson returns to the same day.
  const [dateParam, setDateParam] = useUrlState('date', toDateInputValue(new Date()));
  const selectedDate = useMemo(() => {
    const parsed = new Date(`${dateParam}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dateParam]);
  const setSelectedDate = (next: Date | ((previous: Date) => Date)) => {
    const value = typeof next === 'function' ? next(selectedDate) : next;
    setDateParam(toDateInputValue(value));
  };
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [attendanceModalState, setAttendanceModalState] = useState({
    key: 0,
    isOpen: false,
  });
  const selectedDateKey = useMemo(() => toDateInputValue(selectedDate), [selectedDate]);

  const { data, loading, error, refetch } = useApi(async () => {
    // 2026-11-04: reference lists are cached for 2 minutes (they were reloaded on every
    // date change), and the day comes in 2 requests instead of 1 + one per lesson + one per group.
    const LOOKUP_TTL_MS = 120_000;
    const staffPromise = canViewStaff
      ? cachedLookup('attendance:staff:500', LOOKUP_TTL_MS, () => staffService.getAll({ page: 0, size: 500 }))
      : Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 500 } });

    // Old path (one request per lesson): used only if the batch endpoint is unavailable.
    const loadDayPerLesson = async () => {
      const lessonsResponse = await lessonsService.getAll({ date: selectedDateKey, page: 0, size: 100 });
      const dayLessons = lessonsResponse.data.content ?? [];
      const entries = await Promise.all(
        dayLessons.map(async (lesson) => {
          try {
            const response = await attendanceService.getByLesson(lesson.id);
            return [lesson.id, response.data] as const;
          } catch {
            return [lesson.id, [] as AttendanceDto[]] as const;
          }
        })
      );
      return { lessons: dayLessons, attendanceByLessonId: Object.fromEntries(entries) as Record<string, AttendanceDto[]> };
    };

    const dayPromise = attendanceService
      .getDay(selectedDateKey, { page: 0, size: 100 })
      .then((response) => ({
        lessons: response.data.lessons.content ?? [],
        attendanceByLessonId: response.data.attendanceByLessonId ?? {},
      }))
      .catch(() => loadDayPerLesson());

    const [day, schedulesResponse, coursesResponse, staffResponse, roomsResponse] = await Promise.all([
      dayPromise,
      cachedLookup('attendance:schedules:1000', LOOKUP_TTL_MS, () => schedulesService.getAll({ page: 0, size: 1000 })),
      cachedLookup('attendance:courses:500', LOOKUP_TTL_MS, () => coursesService.getAll({ page: 0, size: 500 }))
        .catch(() => ({ data: { content: [] } })),
      staffPromise,
      cachedLookup('attendance:rooms:300', LOOKUP_TTL_MS, () => roomsService.getAll({ page: 0, size: 300 })),
    ]);

    const lessons = day.lessons;
    const schedules = schedulesResponse.data.content ?? [];
    const scheduleCourseMap = new Map(schedules.map((s) => [s.id, s.courseId]));

    const groupIds = Array.from(new Set(lessons.map((lesson) => lesson.groupId).filter((groupId): groupId is string => Boolean(groupId))));

    type GroupPage = { content?: StudentDto[]; totalElements?: number };
    const fetchGroupPages = async (ids: string[]): Promise<Record<string, GroupPage> | null> => {
      if (ids.length === 0) return {};
      try {
        const response = await studentsService.getByGroups(ids, { page: 0, size: 500 });
        return response.data ?? {};
      } catch {
        return null;
      }
    };

    // Same rules as before: a group with no students falls back to its course id.
    const loadGroupPerRequest = async (groupId: string) => {
      try {
        let response = await studentsService.getByGroup(groupId, { page: 0, size: 500 });
        let content = response.data.content ?? [];
        let total = response.data.totalElements ?? content.length;
        const courseId = scheduleCourseMap.get(groupId);
        if (content.length === 0 && courseId && courseId !== groupId) {
          const courseStudents = await studentsService.getByGroup(courseId, { page: 0, size: 500 }).catch(() => null);
          if (courseStudents && (courseStudents.data.content ?? []).length > 0) {
            content = courseStudents.data.content ?? [];
            total = courseStudents.data.totalElements ?? content.length;
          }
        }
        return [groupId, { count: total, students: content }] as const;
      } catch {
        return [groupId, { count: 0, students: [] as StudentDto[] }] as const;
      }
    };

    let groupEntries: ReadonlyArray<readonly [string, { count: number; students: StudentDto[] }]>;
    const groupPages = await fetchGroupPages(groupIds);
    if (groupPages === null) {
      groupEntries = await Promise.all(groupIds.map(loadGroupPerRequest));
    } else {
      const fallbackCourseIds = Array.from(new Set(groupIds
        .filter((groupId) => groupPages[groupId] && (groupPages[groupId].content ?? []).length === 0)
        .map((groupId) => scheduleCourseMap.get(groupId))
        .filter((courseId): courseId is string => Boolean(courseId))));
      const coursePages = fallbackCourseIds.length > 0 ? await fetchGroupPages(fallbackCourseIds) : {};
      groupEntries = await Promise.all(groupIds.map(async (groupId) => {
        const page = groupPages[groupId];
        if (!page) {
          return [groupId, { count: 0, students: [] as StudentDto[] }] as const;
        }
        let content = page.content ?? [];
        let total = page.totalElements ?? content.length;
        const courseId = scheduleCourseMap.get(groupId);
        if (content.length === 0 && courseId && courseId !== groupId) {
          if (coursePages === null) {
            return loadGroupPerRequest(groupId);
          }
          const coursePage = coursePages[courseId] ?? null;
          if (coursePage && (coursePage.content ?? []).length > 0) {
            content = coursePage.content ?? [];
            total = coursePage.totalElements ?? content.length;
          }
        }
        return [groupId, { count: total, students: content }] as const;
      }));
    }

    return {
      data: {
        lessons,
        schedules,
        courses: (coursesResponse.data.content ?? []) as CourseDto[],
        staff: staffResponse.data.content ?? [],
        rooms: roomsResponse.data.content ?? [],
        groupSizeById: Object.fromEntries(groupEntries.map(([groupId, value]) => [groupId, value.count])),
        groupStudentsById: Object.fromEntries(groupEntries.map(([groupId, value]) => [groupId, value.students])),
        attendanceByLessonId: day.attendanceByLessonId,
      },
    };
  }, [selectedDateKey, canViewStaff]);

  const lessonsForDay = useMemo<AttendanceLessonRow[]>(() => {
    const schedulesMap = new Map((data?.schedules ?? []).map((schedule) => [schedule.id, schedule]));
    const coursesMap = new Map((data?.courses ?? []).map((course) => [course.id, course]));
    const staffMap = new Map((data?.staff ?? []).map((staff) => [staff.id, getStaffFullName(staff) || 'Без имени']));
    const roomsMap = new Map((data?.rooms ?? []).map((room) => [room.id, room.name]));
    const attendanceByLessonId = data?.attendanceByLessonId ?? {};
    const groupSizeById = data?.groupSizeById ?? {};

    return (data?.lessons ?? []).map((lesson) => {
      const schedule = lesson.groupId ? schedulesMap.get(lesson.groupId) : undefined;
      const course = schedule?.courseId
        ? coursesMap.get(schedule.courseId)
        : (lesson.groupId ? coursesMap.get(lesson.groupId) : undefined);

      const isIndividual = course?.type === 'INDIVIDUAL' || lesson.lessonType === 'INDIVIDUAL';
      const actualType: LessonType = isIndividual ? 'INDIVIDUAL' : (lesson.lessonType || 'GROUP');

      const courseName = course?.name || '';
      const scheduleName = schedule?.name || '';

      let title = '';
      if (courseName && scheduleName && courseName !== scheduleName) {
        title = `${courseName} (${scheduleName})`;
      } else if (courseName) {
        title = courseName;
      } else if (scheduleName) {
        title = scheduleName;
      } else if (lesson.topic?.trim()) {
        title = lesson.topic.trim();
      } else {
        title = LESSON_TYPE_LABELS[actualType];
      }

      const subtitleParts = [
        isIndividual
          ? 'Индивидуальное занятие'
          : (title !== scheduleName && scheduleName ? `Группа: ${scheduleName}` : LESSON_TYPE_LABELS[actualType]),
        lesson.topic?.trim() ? `Тема: ${lesson.topic.trim()}` : '',
      ].filter(Boolean);

      const records = attendanceByLessonId[lesson.id] ?? [];

      return {
        id: lesson.id,
        title,
        subtitle: subtitleParts.join(' • '),
        teacherId: lesson.teacherId || null,
        teacherName: lesson.teacherId ? staffMap.get(lesson.teacherId) || 'Не назначен' : 'Не назначен',
        substituteTeacherId: lesson.substituteTeacherId || null,
        substituteTeacherName: lesson.substituteTeacherId
          ? staffMap.get(lesson.substituteTeacherId) || 'Не назначен'
          : '',
        roomName: lesson.roomId ? roomsMap.get(lesson.roomId) || 'Не указан' : 'Не указан',
        timeRange: formatTimeRange(lesson.startTime, lesson.endTime),
        groupId: lesson.groupId,
        courseId: course?.id || schedule?.courseId || null,
        status: lesson.status,
        lessonType: actualType,
        markedCount: getMarkedCount(records),
        totalStudents: lesson.groupId ? groupSizeById[lesson.groupId] ?? records.length : records.length,
        presentCount: getPresentCount(records),
      };
    });
  }, [data]);

  // Search over the loaded day (?q=): course / group / teacher / room / student of the group.
  const [searchParam, setSearchParam] = useUrlState('q');
  const [searchInput, setSearchInput] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam.trim().toLowerCase());
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
      setSearchParam(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParam]);
  const visibleLessons = useMemo(() => {
    if (!debouncedSearch) return lessonsForDay;
    const groupStudentsById = data?.groupStudentsById ?? {};
    return lessonsForDay.filter((lesson) => {
      const students = lesson.groupId ? groupStudentsById[lesson.groupId] ?? [] : [];
      const haystack = [
        lesson.title,
        lesson.subtitle,
        lesson.teacherName,
        lesson.substituteTeacherName,
        lesson.roomName,
        ...students.map((student) =>
          [student.lastName, student.firstName, student.middleName, student.fullName].filter(Boolean).join(' ')),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [data?.groupStudentsById, debouncedSearch, lessonsForDay]);

  const createAttendanceMutation = useMutation(
    ({
      lessonId,
      payload,
      requestConfig,
    }: {
      lessonId: string;
      payload: { studentId: string; status: AttendanceStatus; notes?: string; unlockReason?: string };
      requestConfig?: AxiosRequestConfig;
    }) => attendanceService.mark(lessonId, payload, requestConfig)
  );
  const attendanceUnlock = useAttendanceUnlock();

  const attendanceLessonOptions = useMemo(() => {
    const groupStudentsById = data?.groupStudentsById ?? {};

    return lessonsForDay.map((lesson) => ({
      id: lesson.id,
      label: `${lesson.timeRange} · ${lesson.title}`,
      studentOptions: lesson.groupId
        ? (groupStudentsById[lesson.groupId] ?? []).map((student) => ({
            id: student.id,
            name: [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ') || student.fullName || student.id,
          }))
        : [],
    }));
  }, [data?.groupStudentsById, lessonsForDay]);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  // «Скачать в Excel»: lessons of the chosen period + every attendance mark.
  const buildAttendanceExcel = async (period: ExcelExportPeriod): Promise<ExcelSheet[]> => {
    const [lessons, schedules, courses, staff, rooms, students] = await Promise.all([
      fetchAllPages((pageNum, size) => lessonsService.getAll({ from: period.from, to: period.to, page: pageNum, size })),
      fetchAllPages((pageNum, size) => schedulesService.getAll({ page: pageNum, size })),
      fetchAllPages((pageNum, size) => coursesService.getAll({ page: pageNum, size })).catch(() => [] as CourseDto[]),
      canViewStaff ? fetchAllPages((pageNum, size) => staffService.getAll({ page: pageNum, size })) : Promise.resolve([]),
      fetchAllPages((pageNum, size) => roomsService.getAll({ page: pageNum, size })),
      fetchAllPages((pageNum, size) => studentsService.getAll({ page: pageNum, size, includeDeleted: true })).catch(() => []),
    ]);

    const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, schedule]));
    const courseMap = new Map(courses.map((course) => [course.id, course]));
    const staffMap = new Map(staff.map((member) => [member.id, getStaffFullName(member) || 'Без имени']));
    const roomMap = new Map(rooms.map((room) => [room.id, room.name]));
    const studentMap = new Map(students.map((student) => [student.id, formatFullName(student) || student.fullName || '']));

    const sortedLessons = [...lessons].sort((left, right) =>
      left.lessonDate.localeCompare(right.lessonDate) || (left.startTime || '').localeCompare(right.startTime || ''));

    const canLoadMarks = sortedLessons.length <= ATTENDANCE_EXPORT_MAX_LESSONS;
    const marks = canLoadMarks
      ? await mapWithConcurrency(sortedLessons, 6, async (lesson) =>
        attendanceService.getByLesson(lesson.id).then((response) => response.data ?? []).catch(() => [] as AttendanceDto[]))
      : [];

    const describeLesson = (lesson: (typeof sortedLessons)[number]) => {
      const schedule = lesson.groupId ? scheduleMap.get(lesson.groupId) : undefined;
      const course = schedule?.courseId ? courseMap.get(schedule.courseId) : (lesson.groupId ? courseMap.get(lesson.groupId) : undefined);
      const isIndividual = course?.type === 'INDIVIDUAL' || lesson.lessonType === 'INDIVIDUAL';
      return {
        title: course?.name || schedule?.name || lesson.topic?.trim() || LESSON_TYPE_LABELS[lesson.lessonType] || '',
        group: schedule?.name || '',
        type: LESSON_TYPE_LABELS[isIndividual ? 'INDIVIDUAL' : (lesson.lessonType || 'GROUP')],
        time: formatTimeRange(lesson.startTime, lesson.endTime),
      };
    };

    const lessonRows = sortedLessons.map((lesson, index) => {
      const info = describeLesson(lesson);
      const records = marks[index] ?? [];
      return [
        lesson.lessonDate,
        info.time,
        info.title,
        info.group,
        info.type,
        lesson.teacherId ? staffMap.get(lesson.teacherId) || '' : '',
        lesson.substituteTeacherId ? staffMap.get(lesson.substituteTeacherId) || '' : '',
        lesson.roomId ? roomMap.get(lesson.roomId) || '' : '',
        LESSON_STATUS_LABELS[lesson.status] ?? lesson.status,
        canLoadMarks ? getMarkedCount(records) : null,
        canLoadMarks ? getPresentCount(records) : null,
        lesson.topic || '',
      ];
    });

    const markRows = sortedLessons.flatMap((lesson, index) => {
      const info = describeLesson(lesson);
      return (marks[index] ?? []).map((record) => [
        lesson.lessonDate,
        info.time,
        info.title,
        studentMap.get(record.studentId) || record.studentId,
        ATTENDANCE_STATUS_LABELS[record.status] ?? record.status,
        record.notes || '',
      ]);
    });

    return [
      {
        name: 'Занятия',
        tables: [{
          columns: [
            { header: 'Дата', type: 'date' },
            { header: 'Время' },
            { header: 'Занятие' },
            { header: 'Группа' },
            { header: 'Тип' },
            { header: 'Преподаватель' },
            { header: 'Замена' },
            { header: 'Кабинет' },
            { header: 'Статус' },
            { header: 'Отмечено', type: 'number' },
            { header: 'Присутствовали', type: 'number' },
            { header: 'Тема' },
          ],
          rows: lessonRows,
        }],
      },
      {
        name: 'Отметки',
        tables: [{
          title: canLoadMarks
            ? undefined
            : `Слишком много занятий (${sortedLessons.length}) — отметки выгружаются для периода до ${ATTENDANCE_EXPORT_MAX_LESSONS} занятий. Выберите период короче.`,
          columns: [
            { header: 'Дата', type: 'date' },
            { header: 'Время' },
            { header: 'Занятие' },
            { header: 'Ученик' },
            { header: 'Отметка' },
            { header: 'Заметка' },
          ],
          rows: markRows,
        }],
      },
    ];
  };

  const changeDay = (direction: -1 | 1) => {
    setSelectedDate((previous) => {
      const nextDate = new Date(previous);
      nextDate.setDate(previous.getDate() + direction);
      return nextDate;
    });
  };

  const openAttendanceModal = () => {
    setAttendanceModalState((previous) => ({
      key: previous.key + 1,
      isOpen: true,
    }));
  };

  const closeAttendanceModal = () => {
    setAttendanceModalState((previous) => ({
      ...previous,
      isOpen: false,
    }));
  };

  const handleCreateAttendance = async (data: {
    lessonId: string;
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }) => {
    await attendanceUnlock.run((unlockReason, requestConfig) =>
      createAttendanceMutation.mutate({
        requestConfig,
        lessonId: data.lessonId,
        payload: {
          studentId: data.studentId,
          status: data.status,
          notes: data.notes,
          unlockReason,
        },
      })
    );
    closeAttendanceModal();
    await refetch();
  };

  return (
    <div className="space-y-4">
      <div className="crm-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#1f2530]">{formatLongRuDate(selectedDate)}</p>
            <p className="mt-1 text-sm text-[#7f8794]">{formatShortRuDate(selectedDate)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => changeDay(-1)} icon={ChevronLeft}>
              Назад
            </Button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDateKey}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }

                setSelectedDate(new Date(`${event.target.value}T00:00:00`));
              }}
              className="sr-only"
            />
            <Button variant="secondary" icon={CalendarDays} onClick={openDatePicker}>
              Календарь
            </Button>
            <Button variant="secondary" onClick={() => changeDay(1)} icon={ChevronRight}>
              Вперёд
            </Button>
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96a0af]" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ученик, группа, курс, преподаватель"
                aria-label="Поиск по занятиям дня"
                className="crm-input crm-input-with-icon w-72"
              />
            </label>
            <ExportExcelButton
              page="attendance"
              filePrefix=""
              reportTitle="Журнал посещаемости"
              defaultRange={{ from: selectedDateKey, to: selectedDateKey }}
              buildSheets={buildAttendanceExcel}
              hint={`Отметки учеников выгружаются, если в периоде не больше ${ATTENDANCE_EXPORT_MAX_LESSONS} занятий.`}
            />
            <Button onClick={openAttendanceModal} icon={Plus} disabled={lessonsForDay.length === 0} className="hidden">
              Добавить посещение
            </Button>
            <Button variant="ghost" onClick={() => void refetch()} disabled={loading} className="hidden">
              Обновить
            </Button>
          </div>
        </div>

        

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="crm-table-wrap overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th w-14">№</th>
                <th className="crm-table-th w-44">Время</th>
                <th className="crm-table-th">Занятие</th>
                <th className="crm-table-th w-64">Преподаватель</th>
                <th className="crm-table-th w-48">Кабинет</th>
                <th className="crm-table-th w-48">Посещаемость</th>
                <th className="crm-table-th w-44">Статус</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {visibleLessons.length > 0 ? (
                visibleLessons.map((lesson, index) => {
                  const attendanceStatus = getDominantAttendanceStatus(
                    (data?.attendanceByLessonId ?? {})[lesson.id] ?? []
                  );

                  return (
                    <tr
                      key={lesson.id}
                      onClick={() => router.push(`/attendance/${lesson.id}`)}
                      className="crm-table-row cursor-pointer"
                    >
                      <td className="crm-table-cell font-semibold text-[#273142]">{index + 1}</td>
                      <td className="crm-table-cell">
                        <div className="inline-flex rounded-lg bg-[#eef6ff] px-3 py-1 text-sm font-semibold text-[#2b6ecb]">
                          {lesson.timeRange}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <Link prefetch={false}
                          href={`/attendance/${lesson.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-[#273142] transition-colors hover:text-[#467aff] hover:underline"
                        >
                          {lesson.title}
                        </Link>
                        <p className="mt-1 text-xs text-[#667084]">
                          {lesson.courseId ? (
                            <Link prefetch={false}
                              href={`/classes/${lesson.courseId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="transition-colors hover:text-[#467aff] hover:underline"
                            >
                              {lesson.subtitle || LESSON_TYPE_LABELS[lesson.lessonType]}
                            </Link>
                          ) : (
                            lesson.subtitle || LESSON_TYPE_LABELS[lesson.lessonType]
                          )}
                        </p>
                      </td>
                      <td className="crm-table-cell">
                        {lesson.teacherId ? (
                          <Link prefetch={false}
                            href={`/staff/${lesson.teacherId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-[#273142] transition-colors hover:text-[#467aff] hover:underline"
                          >
                            {lesson.teacherName}
                          </Link>
                        ) : (
                          <p className="font-medium text-[#273142]">{lesson.teacherName}</p>
                        )}
                        {lesson.substituteTeacherName ? (
                          <p className="mt-1 text-xs text-[#667084]">
                            Замена:{' '}
                            {lesson.substituteTeacherId ? (
                              <Link prefetch={false}
                                href={`/staff/${lesson.substituteTeacherId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="transition-colors hover:text-[#467aff] hover:underline"
                              >
                                {lesson.substituteTeacherName}
                              </Link>
                            ) : (
                              lesson.substituteTeacherName
                            )}
                          </p>
                        ) : null}
                      </td>
                      <td className="crm-table-cell">
                        <p className="font-medium text-[#273142]">{lesson.roomName}</p>
                      </td>
                      <td className="crm-table-cell">
                        <p className="font-medium text-[#273142]">
                          Отмечено {lesson.markedCount} из {lesson.totalStudents}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-md bg-[#eef6ff] px-2 py-0.5 text-xs font-semibold text-[#2b6ecb]">
                            Посетили: {lesson.presentCount}
                          </span>
                          {attendanceStatus ? (
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${ATTENDANCE_STATUS_COLORS[attendanceStatus]}`}
                            >
                              {ATTENDANCE_STATUS_LABELS[attendanceStatus]}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${LESSON_STATUS_COLORS[lesson.status]}`}
                        >
                          {LESSON_STATUS_LABELS[lesson.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="crm-table-row">
                  <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                    На выбранную дату занятий нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddAttendanceModal
        key={attendanceModalState.key}
        isOpen={attendanceModalState.isOpen}
        onClose={closeAttendanceModal}
        onSave={handleCreateAttendance}
        lessons={attendanceLessonOptions}
        isSubmitting={createAttendanceMutation.loading}
      />

      {attendanceUnlock.modal}
    </div>
  );
}
