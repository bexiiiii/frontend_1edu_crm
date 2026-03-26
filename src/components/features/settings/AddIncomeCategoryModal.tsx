import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface IncomeCategoryFormPayload {
  id?: string;
  name: string;
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
      </div>
    </Modal>
  );
};
