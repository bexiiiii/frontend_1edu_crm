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
  permissions?: string[];
  permissionsSource?: string;
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
  availableStaff,
  availablePermissions,
  initialValue = null,
  permissionsLoaded = true,
  isSubmitting = false,
}: AddUserModalProps) => {
  const isEditing = Boolean(initialValue?.id);
  const initialPermissionMode = initialValue?.permissionsSource?.startsWith('USER') ? 'user' : 'role';
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [username, setUsername] = useState(initialValue?.username ?? '');
  const [firstName, setFirstName] = useState(initialValue?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValue?.lastName ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValue?.role ?? 'TEACHER');
  const [permissionMode, setPermissionMode] = useState<'role' | 'user'>(initialPermissionMode);
  const [permissions, setPermissions] = useState<string[]>(initialValue?.permissions ?? []);
  const [permissionsTouched, setPermissionsTouched] = useState(false);
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

  const togglePermission = (permission: string) => {
    setPermissionsTouched(true);
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    );
  };

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

    const shouldSendPermissions = permissionMode === 'user' && (!isEditing || permissionsLoaded || permissionsTouched);
    const nextPermissionsSource = permissionMode === 'user' ? 'USER' : role ? `ROLE:${role}` : undefined;

    try {
      await onSave({
        id: initialValue?.id,
        username: username.trim() || email.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: isEditing ? undefined : password.trim(),
        role,
        permissionsSource: nextPermissionsSource,
        permissions: shouldSendPermissions ? permissions : undefined,
      });

      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('TEACHER');
      setPermissionMode('role');
      setPermissions([]);
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

        <div>
          <Select
            label="Права доступа"
            value={permissionMode}
            onChange={(event) => setPermissionMode(event.target.value as 'role' | 'user')}
          >
            <option value="role">От роли</option>
            <option value="user">Вручную</option>
          </Select>

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
                    disabled={permissionMode === 'role'}
                    className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                  />
                  <span className="text-sm text-gray-700">{permission}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">Список permissions не загружен.</p>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
};
