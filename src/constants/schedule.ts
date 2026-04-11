import { WeekDay, Teacher, Room, ClassSession } from '@/types/schedule';

export const WEEK_DAYS: WeekDay[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const TEACHERS: Teacher[] = [
  { id: '1', name: 'Иванов И.И.' },
  { id: '2', name: 'Петрова А.С.' },
  { id: '3', name: 'Сидоров П.П.' },
  { id: '4', name: 'Козлов В.А.' },
  { id: '5', name: 'Смирнова Л.В.' },
  { id: '6', name: 'Николаев А.П.' },
];

export const ROOMS: Room[] = [
  { id: '1', name: 'Кабинет 201' },
  { id: '2', name: 'Кабинет 105' },
  { id: '3', name: 'Кабинет 301' },
  { id: '4', name: 'Компьютерный класс' },
  { id: '5', name: 'Лаборатория' },
  { id: '6', name: 'Кабинет 150' },
];

export const CLASSES: ClassSession[] = [
  { id: '1', name: 'Математика - 5 класс', teacher: 'Иванов И.И.', room: 'Кабинет 201', type: 'group', format: 'offline' },
  { id: '2', name: 'Английский язык', teacher: 'Петрова А.С.', room: 'Кабинет 105', type: 'group', format: 'offline' },
  { id: '3', name: 'Физика - 9 класс', teacher: 'Сидоров П.П.', room: 'Кабинет 301', type: 'group', format: 'offline' },
  { id: '4', name: 'Программирование', teacher: 'Козлов В.А.', room: 'Компьютерный класс', type: 'group', format: 'offline' },
  { id: '5', name: 'Химия - 10 класс', teacher: 'Смирнова Л.В.', room: 'Лаборатория', type: 'group', format: 'offline' },
];

export const EVENT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#6366f1', // indigo
  '#f59e0b', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#467aff', // brand blue
];
