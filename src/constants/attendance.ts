import type { AttendanceStatus } from '@/lib/api';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PLANNED: 'Не отмечено',
  ATTENDED: 'Посетил',
  ABSENT: 'Пропустил',
  SICK: 'Болел',
  VACATION: 'Отпуск',
  AUTO_ATTENDED: 'Авто',
  ONE_TIME_VISIT: 'Разовый визит',
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  PLANNED: 'border-slate-200 bg-slate-100 text-slate-700',
  ATTENDED: 'border-green-200 bg-green-100 text-green-700',
  ABSENT: 'border-red-200 bg-red-100 text-red-700',
  SICK: 'border-orange-200 bg-orange-100 text-orange-700',
  VACATION: 'border-amber-200 bg-amber-100 text-amber-700',
  AUTO_ATTENDED: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  ONE_TIME_VISIT: 'border-violet-200 bg-violet-100 text-violet-700',
};

export const ATTENDANCE_STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PLANNED', label: ATTENDANCE_STATUS_LABELS.PLANNED },
  { value: 'ATTENDED', label: ATTENDANCE_STATUS_LABELS.ATTENDED },
  { value: 'ABSENT', label: ATTENDANCE_STATUS_LABELS.ABSENT },
  { value: 'SICK', label: ATTENDANCE_STATUS_LABELS.SICK },
  { value: 'VACATION', label: ATTENDANCE_STATUS_LABELS.VACATION },
  { value: 'AUTO_ATTENDED', label: ATTENDANCE_STATUS_LABELS.AUTO_ATTENDED },
  { value: 'ONE_TIME_VISIT', label: ATTENDANCE_STATUS_LABELS.ONE_TIME_VISIT },
];

export function formatTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  return value.slice(0, 5);
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatLongRuDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;

  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortRuDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function isPresentStatus(status: AttendanceStatus): boolean {
  return status === 'ATTENDED' || status === 'AUTO_ATTENDED' || status === 'ONE_TIME_VISIT';
}
