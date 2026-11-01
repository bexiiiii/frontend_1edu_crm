import type { DiscountPeriod } from '@/lib/api/types';
import { isDiscountPeriodValid } from '@/lib/discount-period';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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

interface LevelOption extends SelectOption {
  active: boolean;
}

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: CreateCourseRequest & { status?: CourseStatus },
    studentDiscounts?: Record<string, number>,
    studentDiscountPeriods?: Record<string, DiscountPeriod>
  ) => Promise<void>;
  teachers: SelectOption[];
  rooms: SelectOption[];
  students: SelectOption[];
  levels: LevelOption[];
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
    totalLessons: '',
    levelId: '',
    enrollmentLimit: '',
    color: COLORS[0],
    status: 'ACTIVE',
    teacherId: '',
    teacherIds: [],
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
  levels,
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
  const [totalLessons, setTotalLessons] = useState(defaults.totalLessons);
  const [levelId, setLevelId] = useState(defaults.levelId);
  const [enrollmentLimit, setEnrollmentLimit] = useState(defaults.enrollmentLimit);
  const [color, setColor] = useState(defaults.color || COLORS[0]);
  const [status, setStatus] = useState(defaults.status);
  const [teacherIds, setTeacherIds] = useState(defaults.teacherIds.length ? defaults.teacherIds : defaults.teacherId ? [defaults.teacherId] : []);
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [roomId, setRoomId] = useState(defaults.roomId);
  const [studentIds, setStudentIds] = useState(defaults.studentIds);
  const [studentDiscounts, setStudentDiscounts] = useState<Record<string, number>>({});
  const [studentDiscountPeriods, setStudentDiscountPeriods] = useState<Record<string, DiscountPeriod>>({});
  const [studentQuery, setStudentQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      const incoming = initialValues ?? getDefaultValues();
      setType(incoming.type);
      setFormat(incoming.format);
      setName(incoming.name);
      setDescription(incoming.description);
      setBasePrice(incoming.basePrice);
      setTotalLessons(incoming.totalLessons);
      setLevelId(incoming.levelId);
      setEnrollmentLimit(incoming.enrollmentLimit);
      setColor(incoming.color || COLORS[0]);
      setStatus(incoming.status);
      setTeacherIds(incoming.teacherIds.length ? incoming.teacherIds : incoming.teacherId ? [incoming.teacherId] : []);
      setRoomId(incoming.roomId);
      setStudentIds(incoming.studentIds);
      setStudentQuery('');
      setTeacherDropdownOpen(false);
      setError(null);
    }
    wasOpen.current = isOpen;
  }, [initialValues, isOpen]);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();

    return students.filter((student) =>
      !query || student.name.toLowerCase().includes(query)
    );
  }, [studentQuery, students]);

  const selectedTeacherNames = useMemo(
    () => teachers.filter((teacher) => teacherIds.includes(teacher.id)).map((teacher) => teacher.name),
    [teacherIds, teachers]
  );

  const handleStudentToggle = (studentId: string) => {
    setStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleTeacherToggle = (teacherId: string) => {
    setTeacherIds((prev) => prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]);
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Название курса обязательно.');
      return;
    }

    if (!levelId) {
      setError('Уровень курса обязателен. Добавьте его в Настройки → Статусы → Уровни.');
      return;
    }

    const parsedBasePrice = Number(basePrice);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setError('Укажите корректную базовую цену.');
      return;
    }

    const parsedEnrollmentLimit = enrollmentLimit.trim() ? Number(enrollmentLimit) : undefined;
    const parsedTotalLessons = totalLessons.trim() ? Number(totalLessons) : undefined;
    if (!parsedTotalLessons || !Number.isInteger(parsedTotalLessons) || parsedTotalLessons < 1) {
      setError('Укажите количество уроков.');
      return;
    }
    if (
      parsedEnrollmentLimit !== undefined &&
      (!Number.isFinite(parsedEnrollmentLimit) || parsedEnrollmentLimit <= 0)
    ) {
      setError('Лимит учеников должен быть положительным числом.');
      return;
    }

    const invalidPeriod = Object.entries(studentDiscountPeriods).some(
      ([id, period]) => studentIds.includes(id) && !isDiscountPeriodValid(period.fromMonth, period.toMonth)
    );
    if (invalidPeriod) {
      setError('Период скидки: месяц начала не может быть позже месяца окончания.');
      return;
    }

    try {
      await onSave({
        type,
        format,
        name: name.trim(),
        description: description.trim() || undefined,
        basePrice: parsedBasePrice,
        totalLessons: parsedTotalLessons,
        levelId,
        enrollmentLimit: parsedEnrollmentLimit,
        color: color || undefined,
        teacherId: teacherIds[0] || undefined,
        teacherIds,
        roomId: roomId || undefined,
        studentIds,
        ...(includeStatus ? { status } : {}),
      }, studentDiscounts, studentDiscountPeriods);
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

        <Select label="Уровень курса *" value={levelId} onChange={(event) => setLevelId(event.target.value)}>
          <option value="">Выберите уровень</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id} disabled={!level.active && level.id !== levelId}>
              {level.name}{level.active ? '' : ' (неактивен)'}
            </option>
          ))}
        </Select>

        {levels.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Сначала добавьте хотя бы один активный уровень в разделе «Настройки → Статусы».
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label={type === 'GROUP' ? 'Общая сумма за курс' : 'Цена за один урок'}
            type="number"
            value={basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
            placeholder={type === 'GROUP' ? 'Например, 600000' : 'Например, 15000'}
          />
          <Input
            label="Количество уроков"
            type="number"
            value={totalLessons}
            onChange={(event) => setTotalLessons(event.target.value)}
            placeholder="Например, 24"
          />
        </div>

        {type === 'GROUP' ? (
          <Input label="Лимит учеников" type="number" value={enrollmentLimit}
            onChange={(event) => setEnrollmentLimit(event.target.value)} placeholder="Например, 12" />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-[#5d6676]">Преподаватели курса</label>
              <span className="text-xs text-[#7f8897]">Выбрано: {teacherIds.length}</span>
            </div>
            <button type="button" onClick={() => setTeacherDropdownOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#dbe2e8] bg-white px-3 py-2 text-left transition-colors hover:border-[#b9c7d5] focus:border-[#467aff] focus:outline-none focus:ring-2 focus:ring-[#467aff]/15">
              <span className={`truncate text-sm ${selectedTeacherNames.length ? 'text-[#202938]' : 'text-[#8a93a3]'}`}>
                {selectedTeacherNames.length ? selectedTeacherNames.join(', ') : 'Выберите преподавателей'}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[#7f8897] transition-transform ${teacherDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {teacherDropdownOpen ? (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#dbe2e8] bg-white p-2 shadow-[0_16px_36px_rgba(31,37,48,0.16)]">
                {teachers.length ? teachers.map((teacher) => {
                  const selected = teacherIds.includes(teacher.id);
                  return (
                    <button key={teacher.id} type="button" onClick={() => handleTeacherToggle(teacher.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f5f8fb]">
                      <span className="truncate text-sm text-[#202938]">{teacher.name}</span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[#467aff] bg-[#467aff] text-white' : 'border-[#cfd8e1] text-transparent'}`}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                }) : <p className="px-3 py-2 text-sm text-[#8a93a3]">Преподаватели не найдены</p>}
              </div>
            ) : null}
          </div>

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
              filteredStudents.map((student) => {
                const isSelected = studentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl px-2 py-1.5 hover:bg-white"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleStudentToggle(student.id)}
                        className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                      />
                      <span className="truncate text-sm text-[#202938]">{student.name}</span>
                    </label>
                    {isSelected ? (
                      <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-[#8a93a3]">Скидка:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={studentDiscounts[student.id] ?? ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setStudentDiscounts((prev) => ({
                              ...prev,
                              [student.id]: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)),
                            }));
                          }}
                          placeholder="0"
                          className="w-14 rounded-lg border border-[#cfd8e1] bg-white px-1.5 py-0.5 text-center text-xs font-semibold text-[#202938] focus:border-[#467aff] focus:outline-none"
                        />
                        <span className="text-xs text-[#8a93a3]">%</span>
                      </div>
                    ) : null}
                    {isSelected && (studentDiscounts[student.id] ?? 0) > 0 ? (
                      <div className="flex basis-full items-center justify-end gap-1.5 pl-7" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-[#8a93a3]">с</span>
                        <input
                          type="month"
                          value={studentDiscountPeriods[student.id]?.fromMonth ?? ''}
                          max={studentDiscountPeriods[student.id]?.toMonth || undefined}
                          onChange={(e) => setStudentDiscountPeriods((prev) => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], fromMonth: e.target.value },
                          }))}
                          className="rounded-lg border border-[#cfd8e1] bg-white px-1.5 py-0.5 text-xs font-semibold text-[#202938] focus:border-[#467aff] focus:outline-none"
                        />
                        <span className="text-xs text-[#8a93a3]">по</span>
                        <input
                          type="month"
                          value={studentDiscountPeriods[student.id]?.toMonth ?? ''}
                          min={studentDiscountPeriods[student.id]?.fromMonth || undefined}
                          onChange={(e) => setStudentDiscountPeriods((prev) => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], toMonth: e.target.value },
                          }))}
                          className="rounded-lg border border-[#cfd8e1] bg-white px-1.5 py-0.5 text-xs font-semibold text-[#202938] focus:border-[#467aff] focus:outline-none"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })
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
