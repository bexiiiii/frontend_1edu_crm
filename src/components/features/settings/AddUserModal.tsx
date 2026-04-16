import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { pushToast } from '@/lib/toast';

export interface UserFormPayload {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: string;
}

interface AvailableStaffOption {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormPayload) => Promise<void>;
  roleOptions: Array<{ value: string; label: string }>;
  availableStaff: AvailableStaffOption[];
  initialValue?: UserFormPayload | null;
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
  availableStaff,
  initialValue = null,
  isSubmitting = false,
}: AddUserModalProps) => {
  const isEditing = Boolean(initialValue?.id);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [username, setUsername] = useState(initialValue?.username ?? '');
  const [firstName, setFirstName] = useState(initialValue?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValue?.lastName ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValue?.role ?? 'TEACHER');
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});

  const staffById = useMemo(
    () => new Map(availableStaff.map((staff) => [staff.id, staff] as const)),
    [availableStaff]
  );

  const handleSave = async () => {
    setFieldErrors({});

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFieldErrors({
        firstName: !firstName.trim(),
        lastName: !lastName.trim(),
        email: !email.trim(),
      });
      pushToast({ message: 'Имя, фамилия и email обязательны.', tone: 'error' });
      return;
    }

    if (!isEditing && !password.trim()) {
      setFieldErrors({ password: true });
      pushToast({ message: 'Пароль обязателен при создании пользователя.', tone: 'error' });
      return;
    }

    try {
      await onSave({
        id: initialValue?.id,
        username: username.trim() || email.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: isEditing ? undefined : password.trim(),
        role,
      });

      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('TEACHER');
      setSelectedStaffId('');
    } catch (submitError) {
      pushToast({ message: getErrorMessage(submitError), tone: 'error' });
    }
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);

    const selectedStaff = staffById.get(staffId);
    if (!selectedStaff) {
      return;
    }

    setFirstName(selectedStaff.firstName || '');
    setLastName(selectedStaff.lastName || '');
    setEmail(selectedStaff.email || '');
    setUsername((selectedStaff.email || '').trim());
    setFieldErrors((prev) => ({
      ...prev,
      firstName: false,
      lastName: false,
      email: false,
    }));
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
        {!isEditing ? (
          <Select
            label="Сотрудник"
            value={selectedStaffId}
            onChange={(event) => handleSelectStaff(event.target.value)}
          >
            <option value="">Выберите сотрудника (опционально)</option>
            {availableStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.fullName}
                {staff.email ? ` • ${staff.email}` : ''}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
              setFieldErrors((prev) => ({ ...prev, firstName: false }));
            }}
            placeholder="Введите имя"
            error={Boolean(fieldErrors.firstName)}
          />
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
              setFieldErrors((prev) => ({ ...prev, lastName: false }));
            }}
            placeholder="Введите фамилию"
            error={Boolean(fieldErrors.lastName)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, email: false }));
            }}
            placeholder="Введите email"
            error={Boolean(fieldErrors.email)}
          />
          <Input
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="По умолчанию возьмётся email"
            disabled={isEditing}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isEditing ? (
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((prev) => ({ ...prev, password: false }));
              }}
              placeholder="Введите пароль"
              error={Boolean(fieldErrors.password)}
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

      </div>
    </Modal>
  );
};
