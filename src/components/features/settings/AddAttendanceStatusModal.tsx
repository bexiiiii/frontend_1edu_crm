import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { YES_NO_OPTIONS, COLORS } from '@/constants/settings-data';

export interface AttendanceStatusFormPayload {
  id?: string;
  name: string;
  deductLesson: boolean;
  requirePayment: boolean;
  countAsAttended: boolean;
  color: string;
  sortOrder: number;
  systemStatus?: boolean;
}

interface AddAttendanceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AttendanceStatusFormPayload) => Promise<void>;
  initialValue?: AttendanceStatusFormPayload | null;
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

  return 'Не удалось сохранить статус посещения. Попробуйте ещё раз.';
}

const DEFAULT_COLOR = '#10b981';

function getInitialValue(initialValue?: AttendanceStatusFormPayload | null) {
  return {
    name: initialValue?.name ?? '',
    deductLesson: toYesNo(initialValue?.deductLesson ?? true),
    requirePayment: toYesNo(initialValue?.requirePayment ?? true),
    countAsAttended: toYesNo(initialValue?.countAsAttended ?? true),
    color: initialValue?.color ?? DEFAULT_COLOR,
    sortOrder: String(initialValue?.sortOrder ?? 0),
  };
}

export const AddAttendanceStatusModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue = null,
  isSubmitting = false,
}: AddAttendanceStatusModalProps) => {
  const initialForm = getInitialValue(initialValue);
  const [name, setName] = useState(initialForm.name);
  const [deductLesson, setDeductLesson] = useState(initialForm.deductLesson);
  const [requirePayment, setRequirePayment] = useState(initialForm.requirePayment);
  const [countAsAttended, setCountAsAttended] = useState(initialForm.countAsAttended);
  const [color, setColor] = useState(initialForm.color);
  const [sortOrder, setSortOrder] = useState(initialForm.sortOrder);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Название статуса обязательно.');
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
        deductLesson: fromYesNo(deductLesson),
        requirePayment: fromYesNo(requirePayment),
        countAsAttended: fromYesNo(countAsAttended),
        color,
        sortOrder: parsedSortOrder,
        systemStatus: initialValue?.systemStatus,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue ? `Редактирование статуса — ${initialValue.name}` : 'Добавить статус посещения'}
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
          <Select label="Списывать" value={deductLesson} onChange={(event) => setDeductLesson(event.target.value)}>
            {YES_NO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select label="Оплачивать" value={requirePayment} onChange={(event) => setRequirePayment(event.target.value)}>
            {YES_NO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Считать посещением"
            value={countAsAttended}
            onChange={(event) => setCountAsAttended(event.target.value)}
          >
            {YES_NO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="Порядок сортировки"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Цвет</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((item) => {
              const isSelected = color === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  className={`h-8 w-8 rounded-lg border-2 transition-colors ${
                    isSelected ? 'border-[#467aff]' : 'border-gray-200 hover:border-[#467aff]'
                  }`}
                  style={{ backgroundColor: item }}
                  aria-label={`Выбрать цвет ${item}`}
                />
              );
            })}
          </div>
        </div>

        {initialValue?.systemStatus ? (
          <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3 text-sm text-[#556070]">
            Это системный статус. Его можно редактировать, но удаление на backend запрещено.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
