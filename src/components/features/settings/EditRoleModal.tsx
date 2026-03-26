import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Role } from '@/types/settings';

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
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Название роли обязательно.');
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
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `Редактирование роли — ${role.name}` : 'Создать роль'}
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
          onChange={(event) => setName(event.target.value)}
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
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Permissions</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] p-4">
            {availablePermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                />
                <span className="text-sm text-gray-700">{permission}</span>
              </label>
            ))}
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
