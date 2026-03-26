export type AnalyticsPeriodPreset = 'week' | 'month' | 'previousMonth' | 'quarter' | 'year';

export interface AnalyticsPeriodRange {
  from: string;
  to: string;
}

export interface AnalyticsPeriodOption {
  id: AnalyticsPeriodPreset;
  label: string;
}

const PERIOD_ORDER: AnalyticsPeriodPreset[] = ['week', 'month', 'previousMonth', 'quarter', 'year'];

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getStartOfQuarter(date: Date): Date {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function getStartOfWeek(date: Date): Date {
  const normalized = atStartOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  normalized.setDate(normalized.getDate() + diff);
  return normalized;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, date.getDate());
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMonthLabel(date: Date): string {
  return capitalize(monthFormatter.format(date));
}

export function getAnalyticsPeriodPresets(now = new Date()): Record<AnalyticsPeriodPreset, AnalyticsPeriodRange & { label: string }> {
  const today = atStartOfDay(now);
  const currentMonthStart = getStartOfMonth(today);
  const previousMonthDate = addMonths(today, -1);
  const previousMonthStart = getStartOfMonth(previousMonthDate);
  const previousMonthEnd = getEndOfMonth(previousMonthDate);

  return {
    week: {
      label: 'Неделя',
      from: toIsoDate(getStartOfWeek(today)),
      to: toIsoDate(today),
    },
    month: {
      label: getMonthLabel(today),
      from: toIsoDate(currentMonthStart),
      to: toIsoDate(today),
    },
    previousMonth: {
      label: getMonthLabel(previousMonthDate),
      from: toIsoDate(previousMonthStart),
      to: toIsoDate(previousMonthEnd),
    },
    quarter: {
      label: 'Квартал',
      from: toIsoDate(getStartOfQuarter(today)),
      to: toIsoDate(today),
    },
    year: {
      label: 'Год',
      from: toIsoDate(getStartOfYear(today)),
      to: toIsoDate(today),
    },
  };
}

export function getAnalyticsPeriodOptions(now = new Date()): AnalyticsPeriodOption[] {
  const presets = getAnalyticsPeriodPresets(now);

  return PERIOD_ORDER.map((id) => ({
    id,
    label: presets[id].label,
  }));
}

export function getCurrentMonthAnalyticsRange(now = new Date()): AnalyticsPeriodRange {
  const monthRange = getAnalyticsPeriodPresets(now).month;
  return {
    from: monthRange.from,
    to: monthRange.to,
  };
}

export function normalizeAnalyticsDateRange(from: string, to: string): AnalyticsPeriodRange {
  if (!from || !to || from <= to) {
    return { from, to };
  }

  return { from: to, to: from };
}
