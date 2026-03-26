export interface Room {
  id: string;
  name: string;
}

export interface AttendanceStatus {
  id: string;
  name: string;
  deduct: boolean;
  pay: boolean;
  markAttendance: boolean;
  color: string;
}

export interface StaffStatus {
  id: string;
  name: string;
  pay: boolean;
  color: string;
}

export interface PaymentSource {
  id: string;
  name: string;
}

export interface IncomeCategory {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon?: string;
}
