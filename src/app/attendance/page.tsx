'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AddAttendanceModal } from '@/components/features/attendance/AddAttendanceModal';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  attendanceService,
  lessonsService,
  roomsService,
  schedulesService,
  staffService,
  studentsService,
} from '@/lib/api';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  formatLongRuDate,
  formatShortRuDate,
  formatTimeRange,
  isPresentStatus,
  toDateInputValue,
} from '@/constants/attendance';
import type { AttendanceDto, AttendanceStatus, LessonStatus, LessonType } from '@/lib/api/types';

type AttendanceLessonRow = {
  id: string;
  title: string;
  subtitle: string;
  teacherName: string;
  substituteTeacherName: string;
  roomName: string;
  timeRange: string;
  groupId: string | null;
  status: LessonStatus;
  lessonType: LessonType;
  markedCount: number;
  totalStudents: number;
  presentCount: number;
};

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
  if (staff.fullName?.trim()) {
    return staff.fullName.trim();
  }

  return [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ');
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
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [attendanceModalState, setAttendanceModalState] = useState({
    key: 0,
    isOpen: false,
  });
  const selectedDateKey = useMemo(() => toDateInputValue(selectedDate), [selectedDate]);

  const { data, loading, error, refetch } = useApi(async () => {
    const [lessonsResponse, schedulesResponse, staffResponse, roomsResponse] = await Promise.all([
      lessonsService.getAll({ date: selectedDateKey, page: 0, size: 100 }),
      schedulesService.getAll({ page: 0, size: 1000 }),
      staffService.getAll({ page: 0, size: 500 }),
      roomsService.getAll({ page: 0, size: 300 }),
    ]);

    const lessons = lessonsResponse.data.content ?? [];
    const groupIds = Array.from(new Set(lessons.map((lesson) => lesson.groupId).filter((groupId): groupId is string => Boolean(groupId))));

    const [groupEntries, attendanceEntries] = await Promise.all([
      Promise.all(
        groupIds.map(async (groupId) => {
          try {
            const response = await studentsService.getByGroup(groupId, { page: 0, size: 500 });
            return [
              groupId,
              {
                count: response.data.totalElements ?? response.data.content.length,
                students: response.data.content ?? [],
              },
            ] as const;
          } catch {
            return [groupId, { count: 0, students: [] }] as const;
          }
        })
      ),
      Promise.all(
        lessons.map(async (lesson) => {
          try {
            const response = await attendanceService.getByLesson(lesson.id);
            return [lesson.id, response.data] as const;
          } catch {
            return [lesson.id, [] as AttendanceDto[]] as const;
          }
        })
      ),
    ]);

    return {
      data: {
        lessons,
        schedules: schedulesResponse.data.content ?? [],
        staff: staffResponse.data.content ?? [],
        rooms: roomsResponse.data.content ?? [],
        groupSizeById: Object.fromEntries(groupEntries.map(([groupId, value]) => [groupId, value.count])),
        groupStudentsById: Object.fromEntries(groupEntries.map(([groupId, value]) => [groupId, value.students])),
        attendanceByLessonId: Object.fromEntries(attendanceEntries),
      },
    };
  }, [selectedDateKey]);

  const lessonsForDay = useMemo<AttendanceLessonRow[]>(() => {
    const schedulesMap = new Map((data?.schedules ?? []).map((schedule) => [schedule.id, schedule.name]));
    const staffMap = new Map((data?.staff ?? []).map((staff) => [staff.id, getStaffFullName(staff) || 'Без имени']));
    const roomsMap = new Map((data?.rooms ?? []).map((room) => [room.id, room.name]));
    const attendanceByLessonId = data?.attendanceByLessonId ?? {};
    const groupSizeById = data?.groupSizeById ?? {};

    return (data?.lessons ?? []).map((lesson) => {
      const groupName = lesson.groupId ? schedulesMap.get(lesson.groupId) || 'Без названия группы' : '';
      const title =
        groupName || lesson.topic?.trim() || LESSON_TYPE_LABELS[lesson.lessonType];
      const subtitleParts = [
        groupName && lesson.topic?.trim() ? `Тема: ${lesson.topic.trim()}` : '',
        !groupName ? LESSON_TYPE_LABELS[lesson.lessonType] : '',
      ].filter(Boolean);
      const records = attendanceByLessonId[lesson.id] ?? [];

      return {
        id: lesson.id,
        title,
        subtitle: subtitleParts.join(' • '),
        teacherName: lesson.teacherId ? staffMap.get(lesson.teacherId) || 'Не назначен' : 'Не назначен',
        substituteTeacherName: lesson.substituteTeacherId
          ? staffMap.get(lesson.substituteTeacherId) || 'Не назначен'
          : '',
        roomName: lesson.roomId ? roomsMap.get(lesson.roomId) || 'Не указан' : 'Не указан',
        timeRange: formatTimeRange(lesson.startTime, lesson.endTime),
        groupId: lesson.groupId,
        status: lesson.status,
        lessonType: lesson.lessonType,
        markedCount: getMarkedCount(records),
        totalStudents: lesson.groupId ? groupSizeById[lesson.groupId] ?? records.length : records.length,
        presentCount: getPresentCount(records),
      };
    });
  }, [data]);

  const createAttendanceMutation = useMutation(
    ({
      lessonId,
      payload,
    }: {
      lessonId: string;
      payload: { studentId: string; status: AttendanceStatus; notes?: string };
    }) => attendanceService.mark(lessonId, payload)
  );

  const attendanceLessonOptions = useMemo(() => {
    const groupStudentsById = data?.groupStudentsById ?? {};

    return lessonsForDay.map((lesson) => ({
      id: lesson.id,
      label: `${lesson.timeRange} · ${lesson.title}`,
      studentOptions: lesson.groupId
        ? (groupStudentsById[lesson.groupId] ?? []).map((student) => ({
            id: student.id,
            name: student.fullName || [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ') || student.id,
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
    await createAttendanceMutation.mutate({
      lessonId: data.lessonId,
      payload: {
        studentId: data.studentId,
        status: data.status,
        notes: data.notes,
      },
    });
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
              {lessonsForDay.length > 0 ? (
                lessonsForDay.map((lesson, index) => {
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
                        <p className="font-semibold text-[#273142]">{lesson.title}</p>
                        <p className="mt-1 text-xs text-[#667084]">
                          {lesson.subtitle || LESSON_TYPE_LABELS[lesson.lessonType]}
                        </p>
                      </td>
                      <td className="crm-table-cell">
                        <p className="font-medium text-[#273142]">{lesson.teacherName}</p>
                        {lesson.substituteTeacherName ? (
                          <p className="mt-1 text-xs text-[#667084]">
                            Замена: {lesson.substituteTeacherName}
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
    </div>
  );
}
