import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COLORS, YES_NO_OPTIONS } from '@/constants/settings-data';

export interface CourseLevelFormPayload {
  id?: string;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
  systemLevel?: boolean;
}

interface AddCourseLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CourseLevelFormPayload) => Promise<void>;
  initialValue?: CourseLevelFormPayload | null;
  isSubmitting?: boolean;
}

export const AddCourseLevelModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  isSubmitting = false,
}: AddCourseLevelModalProps) => {
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
      systemLevel: initialValue?.systemLevel,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue?.id ? 'Редактировать уровень' : 'Добавить уровень'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
          <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input label="Название уровня" placeholder="Например, Beginner" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Порядок сортировки" type="number" placeholder="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        <Select label="Активность" value={active} onChange={(event) => setActive(event.target.value)}>
          {YES_NO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Цвет уровня</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((candidate) => (
              <button key={candidate} type="button" aria-label={`Выбрать цвет ${candidate}`} onClick={() => setColor(candidate)}
                className={`h-8 w-8 rounded-lg border-2 transition-colors ${color === candidate ? 'border-[#467aff]' : 'border-gray-200 hover:border-[#7aa0ff]'}`}
                style={{ backgroundColor: candidate }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
