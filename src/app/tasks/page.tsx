'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddTaskModal } from '@/components/features/tasks/AddTaskModal';
import { TaskDetailModal } from '@/components/features/tasks/TaskDetailModal';
import { KanbanColumn } from '@/components/features/tasks/KanbanColumn';
import {
  TASK_PRIORITY_COLUMNS,
  TASK_STATUS_OPTIONS,
  getTaskPriorityFromDueDate,
} from '@/constants/task';
import type { TaskFilters, TaskFormValues, TaskListItem } from '@/types/task';
import {
  staffService,
  tasksService,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';

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

function toFormValues(task: TaskListItem): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    dueDate: task.dueDate,
    notes: task.notes,
    status: task.status,
  };
}

function buildCreatePayload(values: TaskFormValues): CreateTaskRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    assignedTo: values.assignedTo || undefined,
    dueDate: values.dueDate || undefined,
    notes: values.notes.trim() || undefined,
    priority: getTaskPriorityFromDueDate(values.dueDate || undefined),
  };
}

function buildUpdatePayload(values: TaskFormValues): UpdateTaskRequest {
  return {
    ...buildCreatePayload(values),
    status: values.status,
  };
}

export default function Tasks() {
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: 'all',
    assignedTo: 'all',
    dueDateFrom: '',
    dueDateTo: '',
  });
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    taskId: string | null;
    initialValues?: TaskFormValues;
  }>({
    key: 0,
    isOpen: false,
    taskId: null,
  });

  const { data: staffPage } = useApi(() => staffService.getAll({ page: 0, size: 500 }), []);

  const staffOptions = useMemo(
    () =>
      (staffPage?.content ?? []).map((staff) => ({
        id: staff.id,
        name: getStaffFullName(staff) || staff.email || staff.phone || 'Без имени',
      })),
    [staffPage]
  );

  const staffMap = useMemo(() => {
    return new Map(staffOptions.map((staff) => [staff.id, staff.name]));
  }, [staffOptions]);

  const { data: tasksPage, loading, error, refetch } = useApi(() => {
    const status = filters.status !== 'all' ? filters.status : undefined;
    const query = filters.search.trim();
    const assigneeId = filters.assignedTo !== 'all' ? filters.assignedTo : undefined;
    const params = { page: 0, size: 1000 };

    if (query && !assigneeId) {
      return tasksService.search({ ...params, query });
    }

    if (!query && assigneeId) {
      return tasksService.getByAssignee(assigneeId, { ...params, status });
    }

    return tasksService.getAll({ ...params, status });
  }, [filters.search, filters.status, filters.assignedTo]);

  const createMutation = useMutation((data: CreateTaskRequest) => tasksService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateTaskRequest }) =>
    tasksService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => tasksService.delete(id));

  const tasks = useMemo<TaskListItem[]>(
    () =>
      (tasksPage?.content ?? []).map((task) => ({
        id: task.id,
        title: task.title || '',
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo || '',
        assigneeName: task.assignedTo ? staffMap.get(task.assignedTo) || task.assignedTo : '',
        dueDate: task.dueDate || '',
        notes: task.notes || '',
        createdAt: task.createdAt || '',
        updatedAt: task.updatedAt || '',
      })),
    [staffMap, tasksPage]
  );

  const filteredTasks = useMemo(() => {
    const searchQuery = filters.search.trim().toLowerCase();

    return tasks.filter((task) => {
      if (searchQuery) {
        const haystack = [task.title, task.description, task.notes, task.assigneeName].join(' ').toLowerCase();
        if (!haystack.includes(searchQuery)) {
          return false;
        }
      }

      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      if (filters.assignedTo !== 'all' && task.assignedTo !== filters.assignedTo) {
        return false;
      }

      if (filters.dueDateFrom && (!task.dueDate || task.dueDate < filters.dueDateFrom)) {
        return false;
      }

      if (filters.dueDateTo && (!task.dueDate || task.dueDate > filters.dueDateTo)) {
        return false;
      }

      return true;
    });
  }, [filters.assignedTo, filters.dueDateFrom, filters.dueDateTo, filters.search, filters.status, tasks]);

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      taskId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = () => {
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      taskId: null,
      initialValues: undefined,
    }));
  };

  const openEditModal = (task: TaskListItem) => {
    setSelectedTask(task);
    setIsDetailModalOpen(false);
    setModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      taskId: task.id,
      initialValues: toFormValues(task),
    }));
  };

  const handleTaskClick = (task: TaskListItem) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleSaveTask = async (values: TaskFormValues) => {
    if (modalState.taskId) {
      await updateMutation.mutate({
        id: modalState.taskId,
        data: buildUpdatePayload(values),
      });
    } else {
      await createMutation.mutate(buildCreatePayload(values));
    }

    closeModal();
    await refetch();
  };

  const handleDeleteTask = async (task?: TaskListItem | null) => {
    const target = task ?? selectedTask;
    if (!target || !confirm('Вы уверены, что хотите удалить задачу?')) {
      return;
    }

    await deleteMutation.mutate(target.id);
    setIsDetailModalOpen(false);
    setSelectedTask(null);
    await refetch();
  };

  const handleCompleteTask = async (task: TaskListItem) => {
    await updateMutation.mutate({
      id: task.id,
      data: buildUpdatePayload({
        ...toFormValues(task),
        status: 'DONE',
      }),
    });

    if (selectedTask?.id === task.id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: 'DONE' } : prev));
    }

    await refetch();
  };

  const summary = useMemo(
    () => ({
      total: filteredTasks.length,
      done: filteredTasks.filter((task) => task.status === 'DONE').length,
    }),
    [filteredTasks]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить задачу
        </Button>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, описанию, заметкам и исполнителю"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                status: event.target.value as TaskFilters['status'],
              }))
            }
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.assignedTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, assignedTo: event.target.value }))}
            className="crm-select"
          >
            <option value="all">Все исполнители</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dueDateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dueDateFrom: event.target.value }))}
            className="crm-select"
          />

          <input
            type="date"
            value={filters.dueDateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dueDateTo: event.target.value }))}
            className="crm-select"
          />
        </div>
      </div>

      <div className="crm-surface p-4">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-2 pb-4">
          <p className="text-sm font-medium text-gray-700">
            Задач в выборке: <span className="font-semibold text-gray-900">{summary.total}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Выполнено: <span className="font-semibold text-gray-900">{summary.done}</span>
          </p>
        </div>

        {error && (
          <div className="mx-2 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {TASK_PRIORITY_COLUMNS.map((column) => (
              <div key={column.value} className="contents">
                <KanbanColumn
                  title={column.label}
                  priority={column.value}
                  tasks={filteredTasks}
                  color={column.color}
                  emptyLabel={column.emptyLabel}
                  onTaskClick={handleTaskClick}
                  onComplete={(task, event) => {
                    event.stopPropagation();
                    void handleCompleteTask(task);
                  }}
                  onEdit={(task, event) => {
                    event.stopPropagation();
                    openEditModal(task);
                  }}
                  onDelete={(task, event) => {
                    event.stopPropagation();
                    void handleDeleteTask(task);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTaskModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveTask}
        initialValues={modalState.initialValues}
        assignees={staffOptions}
        isSubmitting={createMutation.loading || updateMutation.loading}
        title={modalState.taskId ? 'Редактировать задачу' : 'Добавить задачу'}
        includeStatus={Boolean(modalState.taskId)}
      />

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
        onEdit={() => {
          if (selectedTask) {
            openEditModal(selectedTask);
          }
        }}
        onDelete={() => void handleDeleteTask()}
        isMutating={deleteMutation.loading}
      />
    </div>
  );
}
