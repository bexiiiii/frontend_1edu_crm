import { useEffect, useMemo, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { staffService, type PageResponse, type StaffAssignmentsDto, type StaffDto } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-message';
import { pushToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';

interface ReplaceTeacherModalProps {
  /** Dismissed teacher; the modal is open while this is set. */
  staffId: string | null;
  staffName?: string;
  assignments: StaffAssignmentsDto | null;
  onClose: () => void;
  onReplaced?: () => void | Promise<void>;
}

const formatLessonDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}.${month}.${year}` : value;
};

const formatTime = (value: string | null) => (value ? value.slice(0, 5) : '');

/**
 * A dismissed teacher is not removed from courses, schedules and future lessons automatically
 * (past lessons drive salary and attendance history). Right after dismissal the backend returns
 * the active load, and this modal offers to hand it over to another teacher.
 */
export const ReplaceTeacherModal = ({ staffId, staffName, assignments, onClose, onReplaced }: ReplaceTeacherModalProps) => {
  const isTenantAdmin = useAuthStore((s) => s.roles.includes('TENANT_ADMIN'));
  const isOpen = staffId !== null && assignments !== null;
  const [newTeacherId, setNewTeacherId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewTeacherId('');
      setError(null);
    }
  }, [isOpen, staffId]);

  const { data: teachersPage } = useApi<PageResponse<StaffDto> | null>(
    () =>
      isOpen && isTenantAdmin
        ? staffService.getAll({ page: 0, size: 500, role: 'TEACHER', status: 'ACTIVE' })
        : Promise.resolve({ data: null }),
    [isOpen, isTenantAdmin]
  );

  const teacherOptions = useMemo(
    () =>
      (teachersPage?.content ?? [])
        .filter((teacher) => teacher.id !== staffId)
        .map((teacher) => ({
          id: teacher.id,
          name: teacher.fullName || [teacher.lastName, teacher.firstName].filter(Boolean).join(' ') || 'Без имени',
        })),
    [teachersPage, staffId]
  );

  const handleReplace = async () => {
    if (!staffId || !newTeacherId) return;
    setError(null);
    setSaving(true);
    try {
      const response = await staffService.replaceTeacher(staffId, newTeacherId);
      const result = response.data;
      pushToast({
        message: `Преподаватель заменён: курсов ${result?.coursesUpdated ?? 0}, расписаний ${result?.schedulesUpdated ?? 0}, занятий ${result?.lessonsUpdated ?? 0}`,
        tone: 'success',
      });
      onClose();
      await onReplaced?.();
    } catch (replaceError) {
      // Keep the modal open; the API error is also shown by the global toast.
      setError(getErrorMessage(replaceError, 'Не удалось заменить преподавателя.'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !assignments) return null;

  const courses = assignments.activeCourses ?? [];
  const schedules = assignments.activeSchedules ?? [];
  const lessons = assignments.futureLessons ?? [];
  const hiddenLessons = Math.max(0, (assignments.futureLessonsCount ?? 0) - lessons.length);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Замена уволенного преподавателя"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {isTenantAdmin ? 'Позже' : 'Закрыть'}
          </Button>
          {isTenantAdmin ? (
            <Button icon={UserCheck} onClick={handleReplace} disabled={!newTeacherId || saving}>
              {saving ? 'Заменяем...' : 'Заменить'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4 text-sm text-[#273142]">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 leading-5 text-amber-900">
          {staffName ? `${staffName} уволен(а), ` : 'Сотрудник уволен, '}
          но остаётся преподавателем в активных курсах, расписаниях и будущих занятиях. Прошедшие занятия не меняются.
        </p>

        {courses.length > 0 ? (
          <div>
            <p className="mb-1 font-semibold">Курсы ({courses.length})</p>
            <p className="text-[#5b6472]">{courses.map((course) => course.name || 'Без названия').join(', ')}</p>
          </div>
        ) : null}

        {schedules.length > 0 ? (
          <div>
            <p className="mb-1 font-semibold">Расписания ({schedules.length})</p>
            <p className="text-[#5b6472]">{schedules.map((schedule) => schedule.name || 'Без названия').join(', ')}</p>
          </div>
        ) : null}

        {assignments.futureLessonsCount > 0 ? (
          <div>
            <p className="mb-1 font-semibold">Будущие занятия ({assignments.futureLessonsCount})</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[#5b6472]">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  {formatLessonDate(lesson.lessonDate)}
                  {lesson.startTime ? ` ${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}` : ''}
                  {lesson.groupName ? ` · ${lesson.groupName}` : ''}
                </li>
              ))}
              {hiddenLessons > 0 ? <li>и ещё {hiddenLessons}</li> : null}
            </ul>
          </div>
        ) : null}

        {isTenantAdmin ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Новый преподаватель</label>
            <select
              value={newTeacherId}
              onChange={(event) => setNewTeacherId(event.target.value)}
              className="crm-select"
            >
              <option value="">Выберите преподавателя</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[#5b6472]">Назначить замену может только администратор.</p>
        )}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
};
