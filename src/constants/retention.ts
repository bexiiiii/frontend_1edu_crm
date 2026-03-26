import {
  getAnalyticsPeriodPresets,
  type AnalyticsPeriodPreset,
} from '@/lib/analytics-periods';

export type CohortBasis = 'first_payment' | 'first_visit';

export type RetentionHorizon = 3 | 6 | 12;

export type RetentionPeriodPreset = AnalyticsPeriodPreset;

export type RetentionCohortData = {
  size: number;
  values: number[];
};

export type RetentionDataset = Record<string, RetentionCohortData>;

export const RETENTION_BASIS_OPTIONS: { id: CohortBasis; label: string }[] = [
  { id: 'first_payment', label: 'Первая оплата' },
  { id: 'first_visit', label: 'Первый визит' },
];

export const RETENTION_HORIZON_OPTIONS: RetentionHorizon[] = [3, 6, 12];

export const RETENTION_PERIOD_PRESETS: Record<RetentionPeriodPreset, { from: string; to: string; label: string }> =
  getAnalyticsPeriodPresets();

export const RETENTION_DEFAULT_RANGE = {
  from: RETENTION_PERIOD_PRESETS.month.from,
  to: RETENTION_PERIOD_PRESETS.month.to,
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

const buildZeroYearDataset = (year: number): RetentionDataset => {
  const dataset: RetentionDataset = {};

  for (let month = 1; month <= 12; month += 1) {
    dataset[`${year}-${pad2(month)}`] = {
      size: 0,
      values: Array.from({ length: 12 }, () => 0),
    };
  }

  return dataset;
};

const buildFirstPaymentDataset = (): RetentionDataset => {
  const dataset = buildZeroYearDataset(2026);
  dataset['2026-02'] = {
    size: 10,
    values: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  return dataset;
};

const buildFirstVisitDataset = (): RetentionDataset => {
  const dataset = buildZeroYearDataset(2026);
  dataset['2026-02'] = {
    size: 8,
    values: [88, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  return dataset;
};

export const RETENTION_DATASETS: Record<CohortBasis, RetentionDataset> = {
  first_payment: buildFirstPaymentDataset(),
  first_visit: buildFirstVisitDataset(),
};
