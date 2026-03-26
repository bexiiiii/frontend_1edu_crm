import { Calendar, Edit, Trash2, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from '@/constants/task';
import type { TaskListItem } from '@/types/task';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskListItem | null;
  onEdit: () => void;
  onDelete: () => void;
  isMutating?: boolean;
}

function formatDate(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value: string): string {
  if (!value) return '—';

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TaskDetailModal = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  isMutating = false,
}: TaskDetailModalProps) => {
  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Детали задачи"
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={onDelete} disabled={isMutating}>
            Удалить
          </Button>
          <Button icon={Edit} onClick={onEdit} disabled={isMutating}>
            Редактировать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Название</label>
          <p className="text-base font-semibold text-gray-900">{task.title}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Статус</label>
            <span
              className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium ${TASK_STATUS_COLORS[task.status]}`}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Приоритет</label>
            <span
              className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Исполнитель</label>
            <div className="flex items-center gap-2 text-base text-gray-900">
              <User className="h-4 w-4 text-gray-400" />
              <span>{task.assigneeName || 'Не назначен'}</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Срок выполнения</label>
            <div className="flex items-center gap-2 text-base text-gray-900">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Описание</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{task.description || '—'}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Заметки</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{task.notes || '—'}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Создано</label>
            <p className="text-sm text-gray-700">{formatDateTime(task.createdAt)}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Обновлено</label>
            <p className="text-sm text-gray-700">{formatDateTime(task.updatedAt)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
