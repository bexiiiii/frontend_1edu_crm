import type { TaskPriority, TaskStatus } from '@/lib/api';

const DAY_MS = 24 * 60 * 60 * 1000;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
  CANCELLED: 'Отменено',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'border-[#dbe2e8] bg-[#f4f7f9] text-[#647184]',
  IN_PROGRESS: 'border-[#cfe0ff] bg-[#eef5ff] text-[#366ca8]',
  DONE: 'border-[#d7f4e8] bg-[#ecfcf5] text-[#1f8e69]',
  CANCELLED: 'border-[#ffd8d8] bg-[#fff0f0] text-[#c24141]',
};

export const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'TODO', label: TASK_STATUS_LABELS.TODO },
  { value: 'IN_PROGRESS', label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: 'DONE', label: TASK_STATUS_LABELS.DONE },
  { value: 'CANCELLED', label: TASK_STATUS_LABELS.CANCELLED },
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  OVERDUE: 'Просрочена',
  DUE_TODAY: 'На сегодня',
  DUE_THIS_WEEK: 'На этой неделе',
  DUE_NEXT_WEEK: 'На следующей неделе',
  MORE_THAN_NEXT_WEEK: 'Позже',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  OVERDUE: 'border-[#ffd8d8] bg-[#fff0f0] text-[#c24141]',
  DUE_TODAY: 'border-[#d7f4e8] bg-[#ecfcf5] text-[#1f8e69]',
  DUE_THIS_WEEK: 'border-[#cfe0ff] bg-[#eef5ff] text-[#366ca8]',
  DUE_NEXT_WEEK: 'border-[#d5f3f6] bg-[#eefcff] text-[#1d8a97]',
  MORE_THAN_NEXT_WEEK: 'border-[#dbe2e8] bg-[#f4f7f9] text-[#647184]',
};

export const TASK_PRIORITY_COLUMNS: Array<{
  value: TaskPriority;
  label: string;
  color: string;
  emptyLabel: string;
}> = [
  {
    value: 'OVERDUE',
    label: 'Просрочены',
    color: 'bg-red-100 text-red-700 border-red-200',
    emptyLabel: 'Просроченных задач нет',
  },
  {
    value: 'DUE_TODAY',
    label: 'На сегодня',
    color: 'bg-green-100 text-green-700 border-green-200',
    emptyLabel: 'На сегодня задач нет',
  },
  {
    value: 'DUE_THIS_WEEK',
    label: 'На этой неделе',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    emptyLabel: 'На этой неделе задач нет',
  },
  {
    value: 'DUE_NEXT_WEEK',
    label: 'На следующей неделе',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    emptyLabel: 'На следующей неделе задач нет',
  },
  {
    value: 'MORE_THAN_NEXT_WEEK',
    label: 'Позже',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    emptyLabel: 'Задач без срочного срока нет',
  },
];

export function getTaskPriorityFromDueDate(dueDate?: string): TaskPriority {
  if (!dueDate) {
    return 'MORE_THAN_NEXT_WEEK';
  }

  const [year, month, day] = dueDate.split('-').map(Number);
  const deadline = new Date(year, month - 1, day);
  deadline.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE_TODAY';
  if (diffDays <= 7) return 'DUE_THIS_WEEK';
  if (diffDays <= 14) return 'DUE_NEXT_WEEK';
  return 'MORE_THAN_NEXT_WEEK';
}
