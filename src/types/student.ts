import type { StudentGender, StudentStatus } from '@/lib/api';

export interface StudentListItem {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  customer: string;
  studentPhoto: string;
  email: string;
  phone: string;
  studentPhone: string;
  birthDate: string;
  gender: StudentGender | '';
  status: StudentStatus;
  parentName: string;
  parentPhone: string;
  address: string;
  city: string;
  school: string;
  grade: string;
  additionalInfo: string;
  contract: string;
  discount: string;
  comment: string;
  stateOrderParticipant: boolean;
  loyalty: string;
  additionalPhones: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormValues {
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  customer: string;
  studentPhoto: string;
  email: string;
  phone: string;
  studentPhone: string;
  birthDate: string;
  gender: StudentGender | '';
  status: StudentStatus;
  parentName: string;
  parentPhone: string;
  address: string;
  city: string;
  school: string;
  grade: string;
  additionalInfo: string;
  contract: string;
  discount: string;
  comment: string;
  stateOrderParticipant: boolean;
  loyalty: string;
  additionalPhones: string;
  notes: string;
}

export interface StudentFilters {
  search: string;
  status: StudentStatus | 'all';
}
