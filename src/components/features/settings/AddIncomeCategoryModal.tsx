import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COLORS, YES_NO_OPTIONS } from '@/constants/settings-data';

export interface IncomeCategoryFormPayload {
  id?: string;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

interface AddIncomeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IncomeCategoryFormPayload) => Promise<void>;
  initialValue?: IncomeCategoryFormPayload | null;
  isSubmitting?: boolean;
}

export const AddIncomeCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  isSubmitting = false,
}: AddIncomeCategoryModalProps) => {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [color, setColor] = useState(initialValue?.color ?? COLORS[0]);
  const [sortOrder, setSortOrder] = useState(String(initialValue?.sortOrder ?? 0));
  const [active, setActive] = useState(initialValue?.active ?? true ? 'yes' : 'no');

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({
      id: initialValue?.id,
      name: name.trim(),
      color,
      sortOrder: Number(sortOrder) || 0,
      active: active === 'yes',
    });
    setName('');
    setColor(COLORS[0]);
    setSortOrder('0');
    setActive('yes');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue?.id ? 'Редактировать статью дохода' : 'Добавить статью дохода'}
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

        <Select label="Активность" value={active} onChange={(event) => setActive(event.target.value)}>
          {YES_NO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

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
      </div>
    </Modal>
  );
};
