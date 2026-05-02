import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { pushToast } from '@/lib/toast';
import type { Role } from '@/types/settings';

const ROLE_LABELS_RU: Record<string, string> = {
  TENANT_ADMIN: 'Администратор тенанта',
  MANAGER: 'Руководитель',
  RECEPTIONIST: 'Администратор ресепшена',
  TEACHER: 'Преподаватель',
  ACCOUNTANT: 'Бухгалтер',
};

const PERMISSION_LABELS_RU: Record<string, string> = {
  STUDENTS_VIEW: 'Просмотр учеников',
  STUDENTS_CREATE: 'Создание учеников',
  STUDENTS_EDIT: 'Редактирование учеников',
  STUDENTS_DELETE: 'Удаление учеников',
  GROUPS_VIEW: 'Просмотр групп',
  GROUPS_CREATE: 'Создание групп',
  GROUPS_EDIT: 'Редактирование групп',
  GROUPS_DELETE: 'Удаление групп',
  ROOMS_VIEW: 'Просмотр кабинетов',
  ROOMS_CREATE: 'Создание кабинетов',
  ROOMS_EDIT: 'Редактирование кабинетов',
  ROOMS_DELETE: 'Удаление кабинетов',
  LESSONS_VIEW: 'Просмотр занятий',
  LESSONS_CREATE: 'Создание занятий',
  LESSONS_EDIT: 'Редактирование занятий',
  LESSONS_DELETE: 'Удаление занятий',
  LESSONS_MARK_ATTENDANCE: 'Отметка посещаемости',
  LEADS_VIEW: 'Просмотр лидов',
  LEADS_CREATE: 'Создание лидов',
  LEADS_EDIT: 'Редактирование лидов',
  LEADS_DELETE: 'Удаление лидов',
  FINANCE_VIEW: 'Просмотр финансов',
  FINANCE_CREATE: 'Создание финансовых операций',
  FINANCE_EDIT: 'Редактирование финансовых операций',
  SUBSCRIPTIONS_VIEW: 'Просмотр абонементов',
  SUBSCRIPTIONS_CREATE: 'Создание абонементов',
  SUBSCRIPTIONS_EDIT: 'Редактирование абонементов',
  PRICE_LISTS_VIEW: 'Просмотр прайс-листов',
  PRICE_LISTS_CREATE: 'Создание прайс-листов',
  PRICE_LISTS_EDIT: 'Редактирование прайс-листов',
  PRICE_LISTS_DELETE: 'Удаление прайс-листов',
  TASKS_VIEW: 'Просмотр задач',
  TASKS_CREATE: 'Создание задач',
  TASKS_EDIT: 'Редактирование задач',
  TASKS_DELETE: 'Удаление задач',
  STAFF_VIEW: 'Просмотр сотрудников',
  STAFF_CREATE: 'Создание сотрудников',
  STAFF_EDIT: 'Редактирование сотрудников',
  STAFF_DELETE: 'Удаление сотрудников',
  ANALYTICS_VIEW: 'Просмотр аналитики',
  REPORTS_VIEW: 'Просмотр отчётов',
  SETTINGS_VIEW: 'Просмотр настроек',
  SETTINGS_EDIT: 'Редактирование настроек',
  INVENTORY_VIEW: 'Просмотр склада',
  INVENTORY_EDIT: 'Редактирование склада',
  INVENTORY_DELETE: 'Удаление со склада',
};

export interface RoleFormPayload {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
}

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  availablePermissions: string[];
  onSave: (role: RoleFormPayload) => Promise<void>;
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

  return 'Не удалось сохранить роль. Попробуйте ещё раз.';
}

export const EditRoleModal = ({
  isOpen,
  onClose,
  role,
  availablePermissions,
  onSave,
  isSubmitting = false,
}: EditRoleModalProps) => {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [nameError, setNameError] = useState(false);

  const getRoleLabel = (value: string) => ROLE_LABELS_RU[value] || value;

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    setNameError(false);

    if (!name.trim()) {
      setNameError(true);
      pushToast({ message: 'Название роли обязательно.', tone: 'error' });
      return;
    }

    try {
      await onSave({
        id: role?.id,
        name: name.trim(),
        description: description.trim(),
        permissions,
      });
    } catch (submitError) {
      pushToast({ message: getErrorMessage(submitError), tone: 'error' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `Редактирование роли — ${getRoleLabel(role.name)}` : 'Создать роль'}
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
      <div className="space-y-6">
        <Input
          label="Название"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(false);
          }}
          error={nameError}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Права доступа</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
            {availablePermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                />
                <span className="text-sm text-gray-700">{PERMISSION_LABELS_RU[permission] || permission}</span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
};
