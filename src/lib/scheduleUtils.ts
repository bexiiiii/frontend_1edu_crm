import type { DayOfWeek } from '@/lib/api';
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
