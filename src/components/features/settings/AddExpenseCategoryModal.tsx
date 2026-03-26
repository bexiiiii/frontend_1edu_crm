import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface ExpenseCategoryFormPayload {
  id?: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

interface AddExpenseCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseCategoryFormPayload) => Promise<void>;
  initialValue?: ExpenseCategoryFormPayload | null;
  isSubmitting?: boolean;
}

export const AddExpenseCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  isSubmitting = false,
}: AddExpenseCategoryModalProps) => {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [sortOrder, setSortOrder] = useState(String(initialValue?.sortOrder ?? 0));

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({
      id: initialValue?.id,
      name: name.trim(),
      sortOrder: Number(sortOrder) || 0,
      active: initialValue?.active ?? true,
    });
    setName('');
    setSortOrder('0');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue?.id ? 'Редактировать статью расхода' : 'Добавить статью расхода'}
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
      </div>
    </Modal>
  );
};
