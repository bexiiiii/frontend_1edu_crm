import type { DayOfWeek, ScheduleDayTime } from '@/lib/api';
import { ScheduleEvent } from '@/types/schedule';

export const SCHEDULE_DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Пн',
  TUESDAY: 'Вт',
  WEDNESDAY: 'Ср',
  THURSDAY: 'Чт',
  FRIDAY: 'Пт',
  SATURDAY: 'Сб',
  SUNDAY: 'Вс',
};

export function formatScheduleDays(daysOfWeek: DayOfWeek[]): string {
  if (daysOfWeek.length === 0) {
    return 'По дате начала';
  }

  return daysOfWeek.map((day) => SCHEDULE_DAY_LABELS[day] || day).join(', ');
}

export function formatScheduleTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

export const SCHEDULE_DAY_ORDER: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

interface ScheduleTimeSource {
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  dayTimes?: ScheduleDayTime[] | null;
}

/** Время каждого дня расписания (Пн..Вс); без dayTimes в ответе — общее время для всех дней. */
export function resolveScheduleDayTimes(schedule: ScheduleTimeSource): ScheduleDayTime[] {
  const byDay = new Map((schedule.dayTimes ?? []).map((item) => [item.day, item]));
  return SCHEDULE_DAY_ORDER
    .filter((day) => schedule.daysOfWeek.includes(day))
    .map((day) => ({
      day,
      startTime: byDay.get(day)?.startTime ?? schedule.startTime,
      endTime: byDay.get(day)?.endTime ?? schedule.endTime,
    }));
}

export function hasDifferentDayTimes(schedule: ScheduleTimeSource): boolean {
  const keys = new Set(
    resolveScheduleDayTimes(schedule).map((item) => `${item.startTime.slice(0, 5)}-${item.endTime.slice(0, 5)}`)
  );
  return keys.size > 1;
}

/** «14:00 - 15:30», а при разном времени по дням — «Пн 14:00–15:30, Чт 16:00–17:30». */
export function formatScheduleTime(schedule: ScheduleTimeSource): string {
  if (!hasDifferentDayTimes(schedule)) {
    const first = resolveScheduleDayTimes(schedule)[0];
    return formatScheduleTimeRange(first?.startTime ?? schedule.startTime, first?.endTime ?? schedule.endTime);
  }

  return resolveScheduleDayTimes(schedule)
    .map((item) => `${SCHEDULE_DAY_LABELS[item.day]} ${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}`)
    .join(', ');
}

export function formatSchedulePeriod(startDate: string, endDate: string | null): string {
  const formatDate = (value: string | null): string => {
    if (!value) {
      return '—';
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
  };

  return `${formatDate(startDate)} - ${endDate ? formatDate(endDate) : 'без даты окончания'}`;
}

export const createScheduleEvent = (
  id: string,
  title: string,
  start: string,
  end: string,
  teacher: string,
  room: string,
  students: number,
  color: string
): ScheduleEvent => {
  return {
    id,
    title,
    start,
    end,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      teacher,
      room,
      students,
    },
  };
};

export const filterEventsByTeacher = (events: ScheduleEvent[], teacherId: string) => {
  if (!teacherId) return events;
  return events.filter(event => event.extendedProps.teacher === teacherId);
};

export const filterEventsByRoom = (events: ScheduleEvent[], roomId: string) => {
  if (!roomId) return events;
  return events.filter(event => event.extendedProps.room === roomId);
};
