import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit } from 'lucide-react';
import type { ScheduleCalendarItem } from '@/types/schedule';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleCalendarItem | null;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const STATUS_LABELS: Record<ScheduleCalendarItem['status'], string> = {
  ACTIVE: 'Активное',
  PAUSED: 'На паузе',
  COMPLETED: 'Завершено',
};

export const EventDetailModal = ({
  isOpen,
  onClose,
  schedule,
  onEdit,
  onDelete,
  isDeleting = false,
}: EventDetailModalProps) => {
  if (!schedule) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Информация о расписании"
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? 'Удаляем...' : 'Удалить'}
          </Button>
          <Button icon={Edit} onClick={onEdit} disabled={isDeleting}>
            Редактировать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
            <p className="text-base text-gray-900">{schedule.courseName}</p>
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
            <p className="text-base text-gray-900">{schedule.teacherName}</p>
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
            <p className="text-base text-gray-900">
              {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}
            </p>
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
      </div>
    </Modal>
  );
};
