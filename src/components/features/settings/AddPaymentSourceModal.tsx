import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { YES_NO_OPTIONS } from '@/constants/settings-data';

export interface PaymentSourceFormPayload {
  id?: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

interface AddPaymentSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PaymentSourceFormPayload) => Promise<void>;
  initialValue?: PaymentSourceFormPayload | null;
  isSubmitting?: boolean;
}

function toYesNo(value: boolean) {
  return value ? 'yes' : 'no';
}

function fromYesNo(value: string) {
  return value === 'yes';
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

  return 'Не удалось сохранить источник платежа. Попробуйте ещё раз.';
}

function getInitialValue(initialValue?: PaymentSourceFormPayload | null) {
  return {
    name: initialValue?.name ?? '',
    sortOrder: String(initialValue?.sortOrder ?? 0),
    active: toYesNo(initialValue?.active ?? true),
  };
}

export const AddPaymentSourceModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue = null,
  isSubmitting = false,
}: AddPaymentSourceModalProps) => {
  const initialForm = getInitialValue(initialValue);
  const [name, setName] = useState(initialForm.name);
  const [sortOrder, setSortOrder] = useState(initialForm.sortOrder);
  const [active, setActive] = useState(initialForm.active);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Название источника обязательно.');
      return;
    }

    const parsedSortOrder = Number.parseInt(sortOrder.trim() || '0', 10);
    if (Number.isNaN(parsedSortOrder) || parsedSortOrder < 0) {
      setError('Порядок сортировки должен быть числом 0 или больше.');
      return;
    }

    try {
      await onSave({
        id: initialValue?.id,
        name: name.trim(),
        sortOrder: parsedSortOrder,
        active: fromYesNo(active),
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue ? `Редактирование источника — ${initialValue.name}` : 'Добавить источник платежа'}
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Введите название"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Порядок сортировки"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="0"
          />

          <Select label="Активность" value={active} onChange={(event) => setActive(event.target.value)}>
            {YES_NO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
