import type { SalaryType, StaffRole, StaffStatus } from '@/lib/api';

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  ACTIVE: 'Активен',
  ON_LEAVE: 'В отпуске',
  DISMISSED: 'Уволен',
};

export const STAFF_STATUS_COLORS: Record<StaffStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-blue-100 text-blue-700',
  DISMISSED: 'bg-gray-100 text-gray-700',
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  TEACHER: 'Преподаватель',
  MANAGER: 'Менеджер',
  RECEPTIONIST: 'Ресепшионист',
  ACCOUNTANT: 'Бухгалтер',
  ADMIN: 'Администратор',
};

export const STAFF_ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: 'TEACHER', label: STAFF_ROLE_LABELS.TEACHER },
  { value: 'MANAGER', label: STAFF_ROLE_LABELS.MANAGER },
  { value: 'RECEPTIONIST', label: STAFF_ROLE_LABELS.RECEPTIONIST },
  { value: 'ACCOUNTANT', label: STAFF_ROLE_LABELS.ACCOUNTANT },
  { value: 'ADMIN', label: STAFF_ROLE_LABELS.ADMIN },
];

export const STAFF_STATUS_OPTIONS: Array<{ value: StaffStatus; label: string }> = [
  { value: 'ACTIVE', label: STAFF_STATUS_LABELS.ACTIVE },
  { value: 'ON_LEAVE', label: STAFF_STATUS_LABELS.ON_LEAVE },
  { value: 'DISMISSED', label: STAFF_STATUS_LABELS.DISMISSED },
];

export const STAFF_SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  FIXED: 'Фиксированная',
  PER_STUDENT_PERCENTAGE: 'Процент с учеников',
};

export const STAFF_SALARY_TYPE_OPTIONS: Array<{ value: SalaryType; label: string }> = [
  { value: 'FIXED', label: STAFF_SALARY_TYPE_LABELS.FIXED },
  { value: 'PER_STUDENT_PERCENTAGE', label: STAFF_SALARY_TYPE_LABELS.PER_STUDENT_PERCENTAGE },
];
