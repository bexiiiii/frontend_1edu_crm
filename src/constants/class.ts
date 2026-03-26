import type {
  CourseFormat,
  CourseStatus,
  CourseType,
  LessonStatus,
  LessonType,
} from '@/lib/api';
import { Class, ClassStatus, ClassType, ClassFormat } from '@/types/class';

export const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'group', label: 'Группа' },
  { value: 'individual', label: 'Индивидуальные' },
];

export const CLASS_FORMATS: { value: ClassFormat; label: string }[] = [
  { value: 'offline', label: 'Оффлайн' },
  { value: 'online', label: 'Онлайн' },
];

export const CLASS_STATUSES: { value: ClassStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Активен', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'inactive', label: 'Неактивен', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'archived', label: 'Архивирован', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

export const MOCK_TEACHERS = [
  'Бехруз',
  'Иванов И.И.',
  'Петрова А.С.',
  'Сидоров П.П.',
  'Козлов В.А.',
];

export const MOCK_ROOMS = [
  'Кабинет 101',
  'Кабинет 102',
  'Кабинет 201',
  'Онлайн зал',
];

export const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    type: 'group',
    format: 'offline',
    name: 'Английский',
    description: 'Курс английского языка для начинающих',
    basePrice: 5000,
    enrollmentLimit: 10,
    color: '#6366f1',
    status: 'active',
    participants: [],
    teachers: ['Бехруз'],
    room: 'Кабинет 101',
    students: 0,
  },
  {
    id: '2',
    type: 'group',
    format: 'offline',
    name: 'Математика',
    description: 'Подготовка к ЕГЭ по математике',
    basePrice: 6000,
    enrollmentLimit: 8,
    color: '#10b981',
    status: 'active',
    participants: [],
    teachers: ['Иванов И.И.', 'Петрова А.С.'],
    room: 'Кабинет 102',
    students: 5,
  },
  {
    id: '3',
    type: 'individual',
    format: 'online',
    name: 'Программирование',
    description: 'Индивидуальные занятия по Python',
    basePrice: 3000,
    color: '#f59e0b',
    status: 'active',
    participants: [],
    teachers: ['Сидоров П.П.'],
    students: 3,
  },
];

export const COLORS = [
  '#6366f1', // indigo
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

export const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'GROUP', label: 'Групповое' },
  { value: 'INDIVIDUAL', label: 'Индивидуальное' },
  { value: 'TRIAL', label: 'Пробное' },
];

export const LESSON_STATUSES: { value: LessonStatus; label: string; color: string }[] = [
  { value: 'PLANNED', label: 'Запланировано', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'COMPLETED', label: 'Проведено', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'CANCELLED', label: 'Отменено', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'TEACHER_ABSENT', label: 'Учитель отсутствует', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'TEACHER_SICK', label: 'Учитель болеет', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export const COURSE_TYPES: { value: CourseType; label: string }[] = [
  { value: 'GROUP', label: 'Групповой' },
  { value: 'INDIVIDUAL', label: 'Индивидуальный' },
];

export const COURSE_FORMATS: { value: CourseFormat; label: string }[] = [
  { value: 'OFFLINE', label: 'Оффлайн' },
  { value: 'ONLINE', label: 'Онлайн' },
];

export const COURSE_STATUSES: { value: CourseStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Активный', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'INACTIVE', label: 'Неактивный', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'ARCHIVED', label: 'Архивный', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];
