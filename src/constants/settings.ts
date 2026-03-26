import { Subscription, Tariff } from '@/types/settings';

export const SETTINGS_TABS = [
  { value: 'user', label: 'Пользователь' },
  { value: 'company', label: 'Настройки компании' },
  { value: 'access', label: 'Доступы' },
  { value: 'roles', label: 'Роли' },
  { value: 'rooms', label: 'Помещения' },
  { value: 'statuses', label: 'Статусы' },
  { value: 'finance', label: 'Финансы' },
  { value: 'integrations', label: 'Интеграции' },
] as const;

export const SUBSCRIPTION_DATA: Subscription = {
  clientNumber: '247',
  validUntil: null,
  currentPlan: 'Тестовый период (как «Расширенный»)',
};

export const PAYMENT_PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: '6months', label: '6 месяцев' },
  { value: 'year', label: 'Год' },
] as const;

export const TARIFFS: Tariff[] = [
  {
    id: 'basic',
    name: 'Базовый',
    description: 'Управление центром',
    price: 100000,
    discount: 58,
    features: [
      'Ученики и группы — без ограничений',
      'Поддержка по email',
    ],
  },
  {
    id: 'extended',
    name: 'Расширенный',
    description: 'Управление центром и контроль продаж',
    price: 200000,
    discount: 44,
    isPopular: true,
    features: [
      'Канбан лидов и клиентов',
      'Автоматизация на события',
      'Расширенная аналитика',
    ],
  },
];

export const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'kk', label: 'Қазақша' },
  { value: 'en', label: 'English' },
];

export const CURRENCIES = [
  { value: 'KZT', label: '₸ Тенге' },
  { value: 'UZS', label: "so'm Сум" },
  { value: 'USD', label: '$ Доллар' },
  { value: 'EUR', label: '€ Евро' },
  { value: 'RUB', label: '₽ Рубль' },
];

export const TIMEZONES = [
  { value: 'Asia/Tashkent', label: 'GMT+5 Ташкент' },
  { value: 'Asia/Almaty', label: 'GMT+6 Алматы' },
  { value: 'Asia/Aqtobe', label: 'GMT+5 Актобе' },
  { value: 'Asia/Astana', label: 'GMT+6 Астана' },
];
