import { Edit, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  STAFF_ROLE_LABELS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_LABELS,
} from '@/constants/employee';
import type { StaffListItem } from '@/types/employee';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: StaffListItem | null;
  onEdit: () => void;
  onDelete: () => void;
  isMutating?: boolean;
}

export const EmployeeDetailModal = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
  isMutating = false,
}: EmployeeDetailModalProps) => {
  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Информация о сотруднике"
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={onDelete} disabled={isMutating}>
            Удалить
          </Button>
          <Button icon={Edit} onClick={onEdit} disabled={isMutating}>
            Редактировать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">ФИО</label>
          <p className="text-base font-semibold text-gray-900">{employee.fullName}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Роль</label>
            <p className="text-base text-gray-900">{STAFF_ROLE_LABELS[employee.role]}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Статус</label>
            <p className="text-base text-gray-900">{STAFF_STATUS_LABELS[employee.status]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
            <p className="text-base text-gray-900">{employee.email || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Телефон</label>
            <p className="text-base text-gray-900">{employee.phone || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Должность</label>
            <p className="text-base text-gray-900">{employee.position || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Дата найма</label>
            <p className="text-base text-gray-900">{employee.hireDate || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Схема оплаты</label>
            <p className="text-base text-gray-900">{STAFF_SALARY_TYPE_LABELS[employee.salaryType]}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              {employee.salaryType === 'FIXED' ? 'Фиксированная зарплата' : 'Процент сотрудника'}
            </label>
            <p className="text-base text-gray-900">
              {employee.salaryType === 'FIXED'
                ? employee.salary !== null
                  ? `${employee.salary.toLocaleString('ru-RU')} ₸`
                  : '—'
                : employee.salaryPercentage !== null
                  ? `${employee.salaryPercentage}%`
                  : '—'}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Комментарий</label>
          <p className="text-base whitespace-pre-wrap text-gray-900">{employee.notes || '—'}</p>
        </div>
      </div>
    </Modal>
  );
};
