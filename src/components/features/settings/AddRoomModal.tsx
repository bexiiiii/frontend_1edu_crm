import { useState } from 'react';
import type { CreateRoomRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { pushToast } from '@/lib/toast';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRoomRequest) => Promise<void>;
  isSubmitting?: boolean;
  initialValue?: (CreateRoomRequest & { id?: string }) | null;
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

  return 'Не удалось сохранить помещение. Попробуйте ещё раз.';
}

export const AddRoomModal = ({
  isOpen,
  onClose,
  onSave,
  isSubmitting = false,
  initialValue = null,
}: AddRoomModalProps) => {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [capacity, setCapacity] = useState(initialValue?.capacity == null ? '' : String(initialValue.capacity));
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [color, setColor] = useState(initialValue?.color ?? '#467aff');
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; capacity?: boolean }>({});
  const isEditing = Boolean(initialValue?.id);

  const handleSave = async () => {
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: true });
      pushToast({ message: 'Название помещения обязательно.', tone: 'error' });
      return;
    }

    const parsedCapacity = capacity ? Number(capacity) : undefined;
    if (parsedCapacity !== undefined && (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0)) {
      setFieldErrors({ capacity: true });
      pushToast({ message: 'Вместимость должна быть положительным числом.', tone: 'error' });
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        capacity: parsedCapacity,
        description: description.trim() || undefined,
        color: color || undefined,
      });
    } catch (submitError) {
      pushToast({ message: getErrorMessage(submitError), tone: 'error' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать помещение' : 'Добавить помещение'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : isEditing ? 'Обновить' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Название"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFieldErrors((prev) => ({ ...prev, name: false }));
          }}
          placeholder="Введите название"
          error={Boolean(fieldErrors.name)}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Вместимость"
            type="number"
            value={capacity}
            onChange={(event) => {
              setCapacity(event.target.value);
              setFieldErrors((prev) => ({ ...prev, capacity: false }));
            }}
            placeholder="Например, 20"
            error={Boolean(fieldErrors.capacity)}
          />
          <Input
            label="Цвет"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Дополнительная информация"
            className="crm-textarea resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};
