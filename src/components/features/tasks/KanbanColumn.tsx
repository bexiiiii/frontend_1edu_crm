import type { TaskPriority } from '@/lib/api';
import type { TaskListItem } from '@/types/task';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  title: string;
  priority: TaskPriority;
  tasks: TaskListItem[];
  color: string;
  emptyLabel: string;
  onTaskClick: (task: TaskListItem) => void;
  onComplete: (task: TaskListItem, e: React.MouseEvent) => void;
  onEdit: (task: TaskListItem, e: React.MouseEvent) => void;
  onDelete: (task: TaskListItem, e: React.MouseEvent) => void;
}

export const KanbanColumn = ({
  title,
  priority,
  tasks,
  color,
  emptyLabel,
  onTaskClick,
  onComplete,
  onEdit,
  onDelete,
}: KanbanColumnProps) => {
  const columnTasks = tasks.filter((task) => task.priority === priority);

  return (
    <div className="flex-1 min-w-[320px]">
      <div className={`mb-4 rounded-xl border ${color} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#283140]">{title}</h2>
          <span className="rounded-lg bg-white/80 px-2.5 py-1 text-sm font-bold text-[#556074]">
            {columnTasks.length}
          </span>
        </div>
      </div>

      <div className="min-h-[220px] space-y-3">
        {columnTasks.length > 0 ? (
          columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onComplete={(event) => onComplete(task, event)}
              onEdit={(event) => onEdit(task, event)}
              onDelete={(event) => onDelete(task, event)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#d6dee8] bg-white/80 px-4 py-10 text-center text-sm text-[#8a93a3]">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
};
