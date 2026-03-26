import type { TaskPriority, TaskStatus } from '@/lib/api';

export interface TaskListItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  assigneeName: string;
  dueDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  notes: string;
  status: TaskStatus;
}

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  assignedTo: string;
  dueDateFrom: string;
  dueDateTo: string;
}
