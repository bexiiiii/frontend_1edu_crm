interface FilterOption {
  id: string;
  name: string;
}

interface ScheduleFiltersProps {
  teacherId: string;
  roomId: string;
  courseId: string;
  status: string;
  teachers: FilterOption[];
  rooms: FilterOption[];
  courses: FilterOption[];
  onTeacherChange: (teacherId: string) => void;
  onRoomChange: (roomId: string) => void;
  onCourseChange: (courseId: string) => void;
  onStatusChange: (status: string) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'PAUSED', label: 'На паузе' },
  { value: 'COMPLETED', label: 'Завершённые' },
];

export const ScheduleFilters = ({
  teacherId,
  roomId,
  courseId,
  status,
  teachers,
  rooms,
  courses,
  onTeacherChange,
  onRoomChange,
  onCourseChange,
  onStatusChange,
}: ScheduleFiltersProps) => {
  const selectStyles =
    'crm-select cursor-pointer appearance-none pr-10 bg-no-repeat bg-right text-sm font-medium text-[#4a5565]';
  const bgImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")";

  const baseStyle = {
    backgroundImage: bgImage,
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '16px',
  } as const;

  return (
    <>
      <select
        className={selectStyles}
        style={baseStyle}
        value={teacherId}
        onChange={(event) => onTeacherChange(event.target.value)}
      >
        <option value="">Все преподаватели</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.name}
          </option>
        ))}
      </select>

      <select
        className={selectStyles}
        style={baseStyle}
        value={courseId}
        onChange={(event) => onCourseChange(event.target.value)}
      >
        <option value="">Все курсы</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>

      <select
        className={selectStyles}
        style={baseStyle}
        value={roomId}
        onChange={(event) => onRoomChange(event.target.value)}
      >
        <option value="">Все кабинеты</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>

      <select
        className={selectStyles}
        style={baseStyle}
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
};
