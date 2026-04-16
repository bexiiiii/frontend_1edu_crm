import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PAYMENT_AMOUNT_CHANGE_REASON_OPTIONS } from '@/constants/finance';
import type { PaymentAmountChangeReasonCode } from '@/lib/api';

interface PaymentAmountChangeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { reasonCode: PaymentAmountChangeReasonCode; reasonOther?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export const PaymentAmountChangeReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: PaymentAmountChangeReasonModalProps) => {
  const [reasonCode, setReasonCode] = useState<PaymentAmountChangeReasonCode | ''>('');
  const [reasonOther, setReasonOther] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);

    if (!reasonCode) {
      setError('Выберите причину изменения суммы.');
      return;
    }

    if (reasonCode === 'OTHER' && !reasonOther.trim()) {
      setError('Для причины «Другое» заполните пояснение.');
      return;
    }

    if (reasonCode !== 'OTHER' && reasonOther.trim()) {
      setError('Пояснение заполняется только для причины «Другое».');
      return;
    }

    await onConfirm({
      reasonCode,
      reasonOther: reasonCode === 'OTHER' ? reasonOther.trim() : undefined,
    });

    setReasonCode('');
    setReasonOther('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Причина изменения суммы"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Причина"
          value={reasonCode}
          onChange={(event) => {
            const nextReason = event.target.value as PaymentAmountChangeReasonCode | '';
            setReasonCode(nextReason);
            if (nextReason !== 'OTHER') {
              setReasonOther('');
            }
          }}
        >
          <option value="">Выберите причину</option>
          {PAYMENT_AMOUNT_CHANGE_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Input
          label="Пояснение"
          value={reasonOther}
          onChange={(event) => setReasonOther(event.target.value)}
          placeholder="Только для причины «Другое»"
          disabled={reasonCode !== 'OTHER'}
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
