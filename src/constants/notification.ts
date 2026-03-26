import { NotificationHistory } from '@/types/notification';

export const NOTIFICATION_TYPES = [
  { value: 'one-time', label: 'Разовая рассылка' },
  { value: 'birthday', label: 'Поздравление с ДР' },
  { value: 'payment-reminder', label: 'Напоминание об оплате' },
  { value: 'no-subscription', label: 'Отсутствие абонемента' },
] as const;

export const NOTIFICATION_PROVIDERS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
] as const;

export const RECIPIENT_TYPES = [
  { value: 'all', label: 'Все клиенты' },
  { value: 'active-only', label: 'Только активные' },
] as const;

export const PAYMENT_REMINDER_TIMINGS = [
  { value: 'day-before', label: 'За день до события' },
  { value: 'same-day', label: 'В день события' },
  { value: 'after', label: 'После события' },
  { value: 'week-before', label: 'За неделю до события' },
] as const;

export const DEFAULT_TEMPLATES = {
  'one-time': `Здравствуйте! 👋

У нас отличные новости для вас: на этой неделе действует специальная акция для учеников нашего центра! ✨

— Скидка 20% на первый абонемент при записи до пятницы;
— Бесплатное пробное занятие для друзей;
— Подарки самым активным участникам.

Если у вас есть вопросы — просто ответьте на это сообщение. Ждём вас на занятиях! 💙`,
  
  'birthday': `🎉 С Днём рождения, {name}! Желаем ярких впечатлений, верных друзей, успехов в учёбе и море радостных моментов каждый день! 🎂`,
  
  'payment-reminder': `Уважаемый клиент! Уведомляем вас о скором окончании абонемента в наш центр. Просим произвести оплату во время следующего посещения. С уважением, администрация {center_name}`,
  
  'no-subscription': `Уважаемый {name}! Уведомляем вас о скором окончании абонемента в наш центр. Просим произвести оплату во время следующего посещения. С уважением, администрация {center_name}`,
};

export const AVAILABLE_VARIABLES: Record<string, string[]> = {
  'one-time': [],
  'birthday': ['{name}'],
  'payment-reminder': ['{center_name}'],
  'no-subscription': ['{name}', '{center_name}'],
};

export const MOCK_NOTIFICATION_HISTORY: NotificationHistory[] = [
  {
    id: '1',
    type: 'one-time',
    provider: 'whatsapp',
    recipients: 125,
    sentAt: '2026-01-03T10:00:00',
    status: 'sent',
    message: 'Акция на новогодние курсы',
  },
  {
    id: '2',
    type: 'birthday',
    provider: 'whatsapp',
    recipients: 5,
    sentAt: '2026-01-02T10:00:00',
    status: 'sent',
    message: 'Поздравление с Днём Рождения',
  },
  {
    id: '3',
    type: 'payment-reminder',
    provider: 'whatsapp',
    recipients: 15,
    sentAt: '2026-01-01T10:00:00',
    status: 'sent',
    message: 'Напоминание об оплате абонемента',
  },
];
