import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import type { CreateScheduleRequest, DayOfWeek } from '@/lib/api';
import type { ScheduleFormValues } from '@/types/schedule';

interface SelectOption {
  id: string;
  name: string;
}

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateScheduleRequest) => Promise<void>;
  courses: SelectOption[];
  teachers: SelectOption[];
  rooms: SelectOption[];
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
    teacherId: '',
    roomId: '',
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '10:30',
    startDate: getTodayDate(),
    endDate: '',
    maxStudents: '',
  };
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
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
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
}: AddScheduleModalProps) => {
  const defaults = initialValues ?? getDefaultValues();

  const [name, setName] = useState(defaults.name);
  const [courseId, setCourseId] = useState(defaults.courseId);
  const [teacherId, setTeacherId] = useState(defaults.teacherId);
  const [roomId, setRoomId] = useState(defaults.roomId);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(defaults.daysOfWeek);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [maxStudents, setMaxStudents] = useState(defaults.maxStudents);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Укажите название расписания.');
      return;
    }

    if (!startDate || !startTime || !endTime) {
      setError('Заполните дату начала и время занятий.');
      return;
    }

    if (endTime <= startTime) {
      setError('Время окончания должно быть позже времени начала.');
      return;
    }

    if (endDate && endDate < startDate) {
      setError('Дата окончания не может быть раньше даты начала.');
      return;
    }

    if (!hasOccurrenceInRange(startDate, endDate || undefined, daysOfWeek)) {
      setError('В выбранном периоде нет ни одного совпадения с отмеченными днями недели.');
      return;
    }

    const parsedMaxStudents = maxStudents ? Number(maxStudents) : undefined;
    if (
      parsedMaxStudents !== undefined &&
      (!Number.isFinite(parsedMaxStudents) || parsedMaxStudents <= 0)
    ) {
      setError('Лимит студентов должен быть положительным числом.');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        courseId: courseId || undefined,
        teacherId: teacherId || undefined,
        roomId: roomId || undefined,
        daysOfWeek,
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        startDate,
        endDate: endDate || undefined,
        maxStudents: parsedMaxStudents,
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

        <Select
          label="Преподаватель"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
        >
          <option value="">Не выбрано</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </Select>
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
                  ? 'bg-teal-600 text-white'
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <Input
          label="Лимит студентов"
          type="number"
          value={maxStudents}
          onChange={(event) => setMaxStudents(event.target.value)}
          placeholder="Например, 12"
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
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </Modal>
  );
};
