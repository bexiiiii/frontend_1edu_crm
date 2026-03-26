import type { 
  Room, 
  AttendanceStatus, 
  StaffStatus, 
  PaymentSource, 
  IncomeCategory, 
  ExpenseCategory,
  Integration 
} from '@/types/settings-data';

export const MOCK_ROOMS: Room[] = [
  { id: '1', name: 'Ашег' },
];

export const MOCK_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  {
    id: '1',
    name: 'Посетил(а)',
    deduct: true,
    pay: true,
    markAttendance: true,
    color: '#10b981',
  },
  {
    id: '2',
    name: 'Пропустил(а)',
    deduct: true,
    pay: true,
    markAttendance: false,
    color: '#f59e0b',
  },
  {
    id: '3',
    name: 'Болел',
    deduct: false,
    pay: false,
    markAttendance: false,
    color: '#ef4444',
  },
];

export const MOCK_STAFF_STATUSES: StaffStatus[] = [
  {
    id: '1',
    name: 'Занятие проведено',
    pay: true,
    color: '#10b981',
  },
  {
    id: '2',
    name: 'Не выход на работу',
    pay: false,
    color: '#f59e0b',
  },
  {
    id: '3',
    name: 'Болел (-а)',
    pay: false,
    color: '#ef4444',
  },
];

export const MOCK_PAYMENT_SOURCES: PaymentSource[] = [
  { id: '1', name: 'Безналичный перевод' },
  { id: '2', name: 'Интернет эквайринг' },
  { id: '3', name: 'Наличные переводы' },
  { id: '4', name: 'Оплата картой через терминал' },
  { id: '5', name: 'Kaspi QR' },
];

export const MOCK_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: '1', name: 'Покупка абонемента' },
  { id: '2', name: 'Разовое занятие' },
  { id: '3', name: 'Пробный урок' },
];

export const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'Аренда' },
  { id: '2', name: 'Заработная плата' },
  { id: '3', name: 'Канцелярские товары' },
];

export const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
  '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];

export const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Нет' },
];

export const INTEGRATIONS: Integration[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Ведите переписки WhatsApp, Telegram и Instagram внутри UmaiCRM',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Ведите переписки WhatsApp, Telegram и Instagram внутри UmaiCRM',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Омниканальный месенджер для переписки WhatsApp, Telegram и Instagram, а также рассылок и чат-ботов',
  },
  {
    id: 'sip',
    name: 'SIP интеграция',
    description: 'Анализ разговоров, контроль пропущенных звонков, лидогенерация через SIP телефонию',
  },
  {
    id: 'qosymsha',
    name: 'Qosymsha',
    description: 'Быстрый перенос данных - создание групп, учеников, учителей и расписания. Доступ к табелям посещаемости для контроля и уведомлений',
  },
  {
    id: 'alfa-crm',
    name: 'Alfa CRM',
    description: 'Поэтапный импорт данных из Alfa CRM - ученики, учителя, занятия, расписание, финансы. Поможем плавно перейти с Alfa в Umai',
  },
  {
    id: 'ai-analysis',
    name: 'ИИ-анализ',
    description: 'ИИ-анализ диалогов: подсвечивает проблемные переписки и настроение клиентов',
  },
];
