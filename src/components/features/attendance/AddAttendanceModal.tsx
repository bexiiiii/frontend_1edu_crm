import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ATTENDANCE_STATUS_OPTIONS } from '@/constants/attendance';
import { getErrorMessage } from '@/lib/error-message';
import type { AttendanceStatus } from '@/lib/api';

interface LessonStudentOption {
  id: string;
  name: string;
}

interface LessonOption {
  id: string;
  label: string;
  studentOptions: LessonStudentOption[];
}

interface AddAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    lessonId: string;
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }) => Promise<void>;
  lessons: LessonOption[];
  isSubmitting?: boolean;
}

function getDefaultLessonId(lessons: LessonOption[]): string {
  return lessons.find((lesson) => lesson.studentOptions.length > 0)?.id || lessons[0]?.id || '';
}

export const AddAttendanceModal = ({
  isOpen,
  onClose,
  onSave,
  lessons,
  isSubmitting = false,
}: AddAttendanceModalProps) => {
  const [lessonId, setLessonId] = useState(() => getDefaultLessonId(lessons));
  const [studentId, setStudentId] = useState(() => {
    const lesson = lessons.find((item) => item.id === getDefaultLessonId(lessons));
    return lesson?.studentOptions[0]?.id || '';
  });
  const [status, setStatus] = useState<AttendanceStatus>('ATTENDED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === lessonId) || null,
    [lessonId, lessons]
  );
  const availableStudents = selectedLesson?.studentOptions ?? [];

  const handleLessonChange = (nextLessonId: string) => {
    setLessonId(nextLessonId);
    const nextLesson = lessons.find((lesson) => lesson.id === nextLessonId);
    setStudentId(nextLesson?.studentOptions[0]?.id || '');
  };

  const handleSave = async () => {
    setError(null);

    if (!lessonId) {
      setError('Выберите занятие.');
      return;
    }

    if (!studentId) {
      setError('Выберите ученика.');
      return;
    }

    try {
      await onSave({
        lessonId,
        studentId,
        status,
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Не удалось добавить посещение.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить посещение"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || lessons.length === 0}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Select
          label="Занятие"
          value={lessonId}
          onChange={(event) => handleLessonChange(event.target.value)}
          helperText="Показываются занятия выбранного дня."
        >
          <option value="">Выберите занятие</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.label}
            </option>
          ))}
        </Select>

        <Select
          label="Ученик"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          helperText={
            selectedLesson
              ? availableStudents.length > 0
                ? `Доступно учеников: ${availableStudents.length}`
                : 'У этого занятия нет доступных учеников для отметки.'
              : 'Сначала выберите занятие.'
          }
        >
          <option value="">Выберите ученика</option>
          {availableStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </Select>

        <Select
          label="Статус посещения"
          value={status}
          onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
        >
          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметка</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Например, опоздал на 10 минут"
            className="crm-textarea resize-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
