import { Calendar, Check, Edit2, Trash2, User } from 'lucide-react';
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from '@/constants/task';
import type { TaskListItem } from '@/types/task';

interface TaskCardProps {
  task: TaskListItem;
  onClick: () => void;
  onComplete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export const TaskCard = ({ task, onClick, onComplete, onEdit, onDelete }: TaskCardProps) => {
  const canComplete = task.status !== 'DONE' && task.status !== 'CANCELLED';

  return (
    <div className="crm-surface group relative p-4">
      <div className="flex items-start justify-between gap-3">
        <h3
          onClick={onClick}
          className="cursor-pointer text-base font-semibold text-[#16a79d] transition-colors hover:text-[#0f9088]"
        >
          {task.title}
        </h3>

        <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && (
        <p className="mt-2 text-sm leading-6 text-[#5f6b7b]">{task.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-[#4f5b6b]">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[#8a93a3]" />
          <span>{task.assigneeName || 'Не назначен'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#8a93a3]" />
          <span>{task.dueDate || 'Без срока'}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {onComplete && canComplete && (
          <button
            onClick={onComplete}
            className="rounded-lg p-1.5 text-[#1f8e69] transition-colors hover:bg-[#eaf9f3]"
            title="Завершить"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-[#366ca8] transition-colors hover:bg-[#edf4ff]"
            title="Редактировать"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-[#c24141] transition-colors hover:bg-[#fff1f1]"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
