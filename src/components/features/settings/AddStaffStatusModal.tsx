import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COLORS } from '@/constants/settings-data';

export interface StaffStatusFormPayload {
  id?: string;
  name: string;
  color: string;
  sortOrder: number;
}

interface AddStaffStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StaffStatusFormPayload) => Promise<void>;
  initialValue?: StaffStatusFormPayload | null;
  isSubmitting?: boolean;
}

export const AddStaffStatusModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  isSubmitting = false,
}: AddStaffStatusModalProps) => {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [color, setColor] = useState(initialValue?.color ?? COLORS[0]);
  const [sortOrder, setSortOrder] = useState(String(initialValue?.sortOrder ?? 0));

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({
      id: initialValue?.id,
      name: name.trim(),
      color,
      sortOrder: Number(sortOrder) || 0,
    });
    setName('');
    setColor(COLORS[0]);
    setSortOrder('0');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue?.id ? 'Редактировать статус сотрудника' : 'Добавить статус сотрудника'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Название"
          placeholder="Введите название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Порядок сортировки"
          type="number"
          placeholder="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-colors ${
                  color === c ? 'border-teal-500' : 'border-gray-200 hover:border-teal-400'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
