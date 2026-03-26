import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { COURSE_FORMATS, COURSE_STATUSES, COURSE_TYPES, COLORS } from '@/constants/class';
import type { CreateCourseRequest, CourseStatus } from '@/lib/api';
import type { CourseFormValues } from '@/types/class';

interface SelectOption {
  id: string;
  name: string;
}

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCourseRequest & { status?: CourseStatus }) => Promise<void>;
  teachers: SelectOption[];
  rooms: SelectOption[];
  students: SelectOption[];
  initialValues?: CourseFormValues;
  isSubmitting?: boolean;
  title?: string;
  includeStatus?: boolean;
}

function getDefaultValues(): CourseFormValues {
  return {
    type: 'GROUP',
    format: 'OFFLINE',
    name: '',
    description: '',
    basePrice: '',
    enrollmentLimit: '',
    color: COLORS[0],
    status: 'ACTIVE',
    teacherId: '',
    roomId: '',
    studentIds: [],
  };
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

  return 'Не удалось сохранить курс. Попробуйте ещё раз.';
}

export const AddClassModal = ({
  isOpen,
  onClose,
  onSave,
  teachers,
  rooms,
  students,
  initialValues,
  isSubmitting = false,
  title = 'Добавить курс',
  includeStatus = false,
}: AddClassModalProps) => {
  const defaults = initialValues ?? getDefaultValues();

  const [type, setType] = useState(defaults.type);
  const [format, setFormat] = useState(defaults.format);
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [basePrice, setBasePrice] = useState(defaults.basePrice);
  const [enrollmentLimit, setEnrollmentLimit] = useState(defaults.enrollmentLimit);
  const [color, setColor] = useState(defaults.color || COLORS[0]);
  const [status, setStatus] = useState(defaults.status);
  const [teacherId, setTeacherId] = useState(defaults.teacherId);
  const [roomId, setRoomId] = useState(defaults.roomId);
  const [studentIds, setStudentIds] = useState(defaults.studentIds);
  const [studentQuery, setStudentQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();

    return students.filter((student) =>
      !query || student.name.toLowerCase().includes(query)
    );
  }, [studentQuery, students]);

  const handleStudentToggle = (studentId: string) => {
    setStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Название курса обязательно.');
      return;
    }

    const parsedBasePrice = Number(basePrice);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setError('Укажите корректную базовую цену.');
      return;
    }

    const parsedEnrollmentLimit = enrollmentLimit.trim() ? Number(enrollmentLimit) : undefined;
    if (
      parsedEnrollmentLimit !== undefined &&
      (!Number.isFinite(parsedEnrollmentLimit) || parsedEnrollmentLimit <= 0)
    ) {
      setError('Лимит учеников должен быть положительным числом.');
      return;
    }

    try {
      await onSave({
        type,
        format,
        name: name.trim(),
        description: description.trim() || undefined,
        basePrice: parsedBasePrice,
        enrollmentLimit: parsedEnrollmentLimit,
        color: color || undefined,
        teacherId: teacherId || undefined,
        roomId: roomId || undefined,
        studentIds,
        ...(includeStatus ? { status } : {}),
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
      <div className="space-y-5">
        {includeStatus ? (
          <Select
            label="Статус"
            value={status}
            onChange={(event) => setStatus(event.target.value as CourseFormValues['status'])}
          >
            {COURSE_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Тип курса"
            value={type}
            onChange={(event) => setType(event.target.value as CourseFormValues['type'])}
          >
            {COURSE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>

          <Select
            label="Формат"
            value={format}
            onChange={(event) => setFormat(event.target.value as CourseFormValues['format'])}
          >
            {COURSE_FORMATS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Название курса"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, Английский Beginner"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Базовая цена"
            type="number"
            value={basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
            placeholder="Например, 600000"
          />
          <Input
            label="Лимит учеников"
            type="number"
            value={enrollmentLimit}
            onChange={(event) => setEnrollmentLimit(event.target.value)}
            placeholder="Например, 12"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <Select
            label="Кабинет"
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
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-[#5d6676]">Ученики курса</label>
            <span className="text-xs font-medium text-[#7f8897]">
              Выбрано: {studentIds.length}
            </span>
          </div>
          <Input
            value={studentQuery}
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder="Поиск по ученикам"
          />
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[#dbe2e8] bg-[#fbfcfd] p-3">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-white">
                  <input
                    type="checkbox"
                    checked={studentIds.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                  />
                  <span className="text-sm text-[#202938]">{student.name}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-[#8a93a3]">Ученики не найдены</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
          <Input
            label="Цвет"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Быстрый выбор цвета</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  className={`h-9 w-9 rounded-lg border ${color === item ? 'border-[#1f2530]' : 'border-[#dbe2e8]'}`}
                  style={{ backgroundColor: item }}
                  aria-label={`Выбрать цвет ${item}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#5d6676]">Описание</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Краткое описание курса"
            className="crm-textarea resize-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
