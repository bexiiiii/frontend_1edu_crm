import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PAYMENT_METHOD_LABELS } from '@/constants/finance';
import type { CreateStudentPaymentRequest, PaymentMethod } from '@/lib/api';

interface SubscriptionOption {
  id: string;
  label: string;
  studentId: string;
}

interface StudentOption {
  id: string;
  name: string;
}

interface AddStudentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStudentPaymentRequest) => Promise<void>;
  students: StudentOption[];
  defaultStudentId?: string;
  lockStudent?: boolean;
  subscriptions: SubscriptionOption[];
  defaultSubscriptionId?: string;
  isSubmitting?: boolean;
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getCurrentMonth(): string {
  return getTodayDate().slice(0, 7);
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

  return 'Не удалось сохранить платёж. Попробуйте ещё раз.';
}

export const AddStudentPaymentModal = ({
  isOpen,
  onClose,
  onSave,
  students,
  defaultStudentId,
  lockStudent = false,
  subscriptions,
  defaultSubscriptionId,
  isSubmitting = false,
}: AddStudentPaymentModalProps) => {
  const [studentId, setStudentId] = useState(defaultStudentId || '');
  const [subscriptionId, setSubscriptionId] = useState(defaultSubscriptionId || subscriptions[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(getTodayDate());
  const [paymentMonth, setPaymentMonth] = useState(getCurrentMonth());
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) || null,
    [studentId, students]
  );
  const availableSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.studentId === studentId),
    [studentId, subscriptions]
  );

  const handleStudentChange = (nextStudentId: string) => {
    setStudentId(nextStudentId);
    const nextSubscription = subscriptions.find((subscription) => subscription.studentId === nextStudentId);
    setSubscriptionId(nextSubscription?.id || '');
  };

  const handleSave = async () => {
    setError(null);

    const parsedAmount = Number(amount);
    if (!studentId) {
      setError('Выберите ученика.');
      return;
    }

    if (!subscriptionId) {
      setError('Выберите абонемент для платежа.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Сумма платежа должна быть больше нуля.');
      return;
    }

    if (!paidAt) {
      setError('Укажите дату платежа.');
      return;
    }

    if (!paymentMonth) {
      setError('Укажите оплачиваемый месяц.');
      return;
    }

    try {
      await onSave({
        studentId,
        subscriptionId,
        amount: parsedAmount,
        paidAt,
        paymentMonth,
        method,
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
      title="Записать платёж студента"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || subscriptions.length === 0}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a93a3]">Студент</p>
          {lockStudent ? (
            <p className="mt-1 text-sm font-semibold text-[#1f2530]">{selectedStudent?.name || '—'}</p>
          ) : (
            <Select value={studentId} onChange={(event) => handleStudentChange(event.target.value)}>
              <option value="">Выберите ученика</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Select label="Абонемент" value={subscriptionId} onChange={(event) => setSubscriptionId(event.target.value)}>
          <option value="">Выберите абонемент</option>
          {availableSubscriptions.map((subscription) => (
            <option key={subscription.id} value={subscription.id}>
              {subscription.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Сумма"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />
          <Select label="Метод оплаты" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Дата платежа"
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
          />
          <Input
            label="Месяц оплаты"
            type="month"
            value={paymentMonth}
            onChange={(event) => setPaymentMonth(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Комментарий к платежу"
            className="crm-textarea resize-none"
          />
        </div>

        {studentId && availableSubscriptions.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            У выбранного студента нет доступных абонементов для привязки платежа.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
