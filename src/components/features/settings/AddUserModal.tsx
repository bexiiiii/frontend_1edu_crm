import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export interface UserFormPayload {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: string;
  permissions?: string[];
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormPayload) => Promise<void>;
  roleOptions: Array<{ value: string; label: string }>;
  availablePermissions: string[];
  initialValue?: UserFormPayload | null;
  permissionsLoaded?: boolean;
  isSubmitting?: boolean;
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

  return 'Не удалось сохранить пользователя. Попробуйте ещё раз.';
}

export const AddUserModal = ({
  isOpen,
  onClose,
  onSave,
  roleOptions,
  availablePermissions,
  initialValue = null,
  permissionsLoaded = true,
  isSubmitting = false,
}: AddUserModalProps) => {
  const isEditing = Boolean(initialValue?.id);
  const [username, setUsername] = useState(initialValue?.username ?? '');
  const [firstName, setFirstName] = useState(initialValue?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValue?.lastName ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValue?.role ?? 'TEACHER');
  const [permissions, setPermissions] = useState<string[]>(initialValue?.permissions ?? []);
  const [permissionsTouched, setPermissionsTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: string) => {
    setPermissionsTouched(true);
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Имя, фамилия и email обязательны.');
      return;
    }

    if (!isEditing && !password.trim()) {
      setError('Пароль обязателен при создании пользователя.');
      return;
    }

    const shouldSendPermissions = !isEditing || permissionsLoaded || permissionsTouched;

    try {
      await onSave({
        id: initialValue?.id,
        username: username.trim() || email.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: isEditing ? undefined : password.trim(),
        role,
        permissions: shouldSendPermissions ? permissions : undefined,
      });

      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('TEACHER');
      setPermissions([]);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать пользователя' : 'Добавить пользователя'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : isEditing ? 'Сохранить изменения' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Введите имя"
          />
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Введите фамилию"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Введите email"
          />
          <Input
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="По умолчанию возьмётся email"
            disabled={isEditing}
          />
        </div>

        {isEditing && (
          <p className="text-xs text-gray-500">
            Логин не меняется через текущий backend-контракт, поэтому поле доступно только для чтения.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isEditing ? (
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введите пароль"
            />
          ) : (
            <div />
          )}
          <Select
            label="Роль"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {roleOptions.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Гранулярные права</label>
          {isEditing && !permissionsLoaded && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              API не вернул текущие permissions пользователя. Если вы сохраните этот блок, backend получит ровно выбранный набор прав.
            </div>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
            {availablePermissions.length > 0 ? (
              availablePermissions.map((permission) => (
                <label key={permission} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                  />
                  <span className="text-sm text-gray-700">{permission}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">Список permissions не загружен.</p>
            )}
          </div>
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
