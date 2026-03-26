import type { SalaryType, StaffRole, StaffStatus } from '@/lib/api';

export interface SalaryReportItem {
  id: string;
  staffId: string;
  employeeName: string;
  position: string;
  role: StaffRole;
  status: StaffStatus;
  salaryType: SalaryType;
  fixedSalary: number;
  salaryPercentage: number | null;
  activeStudentCount: number;
  percentageBaseAmount: number;
  dueAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentCount: number;
  currency: string;
  period: string;
}

export interface SalaryFilters {
  searchEmployee: string;
  position: string;
  month: string;
}
