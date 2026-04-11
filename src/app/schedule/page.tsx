'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ruLocale from '@fullcalendar/core/locales/ru';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Button } from '@/components/ui/Button';
import { AddScheduleModal } from '@/components/features/schedule/AddScheduleModal';
import { EventDetailModal } from '@/components/features/schedule/EventDetailModal';
import { ScheduleFilters } from '@/components/features/schedule/ScheduleFilters';
import {
  coursesService,
  roomsService,
  schedulesService,
  staffService,
  type CreateScheduleRequest,
  type DayOfWeek,
  type UpdateScheduleRequest,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { ScheduleCalendarItem, ScheduleFormValues } from '@/types/schedule';

const EVENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#467aff'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Пн',
  TUESDAY: 'Вт',
  WEDNESDAY: 'Ср',
  THURSDAY: 'Чт',
  FRIDAY: 'Пт',
  SATURDAY: 'Сб',
  SUNDAY: 'Вс',
};

const DAY_INDEXES: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const JS_DAY_TO_API_DAY: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function formatLocalDate(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function addOneDay(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + 1, 12, 0, 0);
  return formatLocalDate(date);
}

function hasOccurrenceInRange(startDate: string, endDate: string | null, daysOfWeek: DayOfWeek[]): boolean {
  if (daysOfWeek.length === 0) {
    return true;
  }

  if (!endDate) {
    return true;
  }

  const targetDays = new Set<DayOfWeek>(daysOfWeek);
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const jsDayToApiDay: Record<number, DayOfWeek> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };

  while (cursor <= end) {
    if (targetDays.has(jsDayToApiDay[cursor.getDay()])) {
      return true;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

function toInputTime(time: string): string {
  return time.slice(0, 5);
}

function toFormValues(schedule: ScheduleCalendarItem): ScheduleFormValues {
  return {
    name: schedule.name,
    courseId: schedule.courseId || '',
    roomId: schedule.roomId || '',
    daysOfWeek: schedule.daysOfWeek,
    startTime: toInputTime(schedule.startTime),
    endTime: toInputTime(schedule.endTime),
    startDate: schedule.startDate,
    endDate: schedule.endDate || '',
  };
}

function buildSelectionDefaults(selection: DateSelectArg): ScheduleFormValues {
  const startTime = selection.allDay ? '09:00' : formatLocalTime(selection.start);
  const endTime = selection.allDay ? '10:30' : formatLocalTime(selection.end);

  return {
    name: '',
    courseId: '',
    roomId: '',
    daysOfWeek: [JS_DAY_TO_API_DAY[selection.start.getDay()]],
    startTime,
    endTime,
    startDate: formatLocalDate(selection.start),
    endDate: '',
  };
}

export default function Schedule() {
  const [teacherFilter, setTeacherFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleCalendarItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [scheduleModalState, setScheduleModalState] = useState<{
    key: number;
    isOpen: boolean;
    scheduleId: string | null;
    initialValues?: ScheduleFormValues;
  }>({
    key: 0,
    isOpen: false,
    scheduleId: null,
  });

  const {
    data: schedulesData,
    loading: schedulesLoading,
    error: schedulesError,
    refetch,
  } = useApi(
    () =>
      schedulesService.getAll({
        page: 0,
        size: 1000,
      }),
    []
  );
  const { data: coursesData, loading: coursesLoading } = useApi(
    () => coursesService.getAll({ page: 0, size: 500 }),
    []
  );
  const { data: teachersData, loading: teachersLoading } = useApi(
    () => staffService.getTeachers({ page: 0, size: 300 }),
    []
  );
  const { data: roomsData, loading: roomsLoading } = useApi(
    () => roomsService.getAll({ page: 0, size: 300 }),
    []
  );

  const createMutation = useMutation((data: CreateScheduleRequest) => schedulesService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateScheduleRequest }) =>
    schedulesService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => schedulesService.delete(id));

  const isLoading = schedulesLoading || coursesLoading || teachersLoading || roomsLoading;
  const isSaving = createMutation.loading || updateMutation.loading;

  const courseMap = useMemo(
    () => new Map((coursesData?.content ?? []).map((course) => [course.id, course])),
    [coursesData]
  );
  const teacherMap = useMemo(
    () => new Map((teachersData?.content ?? []).map((teacher) => [teacher.id, teacher.fullName])),
    [teachersData]
  );
  const roomMap = useMemo(
    () => new Map((roomsData?.content ?? []).map((room) => [room.id, room.name])),
    [roomsData]
  );

  const filteredSchedules = useMemo(() => {
    const list = schedulesData?.content ?? [];
    return list.filter((schedule) => {
      if (teacherFilter && schedule.teacherId !== teacherFilter) {
        return false;
      }

      if (courseFilter && schedule.courseId !== courseFilter) {
        return false;
      }

      if (roomFilter && schedule.roomId !== roomFilter) {
        return false;
      }

      if (statusFilter && schedule.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [courseFilter, roomFilter, schedulesData, statusFilter, teacherFilter]);

  const scheduleItems = useMemo<ScheduleCalendarItem[]>(
    () =>
      filteredSchedules.map((schedule, index) => {
        const course = schedule.courseId ? courseMap.get(schedule.courseId) : undefined;
        return {
          id: schedule.id,
          name: schedule.name,
          courseId: schedule.courseId,
          courseName: course?.name || '—',
          teacherId: schedule.teacherId,
          teacherName: schedule.teacherId ? teacherMap.get(schedule.teacherId) || '—' : '—',
          roomId: schedule.roomId,
          roomName: schedule.roomId ? roomMap.get(schedule.roomId) || '—' : '—',
          daysOfWeek: schedule.daysOfWeek,
          daysLabel:
            schedule.daysOfWeek.length > 0
              ? schedule.daysOfWeek.map((day) => DAY_LABELS[day]).join(', ')
              : 'По дате начала',
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          maxStudents: schedule.maxStudents,
          status: schedule.status,
          color: course?.color || EVENT_COLORS[index % EVENT_COLORS.length],
        };
      }),
    [courseMap, filteredSchedules, roomMap, teacherMap]
  );

  const scheduleItemMap = useMemo(
    () => new Map(scheduleItems.map((schedule) => [schedule.id, schedule])),
    [scheduleItems]
  );

  const events = useMemo(
    () =>
      scheduleItems.map((schedule) => {
        const baseEvent = {
          id: schedule.id,
          title: schedule.name,
          backgroundColor: schedule.color,
          borderColor: schedule.color,
        };

        if (schedule.daysOfWeek.length === 0) {
          return {
            ...baseEvent,
            start: `${schedule.startDate}T${schedule.startTime}`,
            end: `${schedule.startDate}T${schedule.endTime}`,
          };
        }

        if (hasOccurrenceInRange(schedule.startDate, schedule.endDate, schedule.daysOfWeek)) {
          return {
            ...baseEvent,
            daysOfWeek: schedule.daysOfWeek.map((day) => DAY_INDEXES[day]),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            startRecur: schedule.startDate,
            endRecur: schedule.endDate ? addOneDay(schedule.endDate) : undefined,
          };
        }

        return {
          ...baseEvent,
          start: `${schedule.startDate}T${schedule.startTime}`,
          end: `${schedule.startDate}T${schedule.endTime}`,
        };
      }),
    [scheduleItems]
  );

  const courseOptions = useMemo(
    () =>
      (coursesData?.content ?? []).map((course) => ({
        id: course.id,
        name: course.name,
        teacherId: course.teacherId,
        enrollmentLimit: course.enrollmentLimit,
      })),
    [coursesData]
  );
  const teacherOptions = useMemo(
    () => (teachersData?.content ?? []).map((teacher) => ({ id: teacher.id, name: teacher.fullName })),
    [teachersData]
  );
  const roomOptions = useMemo(
    () =>
      (roomsData?.content ?? []).map((room) => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
      })),
    [roomsData]
  );

  const closeScheduleModal = () => {
    setScheduleModalState((prev) => ({
      ...prev,
      isOpen: false,
      scheduleId: null,
      initialValues: undefined,
    }));
  };

  const openCreateModal = (initialValues?: ScheduleFormValues) => {
    setScheduleModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      scheduleId: null,
      initialValues,
    }));
  };

  const handleEventClick = (info: EventClickArg) => {
    const schedule = scheduleItemMap.get(info.event.id);
    if (!schedule) {
      return;
    }

    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  const handleEdit = () => {
    if (!selectedSchedule) {
      return;
    }

    setIsDetailModalOpen(false);
    setScheduleModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      scheduleId: selectedSchedule.id,
      initialValues: toFormValues(selectedSchedule),
    }));
  };

  const handleSave = async (data: CreateScheduleRequest) => {
    if (scheduleModalState.scheduleId) {
      await updateMutation.mutate({
        id: scheduleModalState.scheduleId,
        data,
      });
    } else {
      await createMutation.mutate(data);
    }

    closeScheduleModal();
    await refetch();
  };

  const handleDelete = async () => {
    if (!selectedSchedule || !confirm('Удалить расписание?')) {
      return;
    }

    await deleteMutation.mutate(selectedSchedule.id);
    setIsDetailModalOpen(false);
    setSelectedSchedule(null);
    await refetch();
  };

  const handleDateSelect = (selection: DateSelectArg) => {
    openCreateModal(buildSelectionDefaults(selection));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <ScheduleFilters
            teacherId={teacherFilter}
            roomId={roomFilter}
            courseId={courseFilter}
            status={statusFilter}
            teachers={teacherOptions}
            rooms={roomOptions}
            courses={courseOptions}
            onTeacherChange={setTeacherFilter}
            onRoomChange={setRoomFilter}
            onCourseChange={setCourseFilter}
            onStatusChange={setStatusFilter}
          />
          <Button icon={Plus} onClick={() => openCreateModal()}>
            Добавить занятие
          </Button>
        </div>
      </div>

      <div className="crm-surface p-6">
        {schedulesError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {schedulesError}
          </div>
        )}

        

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ruLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{
              today: 'Сегодня',
              month: 'Месяц',
              week: 'Неделя',
              day: 'День',
            }}
            events={events}
            editable={false}
            selectable
            selectMirror
            dayMaxEvents
            weekends
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            height="auto"
            allDaySlot={false}
            slotDuration="01:00:00"
            eventClick={handleEventClick}
            select={handleDateSelect}
          />
        )}
      </div>

      <AddScheduleModal
        key={scheduleModalState.key}
        isOpen={scheduleModalState.isOpen}
        onClose={closeScheduleModal}
        onSave={handleSave}
        courses={courseOptions}
        teachers={teacherOptions}
        rooms={roomOptions}
        initialValues={scheduleModalState.initialValues}
        isSubmitting={isSaving}
        title={scheduleModalState.scheduleId ? 'Редактировать расписание' : 'Добавить расписание'}
      />

      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        schedule={selectedSchedule}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.loading}
      />
    </div>
  );
}
