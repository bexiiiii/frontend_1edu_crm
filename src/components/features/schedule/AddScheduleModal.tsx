import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import type { CreateScheduleRequest, DayOfWeek, ScheduleDayTime, ScheduleStatus } from '@/lib/api';
import type { ScheduleFormValues } from '@/types/schedule';

interface SelectOption {
  id: string;
  name: string;
}

interface CourseOption extends SelectOption {
  teacherId: string | null;
  enrollmentLimit: number | null;
}

interface RoomOption extends SelectOption {
  capacity: number | null;
}

export type ScheduleSavePayload = CreateScheduleRequest & {
  /** Только при редактировании: пустая дата окончания = бессрочное расписание. */
  openEnded?: boolean;
  status?: ScheduleStatus;
};

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ScheduleSavePayload) => Promise<void>;
  /** true — режим редактирования существующего расписания. */
  isEdit?: boolean;
  /** Текущий статус редактируемого расписания. */
  currentStatus?: ScheduleStatus;
  courses: CourseOption[];
  teachers: SelectOption[];
  rooms: RoomOption[];
  initialValues?: ScheduleFormValues;
  isSubmitting?: boolean;
  title?: string;
}

const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: 'MONDAY', label: 'Пн' },
  { value: 'TUESDAY', label: 'Вт' },
  { value: 'WEDNESDAY', label: 'Ср' },
  { value: 'THURSDAY', label: 'Чт' },
  { value: 'FRIDAY', label: 'Пт' },
  { value: 'SATURDAY', label: 'Сб' },
  { value: 'SUNDAY', label: 'Вс' },
];

function getTodayDate(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDefaultValues(): ScheduleFormValues {
  return {
    name: '',
    courseId: '',
    roomId: '',
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '10:30',
    startDate: getTodayDate(),
    endDate: '',
  };
}

type DayTimeMap = Partial<Record<DayOfWeek, { startTime: string; endTime: string }>>;

function toDayTimeMap(dayTimes: ScheduleDayTime[] | undefined): DayTimeMap {
  const map: DayTimeMap = {};
  (dayTimes ?? []).forEach((item) => {
    map[item.day] = { startTime: item.startTime.slice(0, 5), endTime: item.endTime.slice(0, 5) };
  });
  return map;
}

function hasDifferentTimes(dayTimes: ScheduleDayTime[] | undefined): boolean {
  const keys = new Set((dayTimes ?? []).map((item) => `${item.startTime.slice(0, 5)}-${item.endTime.slice(0, 5)}`));
  return keys.size > 1;
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function hasOccurrenceInRange(startDate: string, endDate: string | undefined, daysOfWeek: DayOfWeek[]): boolean {
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            code?: string;
            errorCode?: string;
            message?: string;
            error?: string;
            error_description?: string;
          };
        };
      }
    ).response;
    const payload = response?.data;
    const code = payload?.code || payload?.errorCode || payload?.error || '';
    const message = payload?.message || payload?.error_description || '';
    const normalized = `${code} ${message}`.toUpperCase();

    if (normalized.includes('COURSE_BOUND_FIELD_IMMUTABLE')) {
      return 'Преподаватель и лимит группы теперь подставляются из курса автоматически. Измените курс, а не эти поля.';
    }

    if (normalized.includes('SCHEDULE_UPDATE_BLOCKED')) {
      return 'Изменение удалило бы будущие занятия, по которым уже есть отметки посещаемости. Оставьте эти дни в расписании или сначала уберите отметки.';
    }

    if (normalized.includes('ROOM_CAPACITY_EXCEEDED')) {
      return 'Лимит курса превышает вместимость выбранной аудитории. Выберите другую аудиторию или уменьшите лимит на стороне курса.';
    }

    if (message) {
      return message;
    }
  }

  return 'Не удалось сохранить расписание. Попробуйте ещё раз.';
}

export const AddScheduleModal = ({
  isOpen,
  onClose,
  onSave,
  courses,
  teachers,
  rooms,
  initialValues,
  isSubmitting = false,
  title = 'Добавить расписание',
  isEdit = false,
  currentStatus,
}: AddScheduleModalProps) => {
  const defaults = initialValues ?? getDefaultValues();

  const [name, setName] = useState(defaults.name);
  const [courseId, setCourseId] = useState(defaults.courseId);
  const [roomId, setRoomId] = useState(defaults.roomId);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(defaults.daysOfWeek);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);
  // «Разное время по дням»: своё время у каждого выбранного дня.
  const [perDayTimes, setPerDayTimes] = useState(hasDifferentTimes(defaults.dayTimes));
  const [dayTimeMap, setDayTimeMap] = useState<DayTimeMap>(() => toDayTimeMap(defaults.dayTimes));
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const canReopen = isEdit && currentStatus === 'COMPLETED';
  const [reopen, setReopen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const selectedRoom = rooms.find((room) => room.id === roomId) ?? null;
  const selectedTeacher =
    selectedCourse?.teacherId
      ? teachers.find((teacher) => teacher.id === selectedCourse.teacherId)?.name ?? 'Назначен в курсе'
      : 'Не указан в курсе';
  const selectedCourseLimit = selectedCourse?.enrollmentLimit ?? null;
  const selectedRoomCapacity = selectedRoom?.capacity ?? null;
  const isRoomCapacityExceeded =
    selectedCourseLimit != null &&
    selectedRoomCapacity != null &&
    selectedCourseLimit > selectedRoomCapacity;

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  /** Выбранные дни по порядку Пн..Вс с их временем (общим или своим). */
  const selectedDayTimes = DAY_OPTIONS
    .filter((option) => daysOfWeek.includes(option.value))
    .map((option) => {
      const own = dayTimeMap[option.value];
      return {
        day: option.value,
        label: option.label,
        startTime: perDayTimes && own ? own.startTime : startTime,
        endTime: perDayTimes && own ? own.endTime : endTime,
      };
    });
  const canUsePerDayTimes = daysOfWeek.length > 0;
  const isPerDayMode = perDayTimes && canUsePerDayTimes;

  const togglePerDayTimes = (enabled: boolean) => {
    if (enabled) {
      // Дни без своего времени начинают с общего времени.
      setDayTimeMap((prev) => {
        const next: DayTimeMap = { ...prev };
        daysOfWeek.forEach((day) => {
          if (!next[day]) {
            next[day] = { startTime, endTime };
          }
        });
        return next;
      });
    }
    setPerDayTimes(enabled);
  };

  const updateDayTime = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setDayTimeMap((prev) => ({
      ...prev,
      [day]: { startTime, endTime, ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Укажите название расписания.');
      return;
    }

    if (isPerDayMode) {
      if (!startDate || selectedDayTimes.some((item) => !item.startTime || !item.endTime)) {
        setError('Заполните дату начала и время занятий для каждого дня.');
        return;
      }

      const invalidDay = selectedDayTimes.find((item) => item.endTime <= item.startTime);
      if (invalidDay) {
        setError(`${invalidDay.label}: время окончания должно быть позже времени начала.`);
        return;
      }
    } else {
      if (!startDate || !startTime || !endTime) {
        setError('Заполните дату начала и время занятий.');
        return;
      }

      if (endTime <= startTime) {
        setError('Время окончания должно быть позже времени начала.');
        return;
      }
    }

    if (endDate && endDate < startDate) {
      setError('Дата окончания не может быть раньше даты начала.');
      return;
    }

    if (!hasOccurrenceInRange(startDate, endDate || undefined, daysOfWeek)) {
      setError('В выбранном периоде нет ни одного совпадения с отмеченными днями недели.');
      return;
    }

    if (isRoomCapacityExceeded) {
      setError(
        `Лимит курса (${selectedCourseLimit}) превышает вместимость аудитории (${selectedRoomCapacity}). Backend отклонит сохранение с ROOM_CAPACITY_EXCEEDED.`
      );
      return;
    }

    // Время всегда уходит по дням: так снятие «Разное время по дням» тоже сохраняется.
    // startTime/endTime — время первого дня (для старых клиентов API).
    const dayTimes: ScheduleDayTime[] = selectedDayTimes.map((item) => ({
      day: item.day,
      startTime: normalizeTime(item.startTime),
      endTime: normalizeTime(item.endTime),
    }));
    const firstDayTime = dayTimes[0];

    try {
      await onSave({
        name: name.trim(),
        courseId: courseId || undefined,
        roomId: roomId || undefined,
        daysOfWeek: selectedDayTimes.map((item) => item.day),
        startTime: firstDayTime?.startTime ?? normalizeTime(startTime),
        endTime: firstDayTime?.endTime ?? normalizeTime(endTime),
        dayTimes,
        startDate,
        endDate: endDate || undefined,
        ...(isEdit && !endDate ? { openEnded: true } : {}),
        ...(canReopen && reopen ? { status: 'ACTIVE' as ScheduleStatus } : {}),
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <Input
        label="Название расписания"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Например, English A1 — Утро"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Курс"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
        >
          <option value="">Не выбрано</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </Select>
        <Input
          label="Преподаватель"
          value={courseId ? selectedTeacher : ''}
          placeholder="Подтянется из курса"
          disabled
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Дни недели
        </label>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                daysOfWeek.includes(day.value)
                  ? 'bg-[#467aff] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#7f8897]">
          Если дни не выбраны, по новой документации будет создано одно занятие на дату начала.
        </p>
      </div>

      {canUsePerDayTimes && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={perDayTimes}
            onChange={(event) => togglePerDayTimes(event.target.checked)}
          />
          <span>Разное время по дням</span>
        </label>
      )}

      {isPerDayMode && (
        <div className="space-y-3 rounded-xl border border-gray-200 px-4 py-3">
          {selectedDayTimes.map((item) => (
            <div key={item.day} className="grid grid-cols-[3rem_1fr_1fr] items-end gap-3">
              <span className="pb-3 text-sm font-medium text-gray-700">{item.label}</span>
              <Input
                label="Время с"
                type="time"
                value={item.startTime}
                onChange={(event) => updateDayTime(item.day, 'startTime', event.target.value)}
              />
              <Input
                label="Время до"
                type="time"
                value={item.endTime}
                onChange={(event) => updateDayTime(item.day, 'endTime', event.target.value)}
              />
            </div>
          ))}
          {isEdit && (
            <p className="text-xs text-gray-500">
              Прошедшие занятия и занятия с отметками посещаемости не меняются — новое время применится к будущим занятиям.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!isPerDayMode && (
          <>
            <Input
              label="Время с"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <Input
              label="Время до"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </>
        )}
        <Input
          label="Лимит студентов"
          value={courseId ? String(selectedCourseLimit ?? 'Не задан') : ''}
          placeholder="Подтянется из курса"
          disabled
        />
      </div>

      <Select
        label="Помещение"
        value={roomId}
        onChange={(event) => setRoomId(event.target.value)}
      >
        <option value="">Не выбрано</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </Select>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Период</label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Дата начала"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Дата окончания"
            type="date"
            value={endDate}
            onChange={(event) => {
              const value = event.target.value;
              setEndDate(value);
              if (canReopen && !value) {
                setReopen(true);
              }
            }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Оставьте дату окончания пустой — расписание станет бессрочным, занятия создадутся сразу на 90 дней вперёд.
        </p>
      </div>

      {canReopen && (
        <label className="flex items-start gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={reopen}
            onChange={(event) => setReopen(event.target.checked)}
          />
          <span>
            Возобновить расписание (статус «Активно»). Пропущенные занятия после прежней даты окончания
            будут созданы автоматически.
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </Modal>
  );
};
