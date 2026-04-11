import type { SalaryType, StaffRole, StaffStatus } from '@/lib/api';

export interface StaffListItem {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  customStatus: string;
  position: string;
  salary: number | null;
  salaryType: SalaryType;
  salaryPercentage: number | null;
  hireDate: string;
  notes: string;
}

export interface StaffFilters {
  search: string;
  role: StaffRole | 'all';
  status: StaffStatus | 'all';
}

export interface StaffFormValues {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  customStatus: string;
  position: string;
  salary: string;
  salaryType: SalaryType;
  salaryPercentage: string;
  hireDate: string;
  notes: string;
}
