'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { analyticsService, staffService } from '@/lib/api';
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from '@/constants/attendance';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type {
  AttendanceStatus,
  StudentStatus,
  TeacherCourseAttendanceLessonDayDto,
  TeacherCourseAttendanceResponse,
  TeacherCourseAttendanceStudentRowDto,
} from '@/lib/api/types';

function toCurrentMonth(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 7);
}

function formatMonthTitle(monthValue: string): string {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return '—';

  const date = new Date(year, month - 1, 1);
  const title = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return title[0]?.toUpperCase() + title.slice(1);
}

function formatLessonDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: 'numeric' });
}

function formatLessonWeekday(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '').toUpperCase();
}

type SelectOption = {
  id: string;
  name: string;
};

function getStatusFromCell(status?: AttendanceStatus): AttendanceStatus {
  return status || 'NOT_MARKED';
}

function toneClass(rate: number) {
  if (rate >= 90) return 'text-emerald-700';
  if (rate >= 75) return 'text-sky-700';
  if (rate >= 50) return 'text-amber-700';
  return 'text-rose-700';
}

export default function TeacherCourseAttendancePage() {
  const [teacherId, setTeacherId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(toCurrentMonth);

  const { data: teachersPage, loading: teachersLoading } = useApi(
    () => staffService.getTeachers({ page: 0, size: 500 }),
    []
  );

  const teachers = useMemo(
    () =>
      (teachersPage?.content || [])
        .map((teacher) => ({ id: teacher.id, name: teacher.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU')),
    [teachersPage]
  );

  useEffect(() => {
    if (!teacherId && teachers.length > 0) {
      setTeacherId(teachers[0].id);
    }
  }, [teacherId, teachers]);

  const { data: teacherCoursesResponse, loading: teacherCoursesLoading } = useApi(
    async () => {
      if (!teacherId) {
        return { data: [] as SelectOption[] };
      }

      const response = await analyticsService.getTeacherCourseAttendanceCourses({ teacherId });
      return {
        data: (response.data || []).map((course) => ({ id: course.id, name: course.name })),
      };
    },
    [teacherId]
  );

  const teacherCourses = useMemo(() => teacherCoursesResponse || [], [teacherCoursesResponse]);

  useEffect(() => {
    if (teacherCourses.length === 0) {
      if (courseId) setCourseId('');
      return;
    }

    if (!teacherCourses.some((course) => course.id === courseId)) {
      setCourseId(teacherCourses[0].id);
    }
  }, [courseId, teacherCourses]);

  const { data: attendance, loading: attendanceLoading, error: attendanceError } = useApi(
    async () => {
      if (!teacherId || !courseId) {
        return { data: null as TeacherCourseAttendanceResponse | null };
      }

      const response = await analyticsService.getTeacherCourseAttendance({ teacherId, courseId, month: selectedMonth });
      return { data: response.data };
    },
    [teacherId, courseId, selectedMonth]
  );

  const lessonDays: TeacherCourseAttendanceLessonDayDto[] = useMemo(
    () => [...(attendance?.lessonDays || [])].sort((left, right) => left.date.localeCompare(right.date)),
    [attendance]
  );
  const students: TeacherCourseAttendanceStudentRowDto[] = useMemo(() => attendance?.students || [], [attendance]);

  const loading = teachersLoading || teacherCoursesLoading || attendanceLoading;

  const handleTeacherChange = (nextTeacherId: string) => {
    setTeacherId(nextTeacherId);
    setCourseId('');
  };

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">Преподаватель</p>
            <select value={teacherId} onChange={(event) => handleTeacherChange(event.target.value)} className="crm-select">
              {teachers.length === 0 ? <option value="">Преподаватели не найдены</option> : null}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">Курс</p>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="crm-select"
              disabled={!teacherId || teacherCoursesLoading || teacherCourses.length === 0}
            >
              {!teacherId ? <option value="">Сначала выберите преподавателя</option> : null}
              {teacherCoursesLoading ? <option value="">Загрузка курсов...</option> : null}
              {!teacherCoursesLoading && teacherCourses.length === 0 && teacherId ? (
                <option value="">У преподавателя нет доступных курсов</option>
              ) : null}
              {teacherCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a8391]">Месяц</p>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value || toCurrentMonth())}
              className="crm-select"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="crm-surface flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : attendanceError ? (
        <div className="crm-surface border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Не удалось загрузить pivot-таблицу: {attendanceError}
        </div>
      ) : attendance ? (
        <div className="crm-table-wrap overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th sticky left-0 z-20 min-w-56 border border-[#e4eaf0] bg-[#f6f8fa]">Ученик</th>
                  {lessonDays.map((lessonDay) => (
                    <th key={lessonDay.lessonId} className="crm-table-th min-w-24 border border-[#e4eaf0] text-center">
                      <div className="flex flex-col items-center gap-0.5 px-1">
                        <span className="text-xs font-bold text-[#657287]">{formatLessonDay(lessonDay.date)}</span>
                        <span className="text-[10px] uppercase tracking-[0.06em] text-[#627084]">
                          {formatLessonWeekday(lessonDay.date)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="crm-table-th min-w-24 border border-[#e4eaf0] bg-[#f6f8fa] text-center">Посетил</th>
                  <th className="crm-table-th min-w-24 border border-[#e4eaf0] bg-[#f6f8fa] text-center">Отмечено</th>
                  <th className="crm-table-th min-w-24 border border-[#e4eaf0] bg-[#f6f8fa] text-center">Ритм</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {students.length > 0 ? (
                  students.map((row) => (
                    <tr key={row.studentId} className="crm-table-row">
                      <td className="crm-table-cell sticky left-0 z-10 border border-[#e4eaf0] bg-[#fbfcfd]">
                        <div>
                          <p className="font-semibold text-[#273142]">{row.studentName}</p>
                          <span
                            className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${STUDENT_STATUS_COLORS[row.studentStatus as StudentStatus]}`}
                          >
                            {STUDENT_STATUS_LABELS[row.studentStatus as StudentStatus]}
                          </span>
                        </div>
                      </td>

                      {lessonDays.map((lessonDay, index) => {
                        const cell = row.attendance[index] || row.attendance.find((item) => item.lessonId === lessonDay.lessonId);
                        const status = getStatusFromCell(cell?.status);

                        return (
                          <td key={`${row.studentId}-${lessonDay.lessonId}`} className="crm-table-cell border border-[#e4eaf0] p-1">
                            <div className="flex min-h-12 items-center justify-center">
                              <span
                                className={`inline-flex w-full justify-center rounded-md border px-2 py-1.5 text-[10px] font-semibold leading-tight ${ATTENDANCE_STATUS_COLORS[status]}`}
                              >
                                {ATTENDANCE_STATUS_LABELS[status]}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      <td className="crm-table-cell border border-[#e4eaf0] text-center">
                        <span className="font-semibold text-[#273142]">
                          {row.attendedCount} / {row.totalLessons}
                        </span>
                      </td>
                      <td className="crm-table-cell border border-[#e4eaf0] bg-[#f8fafc] text-center">
                        <span className="font-semibold text-[#273142]">
                          {row.markedCount} / {row.totalLessons}
                        </span>
                      </td>
                      <td className="crm-table-cell border border-[#e4eaf0] bg-[#f8fafc] text-center">
                        <span className={`font-semibold ${toneClass(row.rhythmPercent)}`}>
                          {Math.round(row.rhythmPercent)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={lessonDays.length + 4} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Нет данных для отображения pivot-таблицы посещаемости.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="crm-surface py-10 text-center text-sm text-[#8a93a3]">
          Выберите преподавателя, курс и месяц для загрузки отчёта.
        </div>
      )}
    </div>
  );
}
