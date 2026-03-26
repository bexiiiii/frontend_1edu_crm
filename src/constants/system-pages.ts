export type SystemPageTone = 'accent' | 'warning' | 'danger' | 'neutral';

export type SystemPageIcon =
  | 'alert'
  | 'shield'
  | 'lock'
  | 'clock'
  | 'gauge'
  | 'server'
  | 'cloud-off'
  | 'wrench'
  | 'construction'
  | 'loader';

export type SystemPageAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

export type SystemPageConfig = {
  slug: string;
  code?: string;
  badge: string;
  title: string;
  description: string;
  note?: string;
  icon: SystemPageIcon;
  tone: SystemPageTone;
  spinIcon?: boolean;
  category: 'error' | 'status';
  actions?: SystemPageAction[];
};

const commonActions: SystemPageAction[] = [
  { label: 'На главную', href: '/', variant: 'primary' },
  { label: 'Все системные страницы', href: '/system', variant: 'secondary' },
];

export const SYSTEM_PAGE_ITEMS: SystemPageConfig[] = [
  {
    slug: '400',
    code: '400',
    badge: 'Ошибка 400',
    title: 'Неверный запрос',
    description: 'Запрос сформирован некорректно. Проверьте параметры и повторите действие.',
    icon: 'alert',
    tone: 'warning',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '401',
    code: '401',
    badge: 'Ошибка 401',
    title: 'Требуется авторизация',
    description: 'Доступ к этому ресурсу возможен только после входа в систему.',
    icon: 'lock',
    tone: 'warning',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '403',
    code: '403',
    badge: 'Ошибка 403',
    title: 'Доступ запрещен',
    description: 'У вашей роли недостаточно прав для выполнения этого действия.',
    icon: 'shield',
    tone: 'danger',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '404',
    code: '404',
    badge: 'Ошибка 404',
    title: 'Страница не найдена',
    description: 'Запрошенный раздел отсутствует или был перемещен.',
    icon: 'alert',
    tone: 'warning',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '408',
    code: '408',
    badge: 'Ошибка 408',
    title: 'Время ожидания истекло',
    description: 'Сервер не получил запрос вовремя. Проверьте сеть и попробуйте снова.',
    icon: 'clock',
    tone: 'warning',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '429',
    code: '429',
    badge: 'Ошибка 429',
    title: 'Слишком много запросов',
    description: 'Лимит обращений превышен. Подождите немного и повторите попытку.',
    icon: 'gauge',
    tone: 'warning',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '500',
    code: '500',
    badge: 'Ошибка 500',
    title: 'Внутренняя ошибка сервера',
    description: 'Произошла непредвиденная ошибка. Мы уже получили сигнал и работаем над исправлением.',
    icon: 'server',
    tone: 'danger',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '502',
    code: '502',
    badge: 'Ошибка 502',
    title: 'Плохой ответ шлюза',
    description: 'Промежуточный сервер получил некорректный ответ от вышестоящего сервиса.',
    icon: 'server',
    tone: 'danger',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: '503',
    code: '503',
    badge: 'Ошибка 503',
    title: 'Сервис временно недоступен',
    description: 'Сервис недоступен из-за перегрузки или технических работ.',
    icon: 'cloud-off',
    tone: 'danger',
    category: 'error',
    actions: commonActions,
  },
  {
    slug: 'under-development',
    badge: 'Скоро',
    title: 'Страница в разработке',
    description: 'Этот раздел находится в активной разработке и скоро будет доступен.',
    note: 'Вы можете продолжить работу в других разделах CRM.',
    icon: 'construction',
    tone: 'accent',
    category: 'status',
    actions: commonActions,
  },
  {
    slug: 'high-load',
    badge: 'Высокая нагрузка',
    title: 'Система работает под повышенной нагрузкой',
    description: 'Возможны замедления. Ограничьте массовые операции и повторите действие через несколько минут.',
    note: 'Для критичных операций дождитесь стабилизации.',
    icon: 'gauge',
    tone: 'warning',
    category: 'status',
    actions: commonActions,
  },
  {
    slug: 'maintenance',
    badge: 'Техобслуживание',
    title: 'Проводятся технические работы',
    description: 'Мы обновляем систему. Часть функций может быть временно недоступна.',
    note: 'После завершения работ все данные и настройки будут сохранены.',
    icon: 'wrench',
    tone: 'warning',
    category: 'status',
    actions: commonActions,
  },
  {
    slug: 'service-unavailable',
    badge: 'Недоступность сервиса',
    title: 'Сервис недоступен',
    description: 'Подключение к ключевым сервисам временно отсутствует. Попробуйте обновить страницу позже.',
    icon: 'cloud-off',
    tone: 'danger',
    category: 'status',
    actions: commonActions,
  },
  {
    slug: 'loading',
    badge: 'Загрузка',
    title: 'Подготавливаем данные',
    description: 'Страница загружается. Это может занять несколько секунд.',
    icon: 'loader',
    tone: 'neutral',
    spinIcon: true,
    category: 'status',
    actions: commonActions,
  },
];

export const SYSTEM_PAGES_BY_SLUG: Record<string, SystemPageConfig> = Object.fromEntries(
  SYSTEM_PAGE_ITEMS.map((item) => [item.slug, item]),
);

export const SYSTEM_ERROR_ITEMS = SYSTEM_PAGE_ITEMS.filter((item) => item.category === 'error');
export const SYSTEM_STATUS_ITEMS = SYSTEM_PAGE_ITEMS.filter((item) => item.category === 'status');
