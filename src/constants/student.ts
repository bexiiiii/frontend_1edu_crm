import type { StudentGender, StudentStatus } from '@/lib/api';

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: 'Активный',
  INACTIVE: 'Неактивный',
  GRADUATED: 'Выпускник',
  DROPPED: 'Выбыл',
  ON_HOLD: 'На паузе',
};

export const STUDENT_STATUS_COLORS: Record<StudentStatus, string> = {
  ACTIVE: 'border-green-200 bg-green-100 text-green-700',
  INACTIVE: 'border-gray-200 bg-gray-100 text-gray-700',
  GRADUATED: 'border-blue-200 bg-blue-100 text-blue-700',
  DROPPED: 'border-red-200 bg-red-100 text-red-700',
  ON_HOLD: 'border-amber-200 bg-amber-100 text-amber-700',
};

export const STUDENT_STATUS_OPTIONS: Array<{ value: StudentStatus; label: string }> = [
  { value: 'ACTIVE', label: STUDENT_STATUS_LABELS.ACTIVE },
  { value: 'INACTIVE', label: STUDENT_STATUS_LABELS.INACTIVE },
  { value: 'GRADUATED', label: STUDENT_STATUS_LABELS.GRADUATED },
  { value: 'DROPPED', label: STUDENT_STATUS_LABELS.DROPPED },
  { value: 'ON_HOLD', label: STUDENT_STATUS_LABELS.ON_HOLD },
];

export const STUDENT_GENDER_LABELS: Record<StudentGender, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
};

export const STUDENT_GENDER_OPTIONS: Array<{ value: StudentGender; label: string }> = [
  { value: 'MALE', label: STUDENT_GENDER_LABELS.MALE },
  { value: 'FEMALE', label: STUDENT_GENDER_LABELS.FEMALE },
];

type MockStudentPreview = {
  id: string;
  fullName: string;
  customer?: string;
  phones: Array<{ number: string; isPrimary: boolean }>;
  balance: number;
};

export const MOCK_STUDENTS: MockStudentPreview[] = [
  {
    id: '1',
    fullName: 'Иванов Алексей Петрович',
    customer: 'Иванов Петр Сергеевич',
    phones: [
      { number: '+7 (999) 123-45-67', isPrimary: true },
      { number: '+7 (999) 765-43-21', isPrimary: false },
    ],
    balance: 15000,
  },
  {
    id: '2',
    fullName: 'Смирнова Мария Дмитриевна',
    customer: 'Смирнова Анна Владимировна',
    phones: [
      { number: '+7 (999) 234-56-78', isPrimary: true },
    ],
    balance: -5000,
  },
  {
    id: '3',
    fullName: 'Петров Иван Сергеевич',
    customer: 'Петрова Елена Ивановна',
    phones: [
      { number: '+7 (999) 345-67-89', isPrimary: true },
    ],
    balance: 0,
  },
];
