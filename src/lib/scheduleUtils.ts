import { ScheduleEvent } from '@/types/schedule';

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
