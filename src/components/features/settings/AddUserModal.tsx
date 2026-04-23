import { useEffect, useMemo, useState } from 'react';
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
  staffId?: string | null;
  branchIds: string[];
}

interface AvailableStaffOption {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface BranchOption {
  id: string;
  name: string;
  code?: string | null;
  active?: boolean;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormPayload) => Promise<void>;
  roleOptions: Array<{ value: string; label: string }>;
  availableStaff: AvailableStaffOption[];
  branchOptions: BranchOption[];
  defaultBranchId?: string | null;
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
  branchOptions,
  defaultBranchId = null,
  initialValue = null,
  isSubmitting = false,
}: AddUserModalProps) => {
  const isEditing = Boolean(initialValue?.id);
  const [selectedStaffId, setSelectedStaffId] = useState(initialValue?.staffId ?? '');
  const [username, setUsername] = useState(initialValue?.username ?? '');
  const [firstName, setFirstName] = useState(initialValue?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValue?.lastName ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValue?.role ?? 'TEACHER');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    initialValue?.branchIds?.length
      ? initialValue.branchIds
      : defaultBranchId
        ? [defaultBranchId]
        : branchOptions[0]?.id
          ? [branchOptions[0].id]
          : []
  );
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    password?: boolean;
    branchIds?: boolean;
  }>({});

  useEffect(() => {
    if (selectedBranchIds.length > 0 || branchOptions.length === 0) {
      return;
    }

    const nextDefaultBranchId = defaultBranchId && branchOptions.some((branch) => branch.id === defaultBranchId)
      ? defaultBranchId
      : branchOptions[0]?.id;

    if (nextDefaultBranchId) {
      setSelectedBranchIds([nextDefaultBranchId]);
    }
  }, [branchOptions, defaultBranchId, selectedBranchIds.length]);

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

    if (branchOptions.length > 0 && selectedBranchIds.length === 0) {
      setFieldErrors({ branchIds: true });
      pushToast({ message: 'Выберите хотя бы один филиал.', tone: 'error' });
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
        staffId: selectedStaffId || null,
        branchIds: selectedBranchIds,
      });

      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('TEACHER');
      setSelectedStaffId('');
      setSelectedBranchIds(defaultBranchId ? [defaultBranchId] : []);
    } catch (submitError) {
      pushToast({ message: getErrorMessage(submitError), tone: 'error' });
    }
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      if (prev.includes(branchId)) {
        return prev.filter((id) => id !== branchId);
      }

      return [...prev, branchId];
    });
    setFieldErrors((prev) => ({ ...prev, branchIds: false }));
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

        <div className={`rounded-xl border p-3 ${fieldErrors.branchIds ? 'border-red-300 bg-red-50/30' : 'border-[#dbe2e8] bg-white'}`}>
          <p className="mb-2 text-sm font-medium text-[#5d6676]">Филиалы доступа</p>

          {branchOptions.length === 0 ? (
            <p className="text-sm text-[#8c95a3]">Филиалы не найдены. Добавьте филиал в настройках.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {branchOptions.map((branch) => {
                const checked = selectedBranchIds.includes(branch.id);
                const label = branch.code ? `${branch.name} (${branch.code})` : branch.name;

                return (
                  <label
                    key={branch.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? 'border-[#467aff] bg-[#edf3ff] text-[#315fd0]'
                        : 'border-[#dbe2e8] bg-white text-[#4b5565]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleBranch(branch.id)}
                      className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                    />
                    <span className="truncate">{label}</span>
                    {branch.active === false ? <span className="ml-auto text-xs text-[#ef4444]">неактивен</span> : null}
                  </label>
                );
              })}
            </div>
          )}
        </div>

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
