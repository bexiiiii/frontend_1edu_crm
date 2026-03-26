import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  STAFF_ROLE_OPTIONS,
  STAFF_SALARY_TYPE_OPTIONS,
  STAFF_STATUS_OPTIONS,
} from '@/constants/employee';
import type { CreateStaffRequest, UpdateStaffRequest } from '@/lib/api';
import type { StaffFormValues } from '@/types/employee';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStaffRequest | UpdateStaffRequest) => Promise<void>;
  initialValues?: StaffFormValues;
  isSubmitting?: boolean;
  title?: string;
  includeStatus?: boolean;
}

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDefaultValues(): StaffFormValues {
  return {
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    role: 'TEACHER',
    status: 'ACTIVE',
    position: '',
    salary: '',
    salaryType: 'FIXED',
    salaryPercentage: '',
    hireDate: getTodayDate(),
    notes: '',
  };
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

  return 'Не удалось сохранить сотрудника. Попробуйте ещё раз.';
}

export const AddEmployeeModal = ({
  isOpen,
  onClose,
  onSave,
  initialValues,
  isSubmitting = false,
  title = 'Добавить сотрудника',
  includeStatus = false,
}: AddEmployeeModalProps) => {
  const defaults = initialValues ?? getDefaultValues();

  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [middleName, setMiddleName] = useState(defaults.middleName);
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [role, setRole] = useState(defaults.role);
  const [status, setStatus] = useState(defaults.status);
  const [position, setPosition] = useState(defaults.position);
  const [salary, setSalary] = useState(defaults.salary);
  const [salaryType, setSalaryType] = useState(defaults.salaryType);
  const [salaryPercentage, setSalaryPercentage] = useState(defaults.salaryPercentage);
  const [hireDate, setHireDate] = useState(defaults.hireDate);
  const [notes, setNotes] = useState(defaults.notes);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Имя и фамилия обязательны.');
      return;
    }

    const parsedSalary = salary ? Number(salary) : undefined;
    if (parsedSalary !== undefined && (!Number.isFinite(parsedSalary) || parsedSalary < 0)) {
      setError('Зарплата должна быть положительным числом.');
      return;
    }

    if (salaryType === 'FIXED' && parsedSalary === undefined) {
      setError('Для фиксированной схемы укажите зарплату.');
      return;
    }

    const parsedSalaryPercentage = salaryPercentage ? Number(salaryPercentage) : undefined;
    if (
      parsedSalaryPercentage !== undefined &&
      (!Number.isFinite(parsedSalaryPercentage) || parsedSalaryPercentage < 0 || parsedSalaryPercentage > 100)
    ) {
      setError('Процент должен быть числом от 0 до 100.');
      return;
    }

    if (salaryType === 'PER_STUDENT_PERCENTAGE' && parsedSalaryPercentage === undefined) {
      setError('Для процентной схемы укажите процент сотрудника.');
      return;
    }

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
      position: position.trim() || undefined,
      salary: salaryType === 'FIXED' ? parsedSalary : 0,
      salaryType,
      salaryPercentage: salaryType === 'PER_STUDENT_PERCENTAGE' ? parsedSalaryPercentage : undefined,
      hireDate: hireDate || undefined,
      notes: notes.trim() || undefined,
      ...(includeStatus ? { status } : {}),
    };

    try {
      await onSave(payload);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
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
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Иванов"
          />
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Иван"
          />
          <Input
            label="Отчество"
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
            placeholder="Иванович"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
          />
          <Input
            label="Телефон"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 777 000 00 00"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Роль"
            value={role}
            onChange={(event) => setRole(event.target.value as StaffFormValues['role'])}
          >
            {STAFF_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {includeStatus ? (
            <Select
              label="Статус"
              value={status}
              onChange={(event) => setStatus(event.target.value as StaffFormValues['status'])}
            >
              {STAFF_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Дата найма"
              type="date"
              value={hireDate}
              onChange={(event) => setHireDate(event.target.value)}
            />
          )}

          <Select
            label="Схема оплаты"
            value={salaryType}
            onChange={(event) => setSalaryType(event.target.value as StaffFormValues['salaryType'])}
          >
            {STAFF_SALARY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Должность"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="Например, преподаватель английского"
          />
          {salaryType === 'FIXED' ? (
            <Input
              label="Фиксированная зарплата"
              type="number"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
              placeholder="Например, 3000000"
            />
          ) : (
            <Input
              label="Процент сотрудника"
              type="number"
              value={salaryPercentage}
              onChange={(event) => setSalaryPercentage(event.target.value)}
              placeholder="Например, 35"
            />
          )}
        </div>

        {includeStatus && (
          <Input
            label="Дата найма"
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
          />
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Комментарий
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Опционально"
            className="crm-textarea resize-none"
          />
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
