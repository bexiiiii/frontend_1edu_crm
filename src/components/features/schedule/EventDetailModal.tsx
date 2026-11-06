import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit, CheckSquare, Gift, Ban, Repeat } from 'lucide-react';
import type { ScheduleCalendarItem } from '@/types/schedule';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleCalendarItem | null;
  eventDate?: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpenAttendance?: (schedule: ScheduleCalendarItem, date?: string) => void;
  isDeleting?: boolean;
  readOnly?: boolean;
  lessonBonus?: boolean;
  /** The lesson has real attendance marks: cancel / bonus are not offered (history stays). */
  lessonHasMarks?: boolean;
  onToggleBonus?: () => void;
  onCancelLesson?: () => void;
  isLessonSaving?: boolean;
  onAssignSubstitute?: () => void;
  substituteTeacherName?: string | null;
}

const STATUS_LABELS: Record<ScheduleCalendarItem['status'], string> = {
  ACTIVE: 'Активное',
  PAUSED: 'На паузе',
  COMPLETED: 'Завершено',
};

const formatAuditDate = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

export const EventDetailModal = ({
  isOpen,
  onClose,
  schedule,
  eventDate,
  onEdit,
  onDelete,
  onOpenAttendance,
  isDeleting = false,
  readOnly = false,
  lessonBonus = false,
  lessonHasMarks = false,
  onToggleBonus,
  onCancelLesson,
  isLessonSaving = false,
  onAssignSubstitute,
  substituteTeacherName,
}: EventDetailModalProps) => {
  if (!schedule) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Информация о расписании"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {onOpenAttendance ? (
            <Button
              variant="outline"
              icon={CheckSquare}
              onClick={() => onOpenAttendance(schedule, eventDate)}
              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Отметить посещаемость {eventDate ? `(${eventDate})` : ''}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                {onToggleBonus ? (
                  <Button variant="outline" icon={Gift} onClick={onToggleBonus} disabled={isLessonSaving}>
                    {isLessonSaving ? 'Сохраняем...' : lessonBonus ? 'Вернуть в оплату' : 'Бонусный урок'}
                  </Button>
                ) : null}
                {onCancelLesson ? (
                  <Button variant="ghost" icon={Ban} onClick={onCancelLesson} disabled={isLessonSaving}>
                    Отменить урок
                  </Button>
                ) : null}
                {onAssignSubstitute ? (
                  <Button variant="outline" icon={Repeat} onClick={onAssignSubstitute} disabled={isLessonSaving}>
                    {substituteTeacherName ? `Замена: ${substituteTeacherName}` : 'Замена'}
                  </Button>
                ) : null}
                <Button variant="ghost" icon={Trash2} onClick={onDelete} disabled={isDeleting}>
                  {isDeleting ? 'Удаляем...' : 'Удалить'}
                </Button>
                <Button icon={Edit} onClick={onEdit} disabled={isDeleting}>
                  Редактировать
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {lessonHasMarks && !readOnly ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            В этом занятии уже есть отметки посещаемости — отменить его или сделать бонусным нельзя.
            Если это нужно, сначала снимите отметки в посещаемости.
          </div>
        ) : null}
        {lessonBonus ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Бонусный урок: он отображается в расписании, но не участвует в оплате студентов и зарплате преподавателя.
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Название
          </label>
          <p className="text-base font-semibold text-gray-900">{schedule.name}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Курс
            </label>
            {schedule.courseId ? (
              <Link prefetch={false}
                href={`/classes/${schedule.courseId}`}
                className="text-base font-semibold text-[#467aff] hover:underline"
                onClick={onClose}
              >
                {schedule.courseName}
              </Link>
            ) : (
              <p className="text-base text-gray-900">{schedule.courseName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Статус
            </label>
            <p className="text-base text-gray-900">{STATUS_LABELS[schedule.status]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Преподаватель
            </label>
            {schedule.teacherId ? (
              <Link prefetch={false}
                href={`/staff/${schedule.teacherId}`}
                className="text-base font-semibold text-[#467aff] hover:underline"
                onClick={onClose}
              >
                {schedule.teacherName}
              </Link>
            ) : (
              <p className="text-base text-gray-900">{schedule.teacherName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Помещение
            </label>
            <p className="text-base text-gray-900">{schedule.roomName}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Дни недели
          </label>
          <p className="text-base text-gray-900">{schedule.daysLabel}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Время
            </label>
            <p className="text-base text-gray-900">{schedule.timeLabel}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Лимит студентов
            </label>
            <p className="text-base text-gray-900">
              {schedule.maxStudents ?? 'Не ограничено'}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Период
          </label>
          <p className="text-base text-gray-900">
            {schedule.startDate}
            {schedule.endDate ? ` - ${schedule.endDate}` : ' - без даты окончания'}
          </p>
        </div>

        <div className="rounded-xl border border-[#e6ebf0] bg-[#f8fafc] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a93a3]">История записи</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div>
              <span className="text-[#8a93a3]">Создал(а): </span>
              <span className="font-medium text-[#374151]">{schedule.createdByName || schedule.createdBy || 'Не зафиксировано'}</span>
              <div className="text-xs text-[#9ca3af]">{formatAuditDate(schedule.createdAt)}</div>
            </div>
            <div>
              <span className="text-[#8a93a3]">Изменил(а): </span>
              <span className="font-medium text-[#374151]">{schedule.updatedByName || schedule.updatedBy || 'Не зафиксировано'}</span>
              <div className="text-xs text-[#9ca3af]">{formatAuditDate(schedule.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
