'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { salaryService } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/error-message';

export function CancelSalaryPaymentButton({ id, amount, status, onCancelled }: {
  id: string; amount: number; status: string; onCancelled: () => Promise<unknown>;
}) {
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const allowed = roles.some((role) => role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN')
    || permissions.includes('FINANCE_EDIT');
  if (!allowed || status === 'CANCELLED') return null;

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await salaryService.cancelPayment(id);
      await onCancelled();
      setOpen(false);
    } catch (failure) {
      setError(getErrorMessage(failure, 'Не удалось отменить выплату'));
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button type="button" title="Отменить выплату" aria-label="Отменить выплату"
      onClick={() => { setError(''); setOpen(true); }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50">
      <Trash2 className="h-4 w-4" />
    </button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title="Отменить выплату зарплаты?"
      footer={<><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Назад</Button>
        <Button disabled={busy} onClick={() => void cancel()}>{busy ? 'Отменяем…' : 'Отменить выплату'}</Button></>}>
      <div className="space-y-3 text-sm text-[#5f6b7b]">
        <p>Выплата <strong className="text-[#273142]">{Number(amount).toLocaleString('ru-RU')} ₸</strong> перестанет учитываться в зарплате. Остаток к выплате пересчитается во всех филиалах.</p>
        <p>Запись сохранится со статусом «Отменена». Связанная кассовая операция также будет отменена. Это не перевод и не возврат денег сотрудником.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      </div>
    </Modal>
  </>;
}
