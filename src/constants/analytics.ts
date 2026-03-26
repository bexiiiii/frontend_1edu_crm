export type AnalyticsReport = {
  slug: string;
  label: string;
  description: string;
};

export const ANALYTICS_REPORTS: AnalyticsReport[] = [
  {
    slug: 'executive-dashboard',
    label: 'Дашборд руководителя',
    description: 'Ключевые показатели центра: выручка, продажи, загрузка и удержание.',
  },
  {
    slug: 'finance-report',
    label: 'Финансовый отчет',
    description: 'Свод доходов, расходов и динамики финансов за выбранный период.',
  },
  {
    slug: 'subscriptions',
    label: 'Абонементы',
    description: 'Активные, истекающие и просроченные абонементы по курсам.',
  },
  {
    slug: 'sales-funnel',
    label: 'Воронка продаж',
    description: 'Переход лидов по этапам воронки и точки потерь.',
  },
  {
    slug: 'lead-conversions',
    label: 'Конверсии лидов',
    description: 'Конверсия лидов в заявки, пробные и оплаты.',
  },
  {
    slug: 'managers',
    label: 'Менеджеры',
    description: 'Эффективность менеджеров по обработке и закрытию лидов.',
  },
  {
    slug: 'teachers',
    label: 'Преподаватели',
    description: 'Нагрузка, посещаемость и результативность преподавателей.',
  },
  {
    slug: 'retention',
    label: 'Удержание',
    description: 'Коэффициент возврата и оттока учеников по периодам.',
  },
  {
    slug: 'group-load',
    label: 'Загрузка групп',
    description: 'Заполняемость групп относительно лимитов и расписания.',
  },
  {
    slug: 'room-load',
    label: 'Загрузка аудиторий',
    description: 'Использование кабинетов по дням и временным слотам.',
  },
  {
    slug: 'group-attendance',
    label: 'Посещаемость групп',
    description: 'Посещаемость групп с детализацией по занятиям и ученикам.',
  },
  {
    slug: 'payment-reconciliation',
    label: 'Сверка платежей',
    description: 'Сопоставление платежей, начислений и задолженностей.',
  },
  {
    slug: 'ai-dialog-analysis',
    label: 'ИИ анализ диалогов',
    description: 'Анализ качества коммуникаций менеджеров с клиентами.',
  },
];

export const ANALYTICS_SUBMENU_ITEMS = ANALYTICS_REPORTS.map((report) => ({
  label: report.label,
  href: `/analytics/${report.slug}`,
}));

export const getAnalyticsReportBySlug = (slug: string) =>
  ANALYTICS_REPORTS.find((report) => report.slug === slug) ?? null;
