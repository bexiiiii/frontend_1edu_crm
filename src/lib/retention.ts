import { RetentionDataset, RetentionHorizon } from '@/constants/retention';

type Rgb = { r: number; g: number; b: number };

export type RetentionTableRow = {
  monthKey: string;
  cohortLabel: string;
  size: number;
  values: number[];
};

const RU_SHORT_MONTHS = [
  'янв.',
  'февр.',
  'март',
  'апр.',
  'май',
  'июнь',
  'июль',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
];

const MIN_COLOR: Rgb = { r: 242, g: 186, b: 186 };
const MID_COLOR: Rgb = { r: 245, g: 233, b: 176 };
const MAX_COLOR: Rgb = { r: 185, g: 229, b: 189 };

const pad2 = (value: number) => value.toString().padStart(2, '0');

const parseDate = (dateValue: string): Date => {
  const [rawYear, rawMonth, rawDay] = dateValue.split('-').map(Number);
  if (!rawYear || !rawMonth || !rawDay) {
    return new Date(1970, 0, 1);
  }

  const parsed = new Date(rawYear, rawMonth - 1, rawDay);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(1970, 0, 1);
  }

  return parsed;
};

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const toMonthKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const clampPercent = (value: number): number => {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

const lerp = (from: number, to: number, t: number): number => Math.round(from + (to - from) * t);

const interpolateColor = (from: Rgb, to: Rgb, t: number): Rgb => ({
  r: lerp(from.r, to.r, t),
  g: lerp(from.g, to.g, t),
  b: lerp(from.b, to.b, t),
});

export const normalizeDateRange = (
  fromDateValue: string,
  toDateValue: string,
): { from: string; to: string; fromDate: Date; toDate: Date } => {
  const parsedFrom = parseDate(fromDateValue);
  const parsedTo = parseDate(toDateValue);

  if (parsedFrom.getTime() <= parsedTo.getTime()) {
    return {
      from: toIsoDate(parsedFrom),
      to: toIsoDate(parsedTo),
      fromDate: parsedFrom,
      toDate: parsedTo,
    };
  }

  return {
    from: toIsoDate(parsedTo),
    to: toIsoDate(parsedFrom),
    fromDate: parsedTo,
    toDate: parsedFrom,
  };
};

export const formatDateDdMmYyyy = (dateValue: string): string => {
  const date = parseDate(dateValue);
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const getMonthKeysInRange = (fromDate: Date, toDate: Date): string[] => {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

  const monthKeys: string[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    monthKeys.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return monthKeys;
};

export const formatCohortMonthLabel = (monthKey: string): string => {
  const [rawYear, rawMonth] = monthKey.split('-').map(Number);
  const monthIndex = Math.max(0, Math.min(11, (rawMonth || 1) - 1));
  return `${rawYear} ${RU_SHORT_MONTHS[monthIndex]}`;
};

export const buildRetentionRows = (
  monthKeys: string[],
  dataset: RetentionDataset,
  horizon: RetentionHorizon,
): RetentionTableRow[] => {
  return monthKeys.map((monthKey) => {
    const source = dataset[monthKey] ?? {
      size: 0,
      values: Array.from({ length: 12 }, () => 0),
    };

    return {
      monthKey,
      cohortLabel: formatCohortMonthLabel(monthKey),
      size: source.size,
      values: Array.from({ length: horizon }, (_, index) => clampPercent(source.values[index] ?? 0)),
    };
  });
};

export const getRetentionHeatColor = (percent: number): string => {
  const safePercent = clampPercent(percent);

  let color: Rgb;
  if (safePercent <= 50) {
    color = interpolateColor(MIN_COLOR, MID_COLOR, safePercent / 50);
  } else {
    color = interpolateColor(MID_COLOR, MAX_COLOR, (safePercent - 50) / 50);
  }

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
};
