'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  GraduationCap,
  Loader2,
  PlusCircle,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AddEmployeeModal } from '@/components/features/employees/AddEmployeeModal';
import { AddSalaryModal } from '@/components/features/salary/AddSalaryModal';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import {
  STAFF_ROLE_LABELS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_COLORS,
  STAFF_STATUS_LABELS,
} from '@/constants/employee';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import { useApi, useMutation } from '@/hooks/useApi';
import {
  coursesService,
  salaryService,
  schedulesService,
  staffService,
  studentsService,
  type CreateSalaryPaymentRequest,
  type CourseDto,
  type ScheduleDto,
  type StaffDto,
  type StaffSalaryHistoryDto,
  type StudentDto,
  type UpdateStaffRequest,
} from '@/lib/api';
import type { StaffFormValues } from '@/types/employee';

type StaffProfileTab = 'profile' | 'groups' | 'students' | 'salary';

type StaffProfileData = {
  staff: StaffDto;
  schedules: ScheduleDto[];
  coursesById: Record<string, CourseDto>;
  studentsByGroupId: Record<string, StudentDto[]>;
  salaryHistory: StaffSalaryHistoryDto | null;
};

const profileTabs: Array<{ id: StaffProfileTab; label: string }> = [
  { id: 'profile', label: 'Профиль' },
  { id: 'groups', label: 'Группы' },
  { id: 'students', label: 'Ученики' },
  { id: 'salary', label: 'Зарплата' },
];

const DAY_OF_WEEK_LABELS: Record<string, string> = {
  MONDAY: 'Пн',
  TUESDAY: 'Вт',
  WEDNESDAY: 'Ср',
  THURSDAY: 'Чт',
  FRIDAY: 'Пт',
  SATURDAY: 'Сб',
  SUNDAY: 'Вс',
};

const SCHEDULE_STATUS_LABELS: Record<ScheduleDto['status'], string> = {
  ACTIVE: 'Активна',
  PAUSED: 'Пауза',
  COMPLETED: 'Завершена',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
  FAILED: 'Ошибка',
};

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
  }

  return new Date(value).toLocaleDateString('ru-RU');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMonthLabel(month: string): string {
  if (!month) {
    return '—';
  }

  return new Date(`${month}-01T00:00:00`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function formatMoney(amount: number | null | undefined, currency = 'KZT'): string {
  if (typeof amount !== 'number') {
    return '—';
  }

  const suffix = currency === 'KZT' ? '₸' : currency;
  return `${amount.toLocaleString('ru-RU')} ${suffix}`;
}

function getStaffDisplayName(staff: StaffDto): string {
  if (staff.fullName?.trim()) {
    return staff.fullName.trim();
  }

  return [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ').trim() || 'Без имени';
}

function getStudentDisplayName(student: StudentDto): string {
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim() || 'Без имени';
}

function formatScheduleDays(daysOfWeek: ScheduleDto['daysOfWeek']): string {
  if (!daysOfWeek.length) {
    return '—';
  }

  return daysOfWeek.map((day) => DAY_OF_WEEK_LABELS[day] || day).join(', ');
}

function compareIsoDateDesc(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

function toFormValues(staff: StaffDto): StaffFormValues {
  return {
    firstName: staff.firstName,
    lastName: staff.lastName,
    middleName: staff.middleName || '',
    email: staff.email || '',
    phone: staff.phone || '',
    role: staff.role,
    status: staff.status,
    customStatus: staff.customStatus || '',
    position: staff.position || '',
    salary: staff.salary !== null ? String(staff.salary) : '',
    salaryType: staff.salaryType,
    salaryPercentage: staff.salaryPercentage !== null ? String(staff.salaryPercentage) : '',
    hireDate: staff.hireDate || '',
    notes: staff.notes || '',
  };
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffIdParam = params.staffId;
  const staffId = Array.isArray(staffIdParam) ? staffIdParam[0] : staffIdParam;

  const [activeTab, setActiveTab] = useState<StaffProfileTab>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<{
    key: number;
    isOpen: boolean;
    defaultMonth: string;
  }>({
    key: 0,
    isOpen: false,
    defaultMonth: getCurrentMonth(),
  });

  const { data, loading, error, refetch } = useApi<StaffProfileData | null>(async () => {
    if (!staffId) {
      return { data: null };
    }

    const staffResponse = await staffService.getById(staffId);

    const [schedulesResult, salaryHistoryResult] = await Promise.all([
      schedulesService.getAll({ page: 0, size: 500, teacherId: staffId }).catch(() => null),
      salaryService.getStaffHistory(staffId).catch(() => null),
    ]);

    const schedules = schedulesResult?.data.content ?? [];
    const salaryHistory = salaryHistoryResult?.data ?? null;

    const courseIds = Array.from(new Set(schedules.map((schedule) => schedule.courseId).filter(Boolean)));

    const courseEntries = await Promise.all(
      courseIds.map(async (courseId) => {
        try {
          const response = await coursesService.getById(courseId as string);
          return [courseId as string, response.data] as const;
        } catch {
          return [courseId as string, null] as const;
        }
      })
    );

    const coursesById: Record<string, CourseDto> = {};
    courseEntries.forEach(([courseId, course]) => {
      if (course) {
        coursesById[courseId] = course;
      }
    });

    const groupStudentEntries = await Promise.all(
      schedules.map(async (schedule) => {
        try {
          const response = await studentsService.getByGroup(schedule.id, { page: 0, size: 500 });
          return [schedule.id, response.data.content] as const;
        } catch {
          return [schedule.id, [] as StudentDto[]] as const;
        }
      })
    );

    const studentsByGroupId: Record<string, StudentDto[]> = {};
    groupStudentEntries.forEach(([groupId, students]) => {
      studentsByGroupId[groupId] = students;
    });

    return {
      data: {
        staff: staffResponse.data,
        schedules,
        coursesById,
        studentsByGroupId,
        salaryHistory,
      },
    };
  }, [staffId]);

  const updateStaffMutation = useMutation(({ id, payload }: { id: string; payload: UpdateStaffRequest }) =>
    staffService.update(id, payload)
  );
  const deleteStaffMutation = useMutation((id: string) => staffService.delete(id));
  const createPaymentMutation = useMutation((payload: CreateSalaryPaymentRequest) =>
    salaryService.createPayment(payload)
  );

  const staff = data?.staff ?? null;
  const salaryHistory = data?.salaryHistory ?? null;

  const groupRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        name: string;
        courseName: string;
        studentsCount: number;
        scheduleText: string;
        periodText: string;
        status: ScheduleDto['status'];
      }>;
    }

    return data.schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      courseName: schedule.courseId
        ? (data.coursesById[schedule.courseId]?.name || schedule.courseId)
        : 'Без курса',
      studentsCount: data.studentsByGroupId[schedule.id]?.length ?? 0,
      scheduleText: `${formatScheduleDays(schedule.daysOfWeek)} • ${schedule.startTime.slice(0, 5)} - ${schedule.endTime.slice(0, 5)}`,
      periodText: `${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}`,
      status: schedule.status,
    }));
  }, [data]);

  const studentRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        fullName: string;
        phone: string;
        parentPhone: string;
        status: StudentDto['status'];
        groups: string[];
      }>;
    }

    const map = new Map<string, {
      id: string;
      fullName: string;
      phone: string;
      parentPhone: string;
      status: StudentDto['status'];
      groups: Set<string>;
    }>();

    data.schedules.forEach((schedule) => {
      const groupStudents = data.studentsByGroupId[schedule.id] ?? [];
      groupStudents.forEach((student) => {
        const existing = map.get(student.id);
        const groupName = schedule.name;

        if (existing) {
          existing.groups.add(groupName);
          return;
        }

        map.set(student.id, {
          id: student.id,
          fullName: getStudentDisplayName(student),
          phone: student.phone || '—',
          parentPhone: student.parentPhone || '—',
          status: student.status,
          groups: new Set([groupName]),
        });
      });
    });

    return Array.from(map.values())
      .map((entry) => ({
        id: entry.id,
        fullName: entry.fullName,
        phone: entry.phone,
        parentPhone: entry.parentPhone,
        status: entry.status,
        groups: Array.from(entry.groups),
      }))
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'ru-RU'));
  }, [data]);

  const salaryMonthRows = useMemo(() => {
    if (!salaryHistory) {
      return [];
    }

    return salaryHistory.months
      .slice()
      .sort((left, right) => right.month.localeCompare(left.month));
  }, [salaryHistory]);

  const salaryPaymentRows = useMemo(() => {
    if (!salaryHistory) {
      return [];
    }

    return salaryHistory.payments
      .slice()
      .sort((left, right) => compareIsoDateDesc(left.paymentDate, right.paymentDate));
  }, [salaryHistory]);

  const summary = useMemo(() => {
    const totalStudents = studentRows.length;

    return {
      groups: groupRows.length,
      students: totalStudents,
      totalDue: salaryHistory?.totalDue ?? 0,
      totalPaid: salaryHistory?.totalPaid ?? 0,
      totalOutstanding: salaryHistory?.totalOutstanding ?? 0,
    };
  }, [groupRows.length, salaryHistory, studentRows.length]);

  const salaryStaffOptions = useMemo(() => {
    if (!staff) {
      return [];
    }

    return [
      {
        id: staff.id,
        name: getStaffDisplayName(staff),
        outstandingAmount: summary.totalOutstanding,
        dueAmount: summary.totalDue,
        paidAmount: summary.totalPaid,
      },
    ];
  }, [staff, summary.totalDue, summary.totalOutstanding, summary.totalPaid]);

  const openPaymentModal = () => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      defaultMonth: getCurrentMonth(),
    }));
  };

  const closePaymentModal = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleSaveStaff = async (payload: UpdateStaffRequest) => {
    if (!staff) {
      return;
    }

    await updateStaffMutation.mutate({
      id: staff.id,
      payload,
    });

    setIsEditModalOpen(false);
    await refetch();
  };

  const handleDeleteStaff = async () => {
    if (!staff || !confirm('Вы уверены, что хотите удалить сотрудника?')) {
      return;
    }

    await deleteStaffMutation.mutate(staff.id);
    router.push('/staff');
  };

  const handleSavePayment = async (payload: CreateSalaryPaymentRequest) => {
    await createPaymentMutation.mutate(payload);
    closePaymentModal();
    await refetch();
  };

  if (!staffId) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/staff')}>
          Назад к сотрудникам
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Не удалось определить ID сотрудника.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/staff')}>
          Назад к сотрудникам
        </Button>
        <div className="crm-surface flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      </div>
    );
  }

  if (error || !data || !staff) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/staff')}>
          Назад к сотрудникам
        </Button>
        <div className="crm-surface space-y-4 p-6">
          <p className="text-sm text-red-600">{error || 'Не удалось загрузить карточку сотрудника.'}</p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      </div>
    );
  }

  const staffDisplayName = getStaffDisplayName(staff);

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/staff')}>
        Назад к сотрудникам
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
              <User className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-[#1f2530]">{staffDisplayName}</h1>
              <p className="mt-1 text-sm text-[#7f8794]">{staff.position || 'Должность не указана'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-lg border border-[#dbe2e8] bg-white px-2.5 py-1 text-xs font-medium text-[#5a6576]">
                  {STAFF_ROLE_LABELS[staff.role]}
                </span>
                <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${STAFF_STATUS_COLORS[staff.status]}`}>
                  {STAFF_STATUS_LABELS[staff.status]}
                </span>
                {staff.customStatus ? (
                  <span className="inline-flex rounded-lg border border-[#dbe2e8] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium text-[#5a6576]">
                    {staff.customStatus}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid min-w-60 grid-cols-1 gap-2 text-sm text-[#586272]">
            <div>
              <span className="text-[#8a93a3]">Телефон:</span> {staff.phone || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Email:</span> {staff.email || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Дата найма:</span> {formatDate(staff.hireDate)}
            </div>
            <div>
              <span className="text-[#8a93a3]">Схема оплаты:</span> {STAFF_SALARY_TYPE_LABELS[staff.salaryType]}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Группы</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{summary.groups}</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Ученики</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{summary.students}</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Начислено / выплачено</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">
              {formatMoney(summary.totalDue)} / {formatMoney(summary.totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Остаток</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalOutstanding)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e6ebf0] pt-4">
          <Button
            variant="secondary"
            icon={Edit2}
            onClick={() => setIsEditModalOpen(true)}
            disabled={updateStaffMutation.loading || deleteStaffMutation.loading}
          >
            Редактировать
          </Button>
          <Button
            variant="secondary"
            icon={PlusCircle}
            onClick={openPaymentModal}
            disabled={createPaymentMutation.loading || salaryStaffOptions.length === 0}
          >
            Зафиксировать выплату
          </Button>
          <Button
            variant="ghost"
            icon={Trash2}
            onClick={() => void handleDeleteStaff()}
            disabled={deleteStaffMutation.loading}
          >
            {deleteStaffMutation.loading ? 'Удаляем...' : 'Удалить'}
          </Button>
        </div>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={profileTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as StaffProfileTab)}
          className="w-fit"
          aria-label="Вкладки карточки сотрудника"
        />
      </div>

      {activeTab === 'profile' && (
        <div className="crm-surface space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Роль</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{STAFF_ROLE_LABELS[staff.role]}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Статус</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{STAFF_STATUS_LABELS[staff.status]}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Кастомный статус</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{staff.customStatus || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Должность</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{staff.position || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Фиксированный оклад</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{formatMoney(staff.salary)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Процент с учеников</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">
                {staff.salaryPercentage !== null ? `${staff.salaryPercentage}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Дата найма</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{formatDate(staff.hireDate)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Заметки</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#273142]">{staff.notes || '—'}</p>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <GraduationCap className="mr-2 inline h-4 w-4" />
              Групп у сотрудника: <span className="font-semibold text-gray-900">{groupRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Группа</th>
                  <th className="crm-table-th">Курс</th>
                  <th className="crm-table-th">Расписание</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Учеников</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {groupRows.length > 0 ? (
                  groupRows.map((group, index) => (
                    <tr key={group.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">{group.name}</td>
                      <td className="crm-table-cell">{group.courseName}</td>
                      <td className="crm-table-cell">{group.scheduleText}</td>
                      <td className="crm-table-cell">{group.periodText}</td>
                      <td className="crm-table-cell">{group.studentsCount}</td>
                      <td className="crm-table-cell">{SCHEDULE_STATUS_LABELS[group.status]}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Для сотрудника пока не найдено групп
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <Users className="mr-2 inline h-4 w-4" />
              Уникальных учеников: <span className="font-semibold text-gray-900">{studentRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Ученик</th>
                  <th className="crm-table-th">Телефон</th>
                  <th className="crm-table-th">Телефон родителя</th>
                  <th className="crm-table-th">Группы</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {studentRows.length > 0 ? (
                  studentRows.map((student, index) => (
                    <tr key={student.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">{student.fullName}</td>
                      <td className="crm-table-cell">{student.phone}</td>
                      <td className="crm-table-cell">{student.parentPhone}</td>
                      <td className="crm-table-cell">
                        <div className="text-sm text-[#273142]">{student.groups.join(', ') || '—'}</div>
                      </td>
                      <td className="crm-table-cell">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_STATUS_COLORS[student.status]}`}>
                          {STUDENT_STATUS_LABELS[student.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Ученики по группам не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-4">
          <div className="crm-surface p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Начислено всего</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalDue)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Выплачено всего</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalPaid)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Остаток</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalOutstanding)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Платежей</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{salaryPaymentRows.length}</p>
              </div>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-gray-700">
                <Wallet className="mr-2 inline h-4 w-4" />
                История начислений по месяцам
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Активных учеников</th>
                    <th className="crm-table-th">База процента</th>
                    <th className="crm-table-th">Начислено</th>
                    <th className="crm-table-th">Выплачено</th>
                    <th className="crm-table-th">Остаток</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {salaryMonthRows.length > 0 ? (
                    salaryMonthRows.map((row, index) => (
                      <tr key={row.month} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">{formatMonthLabel(row.month)}</td>
                        <td className="crm-table-cell">{row.activeStudentCount}</td>
                        <td className="crm-table-cell">{formatMoney(row.percentageBaseAmount)}</td>
                        <td className="crm-table-cell">{formatMoney(row.dueAmount)}</td>
                        <td className="crm-table-cell text-green-600">{formatMoney(row.paidAmount)}</td>
                        <td className="crm-table-cell text-red-600">{formatMoney(row.outstandingAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        История начислений пока отсутствует
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-gray-700">История выплат</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Дата</th>
                    <th className="crm-table-th">Зарплатный месяц</th>
                    <th className="crm-table-th">Сумма</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Комментарий</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {salaryPaymentRows.length > 0 ? (
                    salaryPaymentRows.map((payment, index) => (
                      <tr key={payment.transactionId} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">{formatDate(payment.paymentDate)}</td>
                        <td className="crm-table-cell">{formatMonthLabel(payment.salaryMonth)}</td>
                        <td className="crm-table-cell">{formatMoney(payment.amount, payment.currency)}</td>
                        <td className="crm-table-cell">{PAYMENT_STATUS_LABELS[payment.status] || payment.status}</td>
                        <td className="crm-table-cell">{payment.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Выплаты пока не зафиксированы
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AddEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(payload) => handleSaveStaff(payload as UpdateStaffRequest)}
        initialValues={toFormValues(staff)}
        isSubmitting={updateStaffMutation.loading}
        title="Редактировать сотрудника"
        includeStatus
      />

      <AddSalaryModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={closePaymentModal}
        onSave={handleSavePayment}
        staffOptions={salaryStaffOptions}
        defaultStaffId={staff.id}
        defaultMonth={paymentModalState.defaultMonth}
        isSubmitting={createPaymentMutation.loading}
      />
    </div>
  );
}
