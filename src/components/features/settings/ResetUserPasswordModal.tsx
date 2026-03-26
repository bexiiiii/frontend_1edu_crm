import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ResetUserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => Promise<void>;
  userName?: string;
  isSubmitting?: boolean;
}

export const ResetUserPasswordModal = ({
  isOpen,
  onClose,
  onSave,
  userName,
  isSubmitting = false,
}: ResetUserPasswordModalProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Новый пароль и подтверждение обязательны.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    await onSave(newPassword.trim());
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Сбросить пароль"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : 'Сбросить пароль'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          {userName ? `Новый пароль будет установлен для пользователя ${userName}.` : 'Укажите новый пароль пользователя.'}
        </p>

        <Input
          label="Новый пароль"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Введите новый пароль"
        />

        <Input
          label="Подтверждение пароля"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Повторите пароль"
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
