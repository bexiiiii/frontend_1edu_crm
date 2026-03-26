'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Save, UserPlus, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { AddStudentModal } from '@/components/features/students/AddStudentModal';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  attendanceService,
  lessonsService,
  roomsService,
  schedulesService,
  staffService,
  studentsService,
  type CreateStudentRequest,
} from '@/lib/api';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
  formatLongRuDate,
  formatShortRuDate,
  formatTimeRange,
  isPresentStatus,
} from '@/constants/attendance';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type { AttendanceStatus, StudentDto } from '@/lib/api/types';

type LessonAttendanceData = {
  lesson: Awaited<ReturnType<typeof lessonsService.getById>>['data'];
  groupName: string;
  roomName: string;
  teacherName: string;
  substituteTeacherName: string;
  students: StudentDto[];
  attendanceRecords: Awaited<ReturnType<typeof attendanceService.getByLesson>>['data'];
  availableStudents: StudentDto[];
};

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
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

export default function AttendanceLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonIdParam = params.lessonId;
  const lessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam;

  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AttendanceStatus>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

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

      const currentStudentIds = new Set(students.map((student) => student.id));
      availableStudents = (allStudentsResponse.data.content ?? []).filter(
        (student) => !currentStudentIds.has(student.id)
      );
    }

    const knownStudentIds = new Set(students.map((student) => student.id));
    const missingStudentIds = Array.from(
      new Set(
        (attendanceResponse.data ?? [])
          .map((record) => record.studentId)
          .filter((studentId) => !knownStudentIds.has(studentId))
      )
    );

    if (missingStudentIds.length > 0) {
      const extraStudents = await Promise.all(missingStudentIds.map((studentId) => getStudentByIdSafe(studentId)));
      students = [...students, ...extraStudents.filter(Boolean)];
    }

    const staffMap = new Map(
      (staffResponse.data.content ?? []).map((staff) => [staff.id, getStaffFullName(staff) || 'Без имени'])
    );

    return {
      data: {
        lesson,
        groupName: scheduleResponse?.data.name ?? 'Без группы',
        roomName: roomResponse?.data.name ?? 'Не указан',
        teacherName: lesson.teacherId ? staffMap.get(lesson.teacherId) || 'Не назначен' : 'Не назначен',
        substituteTeacherName: lesson.substituteTeacherId
          ? staffMap.get(lesson.substituteTeacherId) || 'Не назначен'
          : '',
        students,
        attendanceRecords: attendanceResponse.data ?? [],
        availableStudents,
      },
    };
  }, [lessonId]);

  const saveLessonMutation = useMutation(
    ({ id, payload }: { id: string; payload: { topic: string; homework: string; notes: string } }) =>
      lessonsService.update(id, payload)
  );
  const saveAttendanceMutation = useMutation(
    ({ id, attendances }: { id: string; attendances: Array<{ studentId: string; status: AttendanceStatus }> }) =>
      attendanceService.bulkMark(id, attendances)
  );
  const markAllMutation = useMutation(({ id, studentIds }: { id: string; studentIds: string[] }) =>
    attendanceService.markAll(id, studentIds)
  );
  const addToGroupMutation = useMutation(({ studentId, groupId }: { studentId: string; groupId: string }) =>
    studentsService.addToGroup(studentId, groupId)
  );
  const createStudentMutation = useMutation((payload: CreateStudentRequest) => studentsService.create(payload));

  useEffect(() => {
    if (!data) {
      return;
    }

    setTopic(data.lesson.topic || '');
    setHomework(data.lesson.homework || '');
    setNotes(data.lesson.notes || '');
    setStatusDrafts(getInitialStatuses(data.students, data.attendanceRecords));
    setSelectedStudentId(data.availableStudents[0]?.id ?? '');
  }, [data]);

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
    }));
  }, [data, statusDrafts]);

  const originalStatusMap = useMemo(
    () => new Map((data?.attendanceRecords ?? []).map((record) => [record.studentId, record.status])),
    [data]
  );

  const summary = useMemo(
    () => ({
      totalStudents: attendanceRows.length,
      markedStudents: attendanceRows.filter((student) => student.status !== 'PLANNED').length,
      presentStudents: attendanceRows.filter((student) => isPresentStatus(student.status)).length,
    }),
    [attendanceRows]
  );

  const hasAttendanceChanges = useMemo(
    () =>
      attendanceRows.some((student) => (originalStatusMap.get(student.id) ?? 'PLANNED') !== student.status),
    [attendanceRows, originalStatusMap]
  );

  const hasLessonChanges =
    topic !== (data?.lesson.topic || '') ||
    homework !== (data?.lesson.homework || '') ||
    notes !== (data?.lesson.notes || '');

  const isSavingLesson = saveLessonMutation.loading;
  const isSavingAttendance = saveAttendanceMutation.loading || markAllMutation.loading;
  const isAddingStudent = addToGroupMutation.loading || createStudentMutation.loading;

  const goBack = () => {
    router.push('/attendance');
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStatusDrafts((previous) => ({
      ...previous,
      [studentId]: status,
    }));
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
    if (!lessonId || attendanceRows.length === 0) {
      return;
    }

    setPageError(null);

    try {
      await saveAttendanceMutation.mutate({
        id: lessonId,
        attendances: attendanceRows.map((student) => ({
          studentId: student.id,
          status: student.status,
        })),
      });
      await refetch();
    } catch (saveError) {
      setPageError(getErrorMessage(saveError, 'Не удалось сохранить посещаемость.'));
    }
  };

  const handleMarkAll = async () => {
    if (!lessonId || attendanceRows.length === 0) {
      return;
    }

    setPageError(null);

    try {
      await markAllMutation.mutate({
        id: lessonId,
        studentIds: attendanceRows.map((student) => student.id),
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!lessonId || !data) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
          Назад к посещаемости
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">
          {error || 'Урок не найден'}
        </div>
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
              {formatShortRuDate(data.lesson.lessonDate)} • {formatTimeRange(data.lesson.startTime, data.lesson.endTime)}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">Преподаватель</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{data.teacherName}</p>
            {data.substituteTeacherName ? (
              <p className="mt-1 text-xs text-[#7f8794]">Замена: {data.substituteTeacherName}</p>
            ) : null}
          </div>
          <div className="crm-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">Группа</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{data.groupName}</p>
          </div>
        </div>

        <div className="crm-surface-soft p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#273142]">Посещаемость урока</p>
              <p className="mt-1 text-xs text-[#6f7786]">
                Отмечено {summary.markedStudents} из {summary.totalStudents}, посетили {summary.presentStudents}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleMarkAll} disabled={attendanceRows.length === 0 || isSavingAttendance}>
                Отметить всех как посетивших
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Users}
                onClick={() => setIsStudentPickerOpen(true)}
                disabled={!data.lesson.groupId || data.availableStudents.length === 0 || isAddingStudent}
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
          </div>

          {!data.lesson.groupId ? (
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
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Введите тему урока"
              className="crm-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Домашнее задание</label>
            <textarea
              rows={3}
              value={homework}
              onChange={(event) => setHomework(event.target.value)}
              placeholder="Введите домашнее задание"
              className="crm-textarea resize-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметки</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Внутренние заметки по уроку"
              className="crm-textarea resize-none"
            />
          </div>
        </div>

        <div className="crm-table-wrap overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th w-14">#</th>
                <th className="crm-table-th">Ученик</th>
                <th className="crm-table-th w-56">Контакты</th>
                <th className="crm-table-th w-44">Статус ученика</th>
                <th className="crm-table-th w-56">Посещаемость</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {attendanceRows.length > 0 ? (
                attendanceRows.map((student, index) => (
                  <tr key={student.id} className="crm-table-row">
                    <td className="crm-table-cell font-semibold text-[#273142]">{index + 1}</td>
                    <td className="crm-table-cell">
                      <p className="font-semibold text-[#273142]">{student.fullName}</p>
                    </td>
                    <td className="crm-table-cell">
                      <p className="text-sm text-[#273142]">{student.phone || 'Телефон не указан'}</p>
                      {student.parentName || student.parentPhone ? (
                        <p className="mt-1 text-xs text-[#7f8794]">
                          {student.parentName || 'Родитель'}{student.parentPhone ? ` • ${student.parentPhone}` : ''}
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
                      <div className="flex flex-col gap-2">
                        <select
                          value={student.status}
                          onChange={(event) =>
                            handleStatusChange(student.id, event.target.value as AttendanceStatus)
                          }
                          className="crm-select h-9"
                        >
                          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span
                          className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-xs font-semibold ${ATTENDANCE_STATUS_COLORS[student.status]}`}
                        >
                          {ATTENDANCE_STATUS_LABELS[student.status]}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="crm-table-row">
                  <td colSpan={5} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                    Для этого урока пока нет учеников
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isStudentPickerOpen}
        onClose={() => setIsStudentPickerOpen(false)}
        title="Добавить ученика в группу"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsStudentPickerOpen(false)} disabled={isAddingStudent}>
              Отмена
            </Button>
            <Button onClick={handleAddExistingStudent} disabled={!selectedStudentId || isAddingStudent}>
              {isAddingStudent ? 'Добавляем...' : 'Добавить'}
            </Button>
          </>
        }
      >
        <Select
          label="Ученик"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
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
    </div>
  );
}
