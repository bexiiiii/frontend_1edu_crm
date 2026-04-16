import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getErrorMessage } from '@/lib/error-message';
import type { CreateSalaryPaymentRequest } from '@/lib/api';

interface SalaryStaffOption {
  id: string;
  name: string;
  outstandingAmount: number;
  dueAmount: number;
  paidAmount: number;
}

interface AddSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateSalaryPaymentRequest) => Promise<void>;
  staffOptions: SalaryStaffOption[];
  defaultStaffId?: string;
  lockStaff?: boolean;
  defaultMonth: string;
  initialValues?: Partial<CreateSalaryPaymentRequest>;
  title?: string;
  isSubmitting?: boolean;
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export const AddSalaryModal = ({
  isOpen,
  onClose,
  onSave,
  staffOptions,
  defaultStaffId = '',
  lockStaff = false,
  defaultMonth,
  initialValues,
  title = 'Зафиксировать выплату зарплаты',
  isSubmitting = false,
}: AddSalaryModalProps) => {
  const [staffId, setStaffId] = useState(initialValues?.staffId || defaultStaffId);
  const [salaryMonth, setSalaryMonth] = useState(initialValues?.salaryMonth || defaultMonth);
  const [amount, setAmount] = useState(initialValues?.amount != null ? String(initialValues.amount) : '');
  const [paymentDate, setPaymentDate] = useState(initialValues?.paymentDate || getTodayDate());
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const selectedStaff = useMemo(
    () => staffOptions.find((staff) => staff.id === staffId) ?? null,
    [staffId, staffOptions]
  );

  const handleSave = async () => {
    setError(null);

    const parsedAmount = Number(amount);

    if (!staffId) {
      setError('Выберите сотрудника.');
      return;
    }

    if (!salaryMonth) {
      setError('Укажите зарплатный месяц.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Сумма выплаты должна быть больше нуля.');
      return;
    }

    if (!paymentDate) {
      setError('Укажите дату выплаты.');
      return;
    }

    try {
      await onSave({
        staffId,
        salaryMonth,
        amount: parsedAmount,
        currency: 'KZT',
        paymentDate,
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Не удалось зафиксировать выплату.'));
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
        {lockStaff ? (
          <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Сотрудник</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2530]">{selectedStaff?.name || '—'}</p>
          </div>
        ) : (
          <Select label="Сотрудник" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
            <option value="">Выберите сотрудника</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </Select>
        )}

        {selectedStaff ? (
          <div className="rounded-xl border border-[#dfe6ed] bg-[#f8fafc] px-4 py-3 text-sm text-[#556070]">
            <div>Начислено: {selectedStaff.dueAmount.toLocaleString('ru-RU')} ₸</div>
            <div>Выплачено: {selectedStaff.paidAmount.toLocaleString('ru-RU')} ₸</div>
            <div className="font-semibold text-[#1f2530]">
              Осталось: {selectedStaff.outstandingAmount.toLocaleString('ru-RU')} ₸
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Зарплатный месяц"
            type="month"
            value={salaryMonth}
            onChange={(event) => setSalaryMonth(event.target.value)}
          />
          <Input
            label="Дата выплаты"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Сумма"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Например, 180000"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Валюта</label>
            <div className="crm-input flex items-center text-[#5d6676]">KZT</div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметка</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Например, частичная выплата"
            className="crm-textarea resize-none"
          />
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
