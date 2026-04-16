import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  FINANCE_AMOUNT_CHANGE_REASON_OPTIONS,
  INCOME_CATEGORIES,
  REFUND_CATEGORIES,
  TRANSACTION_STATUS_OPTIONS,
} from '@/constants/finance';
import type { AmountChangeReasonCode, CreateTransactionRequest, TransactionType } from '@/lib/api';
import type { TransactionFormValues } from '@/types/finance';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTransactionRequest) => Promise<void>;
  initialValues?: TransactionFormValues;
  students?: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  title?: string;
  transactionType?: Extract<TransactionType, 'INCOME' | 'REFUND'>;
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDefaultValues(): TransactionFormValues {
  return {
    amount: '',
    originalAmount: '',
    transactionDate: getTodayDate(),
    status: 'COMPLETED',
    category: '',
    description: '',
    notes: '',
    amountChangeReasonCode: '',
    amountChangeReasonOther: '',
    studentId: '',
  };
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

  return 'Не удалось сохранить транзакцию. Попробуйте ещё раз.';
}

export const AddIncomeModal = ({
  isOpen,
  onClose,
  onSave,
  initialValues,
  students = [],
  isSubmitting = false,
  title = 'Добавить доход',
  transactionType = 'INCOME',
}: AddIncomeModalProps) => {
  const defaults = initialValues ?? getDefaultValues();
  const isEditing = Boolean(initialValues);
  const categories = transactionType === 'REFUND' ? REFUND_CATEGORIES : INCOME_CATEGORIES;

  const [amount, setAmount] = useState(defaults.amount);
  const [transactionDate, setTransactionDate] = useState(defaults.transactionDate);
  const [status, setStatus] = useState(defaults.status);
  const [category, setCategory] = useState(defaults.category);
  const [studentId, setStudentId] = useState(defaults.studentId);
  const [description, setDescription] = useState(defaults.description);
  const [notes, setNotes] = useState(defaults.notes);
  const [amountChangeReasonCode, setAmountChangeReasonCode] = useState<AmountChangeReasonCode | ''>(defaults.amountChangeReasonCode);
  const [amountChangeReasonOther, setAmountChangeReasonOther] = useState(defaults.amountChangeReasonOther);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Сумма должна быть больше нуля.');
      return;
    }

    if (!transactionDate) {
      setError('Укажите дату транзакции.');
      return;
    }

    if (!isEditing) {
      if (amountChangeReasonCode === 'OTHER' && !amountChangeReasonOther.trim()) {
        setError('Для причины "Другое" заполните пояснение.');
        return;
      }

      if (amountChangeReasonCode && amountChangeReasonCode !== 'OTHER' && amountChangeReasonOther.trim()) {
        setError('Пояснение заполняется только для причины "Другое".');
        return;
      }

      if (!amountChangeReasonCode && amountChangeReasonOther.trim()) {
        setError('Сначала выберите причину изменения суммы.');
        return;
      }
    }

    try {
      await onSave({
        type: transactionType,
        status,
        amount: parsedAmount,
        currency: 'KZT',
        category: category || undefined,
        transactionDate,
        studentId: studentId || undefined,
        description: description.trim() || undefined,
        amountChangeReasonCode: !isEditing ? amountChangeReasonCode || undefined : undefined,
        amountChangeReasonOther:
          !isEditing && amountChangeReasonCode === 'OTHER' ? amountChangeReasonOther.trim() : undefined,
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Дата"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
          />
          <Input
            label="Сумма"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />
          <Select label="Статус" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {TRANSACTION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <Select label="Категория" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Без категории</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>

        <Select label="Студент" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">Не привязано</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </Select>

        {!isEditing ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Причина изменения суммы"
              value={amountChangeReasonCode}
              onChange={(event) => {
                const nextCode = event.target.value as AmountChangeReasonCode | '';
                setAmountChangeReasonCode(nextCode);
                if (nextCode !== 'OTHER') {
                  setAmountChangeReasonOther('');
                }
              }}
            >
              <option value="">Не выбрано</option>
              {FINANCE_AMOUNT_CHANGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Input
              label="Пояснение причины"
              value={amountChangeReasonOther}
              onChange={(event) => setAmountChangeReasonOther(event.target.value)}
              placeholder="Только для причины «Другое»"
              disabled={amountChangeReasonCode !== 'OTHER'}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Дополнительная информация"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Комментарий к операции"
            className="crm-textarea resize-none"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
