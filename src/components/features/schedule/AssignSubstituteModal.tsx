import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface AssignSubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName?: string;
  lessonDate?: string;
  currentSubstituteId?: string | null;
  staffOptions: { id: string; name: string }[];
  onSave: (substituteTeacherId: string | null) => Promise<void>;
  saving?: boolean;
  /**
   * When provided, shows a "период" toggle so the замена can be applied to every
   * lesson of this group/teacher within a date range instead of just this one day.
   */
  onSaveRange?: (params: { substituteTeacherId: string | null; fromDate: string; toDate: string }) => Promise<void>;
}

export const AssignSubstituteModal = ({
  isOpen,
  onClose,
  teacherName,
  lessonDate,
  currentSubstituteId,
  staffOptions,
  onSave,
  onSaveRange,
  saving = false,
}: AssignSubstituteModalProps) => {
  const [selectedId, setSelectedId] = useState(currentSubstituteId || '');
  const [mode, setMode] = useState<'day' | 'range'>('day');
  const [fromDate, setFromDate] = useState(lessonDate || '');
  const [toDate, setToDate] = useState(lessonDate || '');

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentSubstituteId || '');
      setMode('day');
      setFromDate(lessonDate || '');
      setToDate(lessonDate || '');
    }
  }, [isOpen, currentSubstituteId, lessonDate]);

  const handleSave = async () => {
    if (mode === 'range' && onSaveRange) {
      if (!fromDate || !toDate) return;
      await onSaveRange({ substituteTeacherId: selectedId || null, fromDate, toDate });
    } else {
      await onSave(selectedId || null);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Замена преподавателя"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (mode === 'range' && (!fromDate || !toDate || fromDate > toDate))}
          >
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#5b6472]">
          {teacherName ? `Основной преподаватель: ${teacherName}. ` : ''}
          Зарплата за занятия в выбранный период будет начислена заменяющему, а не основному преподавателю.
        </p>

        {onSaveRange && (
          <div className="flex rounded-xl border border-[#dbe2e8] bg-[#f4f7f9] p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode('day')}
              className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${
                mode === 'day' ? 'bg-white text-[#273142] shadow-sm' : 'text-[#5b6472]'
              }`}
            >
              На этот день{lessonDate ? ` (${lessonDate})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${
                mode === 'range' ? 'bg-white text-[#273142] shadow-sm' : 'text-[#5b6472]'
              }`}
            >
              На период
            </button>
          </div>
        )}

        {mode === 'range' && onSaveRange && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-[#3f4b5a]">
              С
              <input
                type="date"
                className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm outline-none focus:border-[#467aff]"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-[#3f4b5a]">
              По
              <input
                type="date"
                className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm outline-none focus:border-[#467aff]"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
          </div>
        )}

        <label className="block text-sm font-semibold text-[#3f4b5a]">
          Заменяющий преподаватель
          <select
            className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm outline-none focus:border-[#467aff]"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Без замены</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
};
