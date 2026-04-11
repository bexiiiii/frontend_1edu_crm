import type { DayOfWeek, ScheduleStatus } from '@/lib/api';

export interface ScheduleCalendarItem {
  id: string;
  name: string;
  courseId: string | null;
  courseName: string;
  teacherId: string | null;
  teacherName: string;
  roomId: string | null;
  roomName: string;
  daysOfWeek: DayOfWeek[];
  daysLabel: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  maxStudents: number | null;
  status: ScheduleStatus;
  color: string;
}

export interface ClassSession {
  id: string;
  name: string;
  teacher: string;
  room: string;
  type: 'group' | 'individual' | 'masterclass';
  format: 'online' | 'offline' | 'hybrid';
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
}

export type WeekDay = 'Пн' | 'Вт' | 'Ср' | 'Чт' | 'Пт' | 'Сб' | 'Вс';

export interface CustomScheduleTime {
  day: WeekDay;
  startTime: string;
  endTime: string;
}

export interface ScheduleFormData {
  classId: string;
  teacherId: string;
  days: WeekDay[];
  customSchedule: boolean;
  timeFrom?: string;
  timeTo?: string;
  customTimes?: CustomScheduleTime[];
  roomId: string;
  periodStart: string;
  periodEnd: string;
}

export interface ScheduleFormValues {
  name: string;
  courseId: string;
  roomId: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
}
