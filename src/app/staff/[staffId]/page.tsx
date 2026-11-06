'use client';
import { CancelSalaryPaymentButton } from '@/components/features/salary/CancelSalaryPaymentButton';
import { SalaryBalance } from '@/components/features/salary/SalaryBalance';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Edit2,
  GraduationCap,
  Loader2,
  PlusCircle,
  RotateCcw,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useBackNavigation, useUrlState } from '@/hooks/useUrlState';
import { AddEmployeeModal } from '@/components/features/employees/AddEmployeeModal';
import { ReplaceTeacherModal } from '@/components/features/employees/ReplaceTeacherModal';
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
  settingsService,
  staffService,
  studentsService,
  type CreateSalaryPaymentRequest,
  type CourseDto,
  type ScheduleDto,
  type StaffDto,
  type StaffSalaryHistoryDto,
  type StudentDto,
  type UpdateStaffRequest,
  type StaffAssignmentsDto,
} from '@/lib/api';
import {
  formatScheduleDays,
  formatSchedulePeriod,
  formatScheduleTime,
  hasDifferentDayTimes,
} from '@/lib/scheduleUtils';
import type { StaffFormValues } from '@/types/employee';
import { useAuthStore } from '@/store/authStore';

type StaffProfileTab = 'profile' | 'groups' | 'schedule' | 'students' | 'salary';

type StaffProfileData = {
  staff: StaffDto;
  schedules: ScheduleDto[];
  coursesById: Record<string, CourseDto>;
  studentsByGroupId: Record<string, StudentDto[]>;
};

const profileTabs: Array<{ id: StaffProfileTab; label: string }> = [
  { id: 'profile', label: 'Профиль' },
  { id: 'groups', label: 'Группы' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'students', label: 'Ученики' },
  { id: 'salary', label: 'Зарплата' },
];

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

function formatMonthLabel(month: string): string {
  if (!month) {
    return '—';
  }

  return new Date(`${month}-01T00:00:00`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '—';
}

function formatMoney(amount: number | null | undefined, currency = 'KZT'): string {
  if (typeof amount !== 'number') {
    return '—';
  }

  const suffix = currency === 'KZT' ? '₸' : currency;
  return `${amount.toLocaleString('ru-RU')} ${suffix}`;
}

function getStaffDisplayName(staff: StaffDto): string {
  const composedName = [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ').trim();

  if (composedName) {
    return composedName;
  }

  return staff.fullName?.trim() || 'Без имени';
}

function getStudentDisplayName(student: StudentDto): string {
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim()
    || student.fullName?.trim()
    || 'Без имени';
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
    individualSalaryPercentage: staff.individualSalaryPercentage != null ? String(staff.individualSalaryPercentage) : '50',
    scheduleColor: staff.scheduleColor || '#467aff',
    hireDate: staff.hireDate || '',
    notes: staff.notes || '',
  };
}

export default function StaffProfilePage() {
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const canEditSalary = roles.some((role) => role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN') || permissions.includes('FINANCE_EDIT');
  const isManager = roles.includes('MANAGER') && !roles.some((role) => role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN');
  const visibleProfileTabs = isManager ? profileTabs.filter((tab) => tab.id !== 'salary') : profileTabs;
  const router = useRouter();
  const goBack = useBackNavigation('/staff');
  const params = useParams();
  const staffIdParam = params.staffId;
  const staffId = Array.isArray(staffIdParam) ? staffIdParam[0] : staffIdParam;

  // ?tab= keeps the open tab on reload and «Назад».
  const [activeTabRaw, setActiveTab] = useUrlState('tab', 'profile');
  const activeTab = activeTabRaw as StaffProfileTab;
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(getCurrentMonth());
  const [selectedSalaryBranchId, setSelectedSalaryBranchId] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dismissalAssignments, setDismissalAssignments] = useState<StaffAssignmentsDto | null>(null);
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

    const schedulesResult = await schedulesService
      .getAll({ page: 0, size: 500, teacherId: staffId })
      .catch(() => null);

    const schedules = schedulesResult?.data.content ?? [];

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
      },
    };
  }, [staffId]);

  const { data: branches } = useApi(
    () => (isManager ? Promise.resolve({ data: [] }) : settingsService.getBranches()),
    [isManager]
  );

  const staff = data?.staff ?? null;
  const staffSalaryBranches = useMemo(() => {
    if (!staff) return [];
    const allowedBranchIds = new Set(staff.branchIds ?? []);
    return (branches ?? []).filter((branch) => branch.active && allowedBranchIds.has(branch.id));
  }, [branches, staff]);

  const salaryBranchId = selectedSalaryBranchId === 'all' ? undefined : selectedSalaryBranchId;
  const salaryBranchNames = useMemo(
    () => new Map((branches ?? []).map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const {
    data: salaryHistory,
    loading: salaryLoading,
    error: salaryError,
    refetch: refetchSalary,
  } = useApi<StaffSalaryHistoryDto | null>(
    () =>
      staffId && !isManager
        ? salaryService.getStaffHistory(staffId, {
            from: selectedSalaryMonth,
            to: selectedSalaryMonth,
            branchId: salaryBranchId,
          })
        : Promise.resolve({ data: null }),
    [isManager, salaryBranchId, selectedSalaryMonth, staffId]
  );

  const updateStaffMutation = useMutation(({ id, payload }: { id: string; payload: UpdateStaffRequest }) =>
    staffService.update(id, payload)
  );
  const deleteStaffMutation = useMutation((id: string) => staffService.delete(id));
  const createPaymentMutation = useMutation((payload: CreateSalaryPaymentRequest) =>
    salaryService.createPayment(payload)
  );
  const excludeLessonMutation = useMutation(({ lessonId, reason }: { lessonId: string; reason?: string }) =>
    salaryService.excludeLesson(staffId as string, lessonId, reason)
  );
  const restoreLessonMutation = useMutation((lessonId: string) =>
    salaryService.restoreLesson(staffId as string, lessonId)
  );

  const groupRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        courseId: string | null;
        name: string;
        courseName: string;
        studentsCount: number;
        scheduleText: string;
        periodText: string;
        status: ScheduleDto['status'];
      }>;
    }

    return data.schedules
      .slice()
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.startTime.localeCompare(right.startTime))
      .map((schedule) => ({
        id: schedule.id,
        courseId: schedule.courseId || null,
        name: schedule.name,
        courseName: schedule.courseId
          ? (data.coursesById[schedule.courseId]?.name || schedule.courseId)
          : 'Без курса',
        studentsCount: data.studentsByGroupId[schedule.id]?.length ?? 0,
        scheduleText: hasDifferentDayTimes(schedule)
          ? formatScheduleTime(schedule)
          : `${formatScheduleDays(schedule.daysOfWeek)} • ${formatScheduleTime(schedule)}`,
        periodText: formatSchedulePeriod(schedule.startDate, schedule.endDate),
        status: schedule.status,
      }));
  }, [data]);

  const scheduleRows = useMemo(
    () =>
      groupRows.map((group) => ({
        id: group.id,
        courseId: group.courseId,
        name: group.name,
        courseName: group.courseName,
        scheduleText: group.scheduleText,
        periodText: group.periodText,
        status: group.status,
      })),
    [groupRows]
  );

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

  const salaryLessonRows = useMemo(() => {
    if (!salaryHistory) {
      return [];
    }

    return salaryHistory.months
      .flatMap((month) => month.lessons ?? [])
      .slice()
      .sort((left, right) => {
        const dateComparison = right.lessonDate.localeCompare(left.lessonDate);
        return dateComparison || (right.startTime || '').localeCompare(left.startTime || '');
      });
  }, [salaryHistory]);

  const selectedSalaryBreakdown = useMemo(
    () => salaryHistory?.months.find((month) => month.month === selectedSalaryMonth) ?? null,
    [salaryHistory, selectedSalaryMonth]
  );

  const substitutionCount = useMemo(
    () => salaryLessonRows.filter((lesson) => lesson.substitution).length,
    [salaryLessonRows]
  );

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
      defaultMonth: selectedSalaryMonth,
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

    const updated = await updateStaffMutation.mutate({
      id: staff.id,
      payload,
    });

    setIsEditModalOpen(false);
    // Just dismissed with an active teaching load: offer a replacement right away.
    if (updated?.activeAssignments?.hasAssignments) {
      setDismissalAssignments(updated.activeAssignments);
    }
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
    await Promise.all([refetch(), refetchSalary()]);
  };

  const handleExcludeSalaryLesson = async (lessonId: string) => {
    if (!confirm('Исключить этот урок только из начисления зарплаты? Посещаемость, расписание и оплаты учеников не изменятся.')) {
      return;
    }
    try {
      await excludeLessonMutation.mutate({ lessonId });
      await refetchSalary();
    } catch { /* useMutation displays the API error */ }
  };

  const handleRestoreSalaryLesson = async (lessonId: string) => {
    try {
      await restoreLessonMutation.mutate(lessonId);
      await refetchSalary();
    } catch { /* useMutation displays the API error */ }
  };

  if (!staffId) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
          Назад к сотрудникам
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Не удалось определить ID сотрудника.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
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
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
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
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={goBack}>
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
            {!isManager && (
              <div>
                <span className="text-[#8a93a3]">Схема оплаты:</span> {STAFF_SALARY_TYPE_LABELS[staff.salaryType]}
              </div>
            )}
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
          {!isManager && (
            <>
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
            </>
          )}
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
          {!isManager && (
            <Button
              variant="secondary"
              icon={PlusCircle}
              onClick={openPaymentModal}
              disabled={createPaymentMutation.loading || salaryStaffOptions.length === 0}
            >
              Зафиксировать выплату
            </Button>
          )}
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
          tabs={visibleProfileTabs}
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
            {!isManager && (
              <>
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
              </>
            )}
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
                      <td className="crm-table-cell">
                        {group.courseId ? (
                          <Link prefetch={false} href={`/classes/${group.courseId}`} className="font-medium text-[#273142] hover:text-[#467aff] hover:underline">
                            {group.name}
                          </Link>
                        ) : group.name}
                      </td>
                      <td className="crm-table-cell">
                        {group.courseId ? (
                          <Link prefetch={false} href={`/classes/${group.courseId}`} className="text-[#467aff] hover:underline">
                            {group.courseName}
                          </Link>
                        ) : group.courseName}
                      </td>
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

      {activeTab === 'schedule' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <GraduationCap className="mr-2 inline h-4 w-4" />
              Расписаний преподавателя: <span className="font-semibold text-gray-900">{scheduleRows.length}</span>
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
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {scheduleRows.length > 0 ? (
                  scheduleRows.map((schedule, index) => (
                    <tr key={schedule.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">
                        {schedule.courseId ? (
                          <Link prefetch={false} href={`/classes/${schedule.courseId}`} className="font-medium text-[#273142] hover:text-[#467aff] hover:underline">
                            {schedule.name}
                          </Link>
                        ) : schedule.name}
                      </td>
                      <td className="crm-table-cell">
                        {schedule.courseId ? (
                          <Link prefetch={false} href={`/classes/${schedule.courseId}`} className="text-[#467aff] hover:underline">
                            {schedule.courseName}
                          </Link>
                        ) : schedule.courseName}
                      </td>
                      <td className="crm-table-cell">{schedule.scheduleText}</td>
                      <td className="crm-table-cell">{schedule.periodText}</td>
                      <td className="crm-table-cell">{SCHEDULE_STATUS_LABELS[schedule.status]}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Для сотрудника пока не найдено расписаний
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
                      <td className="crm-table-cell">
                        <Link prefetch={false} href={`/students/${student.id}`} className="font-semibold text-[#467aff] hover:underline">
                          {student.fullName}
                        </Link>
                      </td>
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

      {!isManager && activeTab === 'salary' && (
        <div className="space-y-4">
          <p className="text-sm text-[#8a93a3]">Начислено, выплачено и остаток — по всем филиалам. Фильтр филиала меняет только список уроков ниже.</p>
          <div className="crm-surface p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Начислено за месяц</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalDue)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Выплачено за месяц</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(summary.totalPaid)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Остаток</p>
                <p className="mt-1 text-lg font-semibold"><SalaryBalance amount={summary.totalOutstanding} /></p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Платежей</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{salaryPaymentRows.length}</p>
              </div>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[#e6ebf0] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#273142]">
                  <Wallet className="mr-2 inline h-4 w-4 text-[#467aff]" />
                  Начисления по урокам
                </p>
                <p className="mt-1 text-xs text-[#8a93a3]">
                  {formatMonthLabel(selectedSalaryMonth)} · {salaryLessonRows.length} занятий
                  {substitutionCount > 0 ? ` · ${substitutionCount} замен` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              {staffSalaryBranches.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-[#5f6b7b]">
                  <span className="sr-only">Филиал начислений</span>
                  <select
                    value={selectedSalaryBranchId}
                    onChange={(event) => setSelectedSalaryBranchId(event.target.value)}
                    className="crm-select min-w-44"
                    aria-label="Филиал начислений"
                  >
                    <option value="all">Все филиалы</option>
                    {staffSalaryBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-[#5f6b7b]">
                <CalendarDays className="h-4 w-4 text-[#8a93a3]" />
                <span className="sr-only">Месяц начислений</span>
                <input
                  type="month"
                  value={selectedSalaryMonth}
                  onChange={(event) => setSelectedSalaryMonth(event.target.value || getCurrentMonth())}
                  className="crm-select min-w-44"
                  aria-label="Месяц начислений"
                />
              </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px]">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Дата и время</th>
                    <th className="crm-table-th">Филиал</th>
                    <th className="crm-table-th">Курс / группа</th>
                    <th className="crm-table-th">Преподаватель</th>
                    <th className="crm-table-th">Ученики</th>
                    <th className="crm-table-th">Расчёт базы</th>
                    <th className="crm-table-th">База урока</th>
                    <th className="crm-table-th">Начислено</th>
                    <th className="crm-table-th text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {salaryLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={10} className="crm-table-cell py-10 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#467aff]" />
                      </td>
                    </tr>
                  ) : salaryError ? (
                    <tr className="crm-table-row">
                      <td colSpan={10} className="crm-table-cell py-10 text-center text-sm text-red-600">
                        {salaryError}
                      </td>
                    </tr>
                  ) : salaryLessonRows.length > 0 ? (
                    salaryLessonRows.map((lesson, index) => (
                      <tr
                        key={lesson.lessonId}
                        className={`crm-table-row ${lesson.excludedFromSalary ? 'bg-[#f8fafc] [&>td:not(:last-child)]:line-through [&>td:not(:last-child)]:text-slate-400 [&>td:not(:last-child)_*]:!text-slate-400' : ''}`}
                      >
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">
                          {lesson.lessonId ? (
                            <Link prefetch={false} href={`/attendance/${lesson.lessonId}`} className="font-medium text-[#467aff] hover:underline">
                              {formatDate(lesson.lessonDate)}
                            </Link>
                          ) : (
                            <div className="font-medium text-[#273142]">{formatDate(lesson.lessonDate)}</div>
                          )}
                          <div className="mt-0.5 text-xs text-[#8a93a3]">
                            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                          </div>
                        </td>
                        <td className="crm-table-cell">
                          <span className="inline-flex rounded-md border border-[#dbe5f2] bg-[#f7faff] px-2.5 py-1 text-sm font-medium text-[#42526b]">
                            {lesson.branchId ? salaryBranchNames.get(lesson.branchId) || 'Неизвестный филиал' : 'Не указан'}
                          </span>
                        </td>
                        <td className="crm-table-cell">
                          {lesson.courseId ? (
                            <Link prefetch={false} href={`/classes/${lesson.courseId}`} className="font-medium text-[#273142] hover:text-[#467aff] hover:underline">
                              {lesson.courseName || 'Без курса'}
                            </Link>
                          ) : (
                            <div className="font-medium text-[#273142]">{lesson.courseName || 'Без курса'}</div>
                          )}
                          <div className="mt-0.5 text-xs text-[#8a93a3]">
                            {lesson.courseId ? (
                              <Link prefetch={false} href={`/classes/${lesson.courseId}`} className="hover:text-[#467aff] hover:underline">
                                {lesson.scheduleName || 'Без группы'}
                              </Link>
                            ) : (
                              lesson.scheduleName || 'Без группы'
                            )}
                          </div>
                        </td>
                        <td className="crm-table-cell">
                          <div className="font-medium text-[#273142]">{lesson.actualTeacherName || staffDisplayName}</div>
                          {lesson.substitution ? (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Замена
                              </span>
                              <span className="text-xs text-[#8a93a3]">
                                вместо {lesson.plannedTeacherName || 'основного преподавателя'}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td className="crm-table-cell">
                          <span className="inline-flex min-w-8 justify-center rounded-lg bg-[#eef3ff] px-2.5 py-1 text-sm font-semibold text-[#467aff]">
                            {lesson.payableStudentCount}
                          </span>
                        </td>
                        <td className="crm-table-cell">
                          {lesson.courseType === 'GROUP' ? (
                            <div className="text-sm text-[#5f6b7b]">
                              {formatMoney(lesson.coursePrice)} / {lesson.lessonQuota || '—'} ур. × {lesson.payableStudentCount} уч.
                            </div>
                          ) : (
                            <div className="text-sm text-[#5f6b7b]">
                              {formatMoney(lesson.coursePrice)} за занятие
                            </div>
                          )}
                        </td>
                        <td className="crm-table-cell font-medium text-[#273142]">
                          {formatMoney(lesson.dailyBaseAmount)}
                        </td>
                        <td className="crm-table-cell">
                          {lesson.excludedFromSalary ? (
                            <div>
                              <span className="text-sm font-semibold text-[#98a2b3]">Не начисляется</span>
                              <div className="mt-0.5 text-xs text-[#98a2b3]">Исключён из зарплаты</div>
                            </div>
                          ) : salaryHistory?.salaryType === 'FIXED' ? (
                            <span className="text-sm font-medium text-[#5f6b7b]">Входит в оклад</span>
                          ) : (
                            <span className="text-sm font-semibold text-[#168a4a]">{formatMoney(lesson.dueAmount)}</span>
                          )}
                        </td>
                        <td className="crm-table-cell text-right">
                          {canEditSalary && salaryHistory?.salaryType !== 'FIXED' ? (
                            lesson.excludedFromSalary ? (
                              <button
                                type="button"
                                onClick={() => void handleRestoreSalaryLesson(lesson.lessonId)}
                                disabled={restoreLessonMutation.loading || excludeLessonMutation.loading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe9d8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#168a4a] transition hover:bg-[#f0fbf4] disabled:cursor-not-allowed disabled:opacity-60"
                                title="Вернуть урок в расчёт зарплаты"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Вернуть
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleExcludeSalaryLesson(lesson.lessonId)}
                                disabled={restoreLessonMutation.loading || excludeLessonMutation.loading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#f1d2d2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#bc3a3a] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
                                title="Исключить только из расчёта зарплаты"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Не начислять
                              </button>
                            )
                          ) : <span className="text-xs text-[#98a2b3]">—</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                    <td colSpan={10} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        За {formatMonthLabel(selectedSalaryMonth)} начислений по урокам нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!salaryLoading && !salaryError && selectedSalaryBreakdown ? (
              <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-[#e6ebf0] bg-[#f8fafc] px-6 py-4 text-sm">
                <span className="text-[#5f6b7b]">
                  База показанных уроков: <strong className="text-[#273142]">{formatMoney(salaryLessonRows.filter((lesson) => !lesson.excludedFromSalary).reduce((sum, lesson) => sum + Number(lesson.dailyBaseAmount || 0), 0))}</strong>
                </span>
                <span className="text-[#5f6b7b]">
                  По показанным урокам: <strong className="text-[#168a4a]">{formatMoney(salaryLessonRows.reduce((sum, lesson) => sum + Number(lesson.dueAmount || 0), 0))}</strong>
                </span>
              </div>
            ) : null}
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
                    <th className="crm-table-th">Действия</th>
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
                        <td className="crm-table-cell"><CancelSalaryPaymentButton id={payment.transactionId} amount={payment.amount} status={payment.status} onCancelled={refetchSalary} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
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
        showSalary={!isManager}
      />

      <ReplaceTeacherModal
        staffId={dismissalAssignments ? staff.id : null}
        staffName={staff.fullName}
        assignments={dismissalAssignments}
        onClose={() => setDismissalAssignments(null)}
        onReplaced={refetch}
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
