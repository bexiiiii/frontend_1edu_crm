import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_OPTIONS,
  getTaskPriorityFromDueDate,
} from '@/constants/task';
import type { TaskFormValues } from '@/types/task';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormValues) => Promise<void>;
  initialValues?: TaskFormValues;
  assignees: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  title?: string;
  includeStatus?: boolean;
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDefaultValues(): TaskFormValues {
  return {
    title: '',
    description: '',
    assignedTo: '',
    dueDate: getTodayDate(),
    notes: '',
    status: 'TODO',
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return 'Не удалось сохранить задачу. Попробуйте ещё раз.';
}

export const AddTaskModal = ({
  isOpen,
  onClose,
  onSave,
  initialValues,
  assignees,
  isSubmitting = false,
  title = 'Добавить задачу',
  includeStatus = false,
}: AddTaskModalProps) => {
  const defaults = initialValues ?? getDefaultValues();

  const [titleValue, setTitleValue] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [assignedTo, setAssignedTo] = useState(defaults.assignedTo);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [notes, setNotes] = useState(defaults.notes);
  const [status, setStatus] = useState(defaults.status);
  const [error, setError] = useState<string | null>(null);

  const derivedPriority = useMemo(() => getTaskPriorityFromDueDate(dueDate || undefined), [dueDate]);

  const handleSave = async () => {
    setError(null);

    if (!titleValue.trim()) {
      setError('Название задачи обязательно.');
      return;
    }

    try {
      await onSave({
        title: titleValue.trim(),
        description: description.trim(),
        assignedTo,
        dueDate,
        notes: notes.trim(),
        status,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Название"
          value={titleValue}
          onChange={(event) => setTitleValue(event.target.value)}
          placeholder="Например, позвонить ученику"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Исполнитель" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
            <option value="">Не назначен</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </Select>

          <Input
            label="Срок выполнения"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        {includeStatus && (
          <Select label="Статус" value={status} onChange={(event) => setStatus(event.target.value as TaskFormValues['status'])}>
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Приоритет по сроку</p>
          <p className="mt-1 text-sm font-semibold text-[#283140]">{TASK_PRIORITY_LABELS[derivedPriority]}</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Опишите задачу"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Внутренние заметки"
            className="crm-textarea resize-none"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
