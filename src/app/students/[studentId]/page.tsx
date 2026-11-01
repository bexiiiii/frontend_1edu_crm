/* eslint-disable @next/next/no-img-element */
'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Edit2,
  GraduationCap,
  Loader2,
  Phone,
  PlusCircle,
  Trash2,
  Undo2,
  User,
  Wallet,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AddStudentModal } from '@/components/features/students/AddStudentModal';
import { Tabs } from '@/components/ui/vercel-tabs';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  isPresentStatus,
} from '@/constants/attendance';
import {
  STUDENT_GENDER_LABELS,
  STUDENT_STATUS_COLORS,
  STUDENT_STATUS_LABELS,
} from '@/constants/student';
import { useApi, useMutation } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';
import { getErrorMessage } from '@/lib/error-message';
import { formatDiscountPeriod, isDiscountPeriodValid } from '@/lib/discount-period';
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl';
import {
  attendanceService,
  coursesService,
  financeService,
  lessonsService,
  schedulesService,
  settingsService,
  studentCallLogsService,
  studentPaymentsService,
  studentsService,
  subscriptionsService,
  type CreateStudentPaymentRequest,
  type CreateStudentRequest,
  type AttendanceDto,
  type BranchDto,
  type CourseDto,
  type CourseEnrollmentDto,
  type LessonDto,
  type SaveStudentCallLogRequest,
  type ScheduleDto,
  type StudentCallLogDto,
  type StudentDto,
  type StudentAttendanceChargeDto,
  type StudentPaymentDto,
  type StudentPaymentHistoryResponse,
  type SubscriptionDto,
  type SubscriptionPaymentSummaryDto,
  type SalaryDiscountMode,
  type TransactionDto,
  type UpdateStudentRequest,
  addStudentToBranch,
  returnStudentToGroup,
} from '@/lib/api';
import {
  formatScheduleDays,
  formatSchedulePeriod,
  formatScheduleTimeRange,
} from '@/lib/scheduleUtils';
import type { StudentFormValues } from '@/types/student';

type StudentProfileTab = 'profile' | 'groups' | 'schedule' | 'attendance' | 'payments' | 'calls';

type StudentProfileData = {
  student: StudentDto;
  subscriptions: SubscriptionDto[];
  courseEnrollments: CourseEnrollmentDto[];
  attendanceHistory: AttendanceDto[];
  paymentHistory: StudentPaymentHistoryResponse | null;
  attendanceCharges: StudentAttendanceChargeDto[];
  transactions: TransactionDto[];
  callLogs: StudentCallLogDto[];
  schedulesById: Record<string, ScheduleDto>;
  courseSchedulesById: Record<string, ScheduleDto[]>;
  coursesById: Record<string, CourseDto>;
  lessonsById: Record<string, LessonDto>;
};

const profileTabs: Array<{ id: StudentProfileTab; label: string }> = [
  { id: 'profile', label: 'Профиль' },
  { id: 'groups', label: 'Группы и абонементы' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'attendance', label: 'Посещаемость' },
  { id: 'payments', label: 'Оплаты' },
  { id: 'calls', label: 'Звонки' },
];

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionDto['status'], string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истек',
  CANCELLED: 'Отменен',
  FROZEN: 'Заморожен',
};

const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionDto['status'], string> = {
  ACTIVE: 'border-green-200 bg-green-100 text-green-700',
  EXPIRED: 'border-gray-200 bg-gray-100 text-gray-700',
  CANCELLED: 'border-red-200 bg-red-100 text-red-700',
  FROZEN: 'border-sky-200 bg-sky-100 text-sky-700',
};

// Payment form value for money that goes to the balance without a course.
const BALANCE_ONLY = '__balance__';

const newClientReference = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Note the payment service puts on allocations it makes from the student's free balance.
const AUTO_BALANCE_NOTE = 'Автоматически с баланса';

const PAYMENT_METHOD_LABELS: Record<StudentPaymentDto['method'], string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  TRANSFER: 'Перевод',
  OTHER: 'Другое',
};

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

function formatMoney(amount: number | null | undefined): string {
  if (typeof amount !== 'number') {
    return '—';
  }

  return `${amount.toLocaleString('ru-RU')} KZT`;
}

function getStudentDisplayName(student: StudentDto): string {
  // `fullName` is a legacy free-text value and may keep the former order.
  // Prefer the structured fields so every screen consistently shows Фамилия Имя Отчество.
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim()
    || student.fullName?.trim()
    || 'Без имени';
}

function getPrimaryPhone(student: StudentDto): string | null {
  const candidates = [
    student.studentPhone,
    student.parentPhone,
    student.phone,
  ];

  const firstPhone = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return firstPhone?.trim() || null;
}

function normalizePhoneForMessenger(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 11 && digitsOnly.startsWith('8')) {
    return `7${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

// Subscriptions that ended (EXPIRED / CANCELLED) are hidden from the payment form
// unless they still carry debt — then the cashier must be able to pay it off.
const CLOSED_SUBSCRIPTION_STATUSES: ReadonlyArray<SubscriptionDto['status']> = ['EXPIRED', 'CANCELLED'];

function subscriptionSummaryHasDebt(summary: SubscriptionPaymentSummaryDto | undefined): boolean {
  if (!summary) return false;
  if ((summary.totalDebt ?? 0) > 0 || (summary.grossDebt ?? 0) > 0) return true;
  return (summary.months ?? []).some((month) => (month.debt ?? 0) > 0);
}

// Enrollment statuses meaning the student left the course/group and can be returned.
const WITHDRAWN_ENROLLMENT_STATUSES = new Set<string>(['REMOVED', 'WITHDRAWN', 'COMPLETED']);

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function compareIsoDateDesc(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

function toFormValues(student: StudentDto): StudentFormValues {
  return {
    fullName: student.fullName || '',
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    middleName: student.middleName || '',
    customer: student.customer || '',
    studentPhoto: student.studentPhoto || '',
    email: student.email || '',
    phone: student.studentPhone || student.phone || '',
    studentPhone: student.studentPhone || student.phone || '',
    birthDate: student.birthDate || '',
    gender: student.gender || '',
    status: student.status,
    parentName: student.parentName || '',
    parentPhone: student.parentPhone || '',
    address: student.address || '',
    city: student.city || '',
    school: student.school || '',
    grade: student.grade || '',
    additionalInfo: student.additionalInfo || '',
    contract: student.contract || '',
    discount: student.discount || '',
    discountPercent: student.discountPercent ?? '',
    comment: student.comment || '',
    stateOrderParticipant: Boolean(student.stateOrderParticipant),
    loyalty: student.loyalty || '',
    additionalPhones: '',
    notes: student.notes || '',
  };
}

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentIdParam = params.studentId;
  const currentStaffId = useAuthStore((s) => s.user?.staffId ?? null);
  const currentUser = useAuthStore((s) => s.user);
  const currentBranchId = useAuthStore((s) => s.branchId);
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam;

  const [activeTab, setActiveTab] = useState<StudentProfileTab>('profile');
  const [expandedSubscriptions, setExpandedSubscriptions] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferBranchModalOpen, setIsTransferBranchModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [addBranchId, setAddBranchId] = useState('');
  const [returnToGroupModal, setReturnToGroupModal] = useState<{
    groupId: string;
    label: string;
    fromDate: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({
    amount: '',
    refundDate: new Date().toISOString().slice(0, 10),
    method: 'CASH' as StudentPaymentDto['method'],
    notes: '',
  });
  const [enrollmentDateModal, setEnrollmentDateModal] = useState<{
    enrollment: CourseEnrollmentDto;
    startDate: string;
  } | null>(null);
  const [isCallLogModalOpen, setIsCallLogModalOpen] = useState(false);
  const [isCallLogReasonModalOpen, setIsCallLogReasonModalOpen] = useState(false);
  const [callLogPage, setCallLogPage] = useState(0);
  const CALL_LOG_PAGE_SIZE = 8;
  const [pendingCallLogPayload, setPendingCallLogPayload] = useState<null | { id: string; data: SaveStudentCallLogRequest }>(null);
  const [editingCallLog, setEditingCallLog] = useState<StudentCallLogDto | null>(null);
  const [callLogForm, setCallLogForm] = useState<{
    callDate: string;
    callTime: string;
    callResult: string;
    notes: string;
    followUpRequired: boolean;
    followUpDate: string;
    updateReason: string;
  }>({
    callDate: new Date().toISOString().slice(0, 10),
    callTime: new Date().toTimeString().slice(0, 5),
    callResult: '',
    notes: '',
    followUpRequired: false,
    followUpDate: '',
    updateReason: '',
  });
  const [paymentForm, setPaymentForm] = useState<{
    subscriptionId: string;
    clientReference: string;
    amount: string;
    paidAt: string;
    paymentMonth: string;
    method: StudentPaymentDto['method'];
    notes: string;
  }>({
    subscriptionId: '',
    clientReference: '',
    amount: '',
    paidAt: new Date().toISOString().slice(0, 10),
    paymentMonth: new Date().toISOString().slice(0, 7),
    method: 'CASH',
    notes: '',
  });

  const [discountModal, setDiscountModal] = useState<{
    isOpen: boolean;
    subscriptionId: string;
    courseId?: string | null;
    courseName: string;
    discountPercent: number;
    discountAmount: string;
    discountFromMonth: string;
    discountToMonth: string;
    salaryDiscountMode: SalaryDiscountMode;
  }>({
    isOpen: false,
    subscriptionId: '',
    courseId: null,
    courseName: '',
    discountPercent: 0,
    discountAmount: '',
    discountFromMonth: '',
    discountToMonth: '',
    salaryDiscountMode: 'FULL_PRICE',
  });
  const discountPeriodValid = isDiscountPeriodValid(discountModal.discountFromMonth, discountModal.discountToMonth);
  const discountPeriodLabel = formatDiscountPeriod(discountModal.discountFromMonth, discountModal.discountToMonth);

  const handleSaveDiscount = async () => {
    if (!studentId || !discountModal.courseId || !discountPeriodValid) return;
    try {
      await studentPaymentsService.updateSubscriptionDiscount(
        studentId,
        discountModal.courseId,
        discountModal.discountPercent,
        discountModal.salaryDiscountMode,
        discountModal.discountAmount ? Number(discountModal.discountAmount) : undefined,
        { fromMonth: discountModal.discountFromMonth, toMonth: discountModal.discountToMonth }
      );
      setDiscountModal((prev) => ({ ...prev, isOpen: false }));
      refetch();
    } catch (saveError) {
      alert(getErrorMessage(saveError) || 'Не удалось обновить скидку');
    }
  };

  const { data, loading, error, refetch } = useApi<StudentProfileData | null>(async () => {
    if (!studentId) {
      return { data: null };
    }

    const studentResponse = await studentsService.getById(studentId);

    const [subscriptionsResult, enrollmentsResult, attendanceResult, paymentHistoryResult, transactionsResult, callLogsResult, attendanceChargesResult] = await Promise.all([
      subscriptionsService.getByStudent(studentId, { page: 0, size: 200 }).catch(() => null),
      coursesService.getStudentEnrollments(studentId).catch(() => null),
      attendanceService.getStudentHistory(studentId, { page: 0, size: 200 }).catch(() => null),
      studentPaymentsService.getByStudent(studentId).catch(() => null),
      financeService.getStudentTransactions(studentId, { page: 0, size: 200 }).catch(() => null),
      studentCallLogsService.getByStudent(studentId, { page: 0, size: 200 }).catch(() => null),
      studentPaymentsService.getAttendanceCharges(studentId).catch(() => null),
    ]);

    const subscriptions = subscriptionsResult?.data.content ?? [];
    const courseEnrollments = enrollmentsResult?.data ?? [];
    const attendanceHistory = attendanceResult?.data.content ?? [];
    const paymentHistory = paymentHistoryResult?.data ?? null;
    const transactions = transactionsResult?.data.content ?? [];
    const callLogs = callLogsResult?.data.content ?? [];
    const attendanceCharges = attendanceChargesResult?.data ?? [];

    const lessonIds = Array.from(new Set(attendanceHistory.map((row) => row.lessonId))).slice(0, 120);

    const lessonEntries = await Promise.all(
      lessonIds.map(async (id) => {
        try {
          const response = await lessonsService.getById(id);
          return [id, response.data] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );

    const lessonsById: Record<string, LessonDto> = {};
    lessonEntries.forEach(([id, value]) => {
      if (value) {
        lessonsById[id] = value;
      }
    });

    const scheduleIdsSet = new Set<string>();
    subscriptions.forEach((subscription) => {
      if (subscription.groupId) scheduleIdsSet.add(subscription.groupId);
    });
    Object.values(lessonsById).forEach((lesson) => {
      if (lesson.groupId) scheduleIdsSet.add(lesson.groupId);
    });

    const courseIdsSet = new Set<string>();
    subscriptions.forEach((subscription) => {
      if (subscription.courseId) courseIdsSet.add(subscription.courseId);
    });
    courseEnrollments.forEach((enrollment) => {
      if (enrollment.courseId) courseIdsSet.add(enrollment.courseId);
    });

    if (paymentHistory) {
      paymentHistory.subscriptions.forEach((sub) => {
        if (sub.courseId) courseIdsSet.add(sub.courseId);
      });
    }

    const scheduleIds = Array.from(scheduleIdsSet);
    const courseIds = Array.from(courseIdsSet);

    const [scheduleEntries, courseScheduleEntries, courseEntries] = await Promise.all([
      Promise.all(
        scheduleIds.map(async (id) => {
          try {
            const response = await schedulesService.getById(id);
            return [id, response.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      ),
      Promise.all(
        courseIds.map(async (id) => {
          try {
            const response = await schedulesService.getAll({ page: 0, size: 200, courseId: id });
            return [id, response.data.content] as const;
          } catch {
            return [id, [] as ScheduleDto[]] as const;
          }
        })
      ),
      Promise.all(
        courseIds.map(async (id) => {
          try {
            const response = await coursesService.getById(id);
            return [id, response.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      )
    ]);

    const schedulesById: Record<string, ScheduleDto> = {};
    const courseSchedulesById: Record<string, ScheduleDto[]> = {};
    const coursesById: Record<string, CourseDto> = {};

    scheduleEntries.forEach(([id, value]) => {
      if (value) {
        schedulesById[id] = value;
      }
    });

    courseScheduleEntries.forEach(([courseId, schedules]) => {
      courseSchedulesById[courseId] = schedules;
      schedules.forEach((schedule) => {
        schedulesById[schedule.id] = schedule;
      });
    });

    courseEntries.forEach(([id, value]) => {
      if (value) {
        coursesById[id] = value;
      }
    });

    return {
      data: {
        student: studentResponse.data,
        subscriptions,
        courseEnrollments,
        attendanceHistory,
        paymentHistory,
        attendanceCharges,
        transactions,
        callLogs,
        schedulesById,
        courseSchedulesById,
        coursesById,
        lessonsById,
      },
    };
  }, [studentId]);

  const student = data?.student ?? null;
  const photoUrl = useResolvedFileUrl(student?.studentPhoto);
  const { data: branchesResponse } = useApi<BranchDto[]>(() => settingsService.getBranches(), []);
  const transferBranches = (branchesResponse ?? []).filter(
    (branch) => branch.active && branch.id !== (student?.branchId || currentBranchId)
  );
  // Branches the same card can additionally be attached to (one card, several branches).
  const attachedBranchIds = new Set<string>(
    [...(student?.branchIds ?? []), student?.branchId || currentBranchId].filter(
      (id): id is string => Boolean(id)
    )
  );
  const addableBranches = (branchesResponse ?? []).filter(
    (branch) => branch.active && !attachedBranchIds.has(branch.id)
  );

  const updateStudentMutation = useMutation(({ id, data }: { id: string; data: UpdateStudentRequest }) =>
    studentsService.update(id, data)
  );
  const deleteStudentMutation = useMutation((id: string) => studentsService.delete(id));
  const transferStudentMutation = useMutation(({ id, branchId }: { id: string; branchId: string }) =>
    studentsService.transferToBranch(id, branchId)
  );
  const addToBranchMutation = useMutation(({ id, branchId }: { id: string; branchId: string }) =>
    addStudentToBranch(id, branchId)
  );
  const returnToGroupMutation = useMutation(
    ({ id, groupId, fromDate }: { id: string; groupId: string; fromDate: string }) =>
      returnStudentToGroup(id, groupId, fromDate)
  );
  const createPaymentMutation = useMutation((payload: CreateStudentPaymentRequest) =>
    studentPaymentsService.create(payload)
  );
  const refundBalanceMutation = useMutation((payload: { studentId: string; amount: number; refundDate: string; method: StudentPaymentDto['method']; notes?: string }) => {
    const { studentId: refundStudentId, ...request } = payload;
    return studentPaymentsService.refundBalance(refundStudentId, request);
  });
  const deletePaymentMutation = useMutation((paymentId: string) => studentPaymentsService.delete(paymentId));
  const updateEnrollmentDateMutation = useMutation((payload: { courseId: string; studentId: string; startDate: string }) =>
    coursesService.updateEnrollmentDate(payload.courseId, payload.studentId, payload.startDate)
  );
  const createCallLogMutation = useMutation((payload: SaveStudentCallLogRequest) =>
    studentCallLogsService.create(payload)
  );
  const updateCallLogMutation = useMutation(({ id, data }: { id: string; data: SaveStudentCallLogRequest }) =>
    studentCallLogsService.update(id, data)
  );
  const deleteCallLogMutation = useMutation(({ id, reason }: { id: string; reason: string }) =>
    studentCallLogsService.delete(id, reason)
  );

  const latestEnrollmentByCourseId = useMemo(() => {
    const map = new Map<string, CourseEnrollmentDto>();

    (data?.courseEnrollments ?? [])
      .slice()
      .sort((left, right) => compareIsoDateDesc(left.enrolledAt, right.enrolledAt))
      .forEach((enrollment) => {
        if (!map.has(enrollment.courseId)) {
          map.set(enrollment.courseId, enrollment);
        }
      });

    return map;
  }, [data?.courseEnrollments]);

  // Courses/groups the student is currently active in — no "return" button for those.
  const activeCourseOrGroupIds = useMemo(() => {
    const ids = new Set<string>();
    (data?.subscriptions ?? []).forEach((subscription) => {
      if (subscription.status === 'ACTIVE' || subscription.status === 'FROZEN') {
        if (subscription.courseId) ids.add(subscription.courseId);
        if (subscription.groupId) ids.add(subscription.groupId);
      }
    });
    (data?.courseEnrollments ?? []).forEach((enrollment) => {
      if (enrollment.enrollmentStatus === 'ACTIVE') ids.add(enrollment.courseId);
    });
    return ids;
  }, [data?.courseEnrollments, data?.subscriptions]);

  const currentEnrollmentStart = useMemo(() => {
    const activeDates = (data?.courseEnrollments ?? [])
      .filter((enrollment) => enrollment.enrollmentStatus === 'ACTIVE')
      .map((enrollment) => enrollment.enrolledAt)
      .filter(Boolean)
      .sort();
    if (activeDates.length > 0) return activeDates[0];
    return (data?.subscriptions ?? [])
      .filter((subscription) => subscription.status === 'ACTIVE')
      .map((subscription) => subscription.startDate)
      .filter(Boolean)
      .sort()[0] || null;
  }, [data?.courseEnrollments, data?.subscriptions]);

  const attendanceStats = useMemo(() => {
    if (!data) {
      return { total: 0, present: 0, rate: 0 };
    }

    const total = data.attendanceHistory.length;
    const present = data.attendanceHistory.filter((row) => isPresentStatus(row.status)).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, rate };
  }, [data]);

  const studentScheduleRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        key: string;
        groupName: string;
        courseName: string;
        daysText: string;
        timeText: string;
        periodText: string;
        statusText: string;
      }>;
    }

    const rows: Array<{
      key: string;
      groupName: string;
      courseName: string;
      daysText: string;
      timeText: string;
      periodText: string;
      statusText: string;
      startDate: string;
      startTime: string;
    }> = [];
    const seenScheduleIds = new Set<string>();

    // 1. Groups from subscriptions with explicit groupId
    data.subscriptions.forEach((subscription) => {
      if (!subscription.groupId) {
        return;
      }

      const schedule = data.schedulesById[subscription.groupId];
      if (!schedule || seenScheduleIds.has(schedule.id)) {
        return;
      }

      seenScheduleIds.add(schedule.id);

      rows.push({
        key: schedule.id,
        groupName: schedule.name,
        courseName: subscription.courseId
          ? data.coursesById[subscription.courseId]?.name || 'Неизвестный курс'
          : 'Без курса',
        daysText: formatScheduleDays(schedule.daysOfWeek),
        timeText: formatScheduleTimeRange(schedule.startTime, schedule.endTime),
        periodText: formatSchedulePeriod(schedule.startDate, schedule.endDate),
        statusText: SUBSCRIPTION_STATUS_LABELS[subscription.status] || 'Активна запись',
        startDate: schedule.startDate,
        startTime: schedule.startTime,
      });
    });

    // 2. Groups from course enrollments
    data.courseEnrollments
      .filter((enrollment) => enrollment.enrollmentStatus === 'ACTIVE')
      .forEach((enrollment) => {
        const courseSchedules = data.courseSchedulesById[enrollment.courseId] ?? [];

        courseSchedules.forEach((schedule) => {
          if (seenScheduleIds.has(schedule.id)) {
            return;
          }

          seenScheduleIds.add(schedule.id);

          rows.push({
            key: `${enrollment.courseId}-${schedule.id}`,
            groupName: schedule.name,
            courseName: enrollment.courseName || data.coursesById[enrollment.courseId]?.name || 'Неизвестный курс',
            daysText: formatScheduleDays(schedule.daysOfWeek),
            timeText: formatScheduleTimeRange(schedule.startTime, schedule.endTime),
            periodText: formatSchedulePeriod(schedule.startDate, schedule.endDate),
            statusText: enrollment.enrollmentStatus === 'ACTIVE' ? 'Активна запись' : 'Удалена запись',
            startDate: schedule.startDate,
            startTime: schedule.startTime,
          });
        });
      });

    // 3. Fallback: all courses from subscriptions or payment history
    const allCourseIds = new Set<string>();
    data.subscriptions.forEach((sub) => {
      if (sub.courseId && (sub.status === 'ACTIVE' || !sub.status)) allCourseIds.add(sub.courseId);
    });
    if (data.paymentHistory?.subscriptions) {
      data.paymentHistory.subscriptions.forEach((sub) => {
        if (sub.courseId && sub.subscriptionStatus === 'ACTIVE') allCourseIds.add(sub.courseId);
      });
    }

    allCourseIds.forEach((courseId) => {
      const courseSchedules = data.courseSchedulesById[courseId] ?? [];
      courseSchedules.forEach((schedule) => {
        if (seenScheduleIds.has(schedule.id)) return;
        seenScheduleIds.add(schedule.id);
        rows.push({
          key: `${courseId}-${schedule.id}`,
          groupName: schedule.name,
          courseName: data.coursesById[courseId]?.name || 'Курс обучения',
          daysText: formatScheduleDays(schedule.daysOfWeek),
          timeText: formatScheduleTimeRange(schedule.startTime, schedule.endTime),
          periodText: formatSchedulePeriod(schedule.startDate, schedule.endDate),
          statusText: 'Активен',
          startDate: schedule.startDate || '',
          startTime: schedule.startTime || '',
        });
      });
    });

    return rows
      .sort((left, right) => (left.startDate || '').localeCompare(right.startDate || '') || (left.startTime || '').localeCompare(right.startTime || ''))
      .map(({ key, groupName, courseName, daysText, timeText, periodText, statusText }) => ({
        key,
        groupName,
        courseName,
        daysText,
        timeText,
        periodText,
        statusText,
      }));
  }, [data]);

  const groupsCount = useMemo(() => {
    if (!data) {
      return 0;
    }

    return studentScheduleRows.length;
  }, [data, studentScheduleRows]);

  const paymentRows = useMemo(() => {
    if (!data?.paymentHistory) {
      return [] as Array<{
        id: string;
        paidAt: string;
        paymentMonth: string;
        amount: number;
        method: StudentPaymentDto['method'];
        notes: string | null;
        subscriptionId: string;
        courseName: string;
        groupName: string;
        paymentScope?: StudentPaymentDto['paymentScope'];
        deleted?: boolean;
        deletedBy?: string | null;
        deletedAt?: string | null;
      }>;
    }

    const rows: Array<{
      id: string;
      paidAt: string;
      paymentMonth: string;
      amount: number;
      method: StudentPaymentDto['method'];
      notes: string | null;
      subscriptionId: string;
      courseId?: string | null;
      courseName: string;
      groupId?: string | null;
      groupName: string;
      cashierName?: string | null;
      paymentScope?: StudentPaymentDto['paymentScope'];
      deleted?: boolean;
      deletedBy?: string | null;
      deletedAt?: string | null;
    }> = [];

    const seenIds = new Set<string>();

    data.paymentHistory.subscriptions.forEach((subscriptionSummary) => {
      const matchedSubscription = data.subscriptions.find(
        (subscription) => subscription.id === subscriptionSummary.subscriptionId
      );

      const courseId = matchedSubscription?.courseId || subscriptionSummary.courseId || null;
      const courseName = courseId
        ? data.coursesById[courseId]?.name || 'Неизвестный курс'
        : 'Без курса';

      const groupId = matchedSubscription?.groupId || null;
      const groupName = groupId
        ? data.schedulesById[groupId]?.name || 'Удаленная группа'
        : 'Без группы';

      subscriptionSummary.months.forEach((month) => {
        month.payments.forEach((payment) => {
          if (!seenIds.has(payment.id)) {
            seenIds.add(payment.id);
            rows.push({
              id: payment.id,
              paidAt: payment.paidAt,
              paymentMonth: payment.paymentMonth,
              amount: payment.amount,
              method: payment.method,
              notes: payment.notes,
              subscriptionId: payment.subscriptionId,
              courseId,
              courseName,
              groupId,
              groupName,
              cashierName: (payment as any).cashierName || null,
              paymentScope: payment.paymentScope,
            });
          }
        });
      });
    });

    if (data.paymentHistory.balancePayments) {
      data.paymentHistory.balancePayments.forEach((payment) => {
        if (!seenIds.has(payment.id)) {
          seenIds.add(payment.id);
          rows.push({
            id: payment.id,
            paidAt: payment.paidAt,
            paymentMonth: payment.paymentMonth,
            amount: payment.amount,
            method: payment.method,
            notes: payment.notes,
            subscriptionId: payment.subscriptionId || '',
            courseId: null,
            courseName: 'Оплата / Баланс',
            groupId: null,
            groupName: '—',
            cashierName: (payment as any).cashierName || null,
            paymentScope: payment.paymentScope,
          });
        }
      });
    }

    if (data.paymentHistory.deletedPayments) {
      data.paymentHistory.deletedPayments.forEach((payment) => {
        if (seenIds.has(payment.id)) return;
        seenIds.add(payment.id);
        const matchedSubscription = payment.subscriptionId
          ? data.subscriptions.find((subscription) => subscription.id === payment.subscriptionId)
          : undefined;
        const courseId = matchedSubscription?.courseId || null;
        const groupId = matchedSubscription?.groupId || null;
        rows.push({
          id: payment.id,
          paidAt: payment.paidAt,
          paymentMonth: payment.paymentMonth,
          amount: payment.amount,
          method: payment.method,
          notes: payment.notes,
          subscriptionId: payment.subscriptionId || '',
          courseId,
          courseName: courseId ? data.coursesById[courseId]?.name || 'Неизвестный курс' : 'Оплата / Баланс',
          groupId,
          groupName: groupId ? data.schedulesById[groupId]?.name || 'Удаленная группа' : '—',
          cashierName: payment.cashierName || null,
          paymentScope: payment.paymentScope,
          deleted: true,
          deletedBy: payment.deletedBy,
          deletedAt: payment.deletedAt,
        });
      });
    }

    return rows.sort((left, right) => compareIsoDateDesc(left.paidAt, right.paidAt));
  }, [data]);

  const attendanceRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        status: AttendanceDto['status'];
        lessonDate: string;
        lessonTime: string;
        groupName: string;
        markedAt: string;
        charge: StudentAttendanceChargeDto | null;
      }>;
    }

    const chargeByLesson = new Map(
      data.attendanceCharges.filter((charge) => charge.lessonId).map((charge) => [charge.lessonId as string, charge])
    );

    return data.attendanceHistory
      .map((row) => {
        const lesson = data.lessonsById[row.lessonId];
        const charge = chargeByLesson.get(row.lessonId) ?? null;

        const lessonDate = lesson?.lessonDate || charge?.lessonDate || '';
        const lessonTime = lesson ? `${lesson.startTime.slice(0, 5)} - ${lesson.endTime.slice(0, 5)}` : '—';
        const groupId = lesson?.groupId || null;
        const groupName = lesson?.groupId
          ? data.schedulesById[lesson.groupId]?.name || 'Удаленная группа'
          : charge?.groupName || 'Не указана';

        return {
          id: row.id,
          status: row.status,
          lessonDate,
          lessonTime,
          groupId,
          groupName,
          markedAt: row.updatedAt || row.createdAt,
          charge,
        };
      })
      .sort((left, right) => {
        const leftDate = left.lessonDate || left.markedAt;
        const rightDate = right.lessonDate || right.markedAt;
        return compareIsoDateDesc(leftDate, rightDate);
      });
  }, [data]);

  const attendanceChargeTotal = useMemo(
    () => attendanceRows.reduce((sum, row) => sum + (row.charge?.billable ? row.charge.chargedAmount : 0), 0),
    [attendanceRows]
  );

  const selectedSubscription = useMemo(
    () => data?.subscriptions.find((subscription) => subscription.id === paymentForm.subscriptionId) ?? null,
    [data, paymentForm.subscriptionId]
  );

  const payableSubscriptions = useMemo(() => {
    if (!data) return [] as SubscriptionDto[];
    return data.subscriptions.filter((subscription) => {
      const summary = data.paymentHistory?.subscriptions.find((s) => s.subscriptionId === subscription.id);
      // The payment summary may carry a fresher status than the subscription list.
      const isClosed =
        CLOSED_SUBSCRIPTION_STATUSES.includes(subscription.status) ||
        (summary?.subscriptionStatus ? CLOSED_SUBSCRIPTION_STATUSES.includes(summary.subscriptionStatus) : false);
      return !isClosed || subscriptionSummaryHasDebt(summary);
    });
  }, [data]);

  const openPaymentModal = () => {
    const firstSubscription = payableSubscriptions[0] ?? null;
    const subSummary = data?.paymentHistory?.subscriptions.find(
      (s) => s.subscriptionId === firstSubscription?.id
    );
    let defaultAmount = 4500;
    if (subSummary?.monthlyExpected && subSummary.monthlyExpected > 0) {
      defaultAmount = subSummary.monthlyExpected;
    } else if (firstSubscription?.amount) {
      defaultAmount = firstSubscription.amount >= 10000 ? Math.round(firstSubscription.amount / 12) : firstSubscription.amount;
    }

    setPaymentForm((previous) => ({
      ...previous,
      subscriptionId: firstSubscription?.id || BALANCE_ONLY,
      clientReference: newClientReference(),
      amount: String(defaultAmount),
      paidAt: new Date().toISOString().slice(0, 10),
      paymentMonth: new Date().toISOString().slice(0, 7),
      method: 'CASH',
      notes: '',
    }));
    setIsPaymentModalOpen(true);
  };

  const handleSaveStudent = async (payload: CreateStudentRequest | UpdateStudentRequest) => {
    if (!studentId) {
      return;
    }

    await updateStudentMutation.mutate({
      id: studentId,
      data: payload as UpdateStudentRequest,
    });

    setIsEditModalOpen(false);
    await refetch();
  };

  const handleDeleteStudent = async () => {
    if (!studentId || !confirm('Вы уверены, что хотите удалить ученика?')) {
      return;
    }

    await deleteStudentMutation.mutate(studentId);
    router.push('/students');
  };

  const handleTransferStudent = async () => {
    if (!studentId || !targetBranchId) {
      return;
    }

    await transferStudentMutation.mutate({ id: studentId, branchId: targetBranchId });
    setIsTransferBranchModalOpen(false);
    router.push('/students');
  };

  const openAddBranchModal = () => {
    setAddBranchId(addableBranches[0]?.id ?? '');
    setIsAddBranchModalOpen(true);
  };

  const handleAddToBranch = async () => {
    if (!studentId || !addBranchId) return;
    try {
      await addToBranchMutation.mutate({ id: studentId, branchId: addBranchId });
    } catch {
      // The API error is already shown by the global toast; keep the modal open.
      return;
    }
    const branchName = (branchesResponse ?? []).find((branch) => branch.id === addBranchId)?.name;
    pushToast({ message: branchName ? `Ученик добавлен в филиал «${branchName}»` : 'Ученик добавлен в филиал', tone: 'success' });
    setIsAddBranchModalOpen(false);
    await refetch();
  };

  const handleReturnToGroup = async () => {
    if (!studentId || !returnToGroupModal?.groupId || !returnToGroupModal.fromDate) return;
    try {
      await returnToGroupMutation.mutate({
        id: studentId,
        groupId: returnToGroupModal.groupId,
        fromDate: returnToGroupModal.fromDate,
      });
    } catch (err) {
      pushToast({ message: getErrorMessage(err, 'Не удалось вернуть ученика в группу'), tone: 'error' });
      return;
    }
    pushToast({
      message: `Ученик возвращён в «${returnToGroupModal.label}» с ${formatDate(returnToGroupModal.fromDate)}`,
      tone: 'success',
    });
    setReturnToGroupModal(null);
    await refetch();
  };

  const handleCreatePayment = async () => {
    if (!studentId || !paymentForm.subscriptionId) {
      return;
    }

    const parsedAmount = Number(paymentForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    await createPaymentMutation.mutate({
      studentId,
      subscriptionId: paymentForm.subscriptionId === BALANCE_ONLY ? undefined : paymentForm.subscriptionId,
      clientReference: paymentForm.clientReference || undefined,
      amount: parsedAmount,
      paidAt: paymentForm.paidAt,
      paymentMonth: paymentForm.paymentMonth,
      method: paymentForm.method,
      notes: paymentForm.notes.trim() || undefined,
    });

    setIsPaymentModalOpen(false);
    await refetch();
  };

  const openRefundModal = () => {
    const available = data?.paymentHistory?.studentBalance ?? 0;
    setRefundForm({
      amount: available > 0 ? String(available) : '',
      refundDate: new Date().toISOString().slice(0, 10),
      method: 'CASH',
      notes: '',
    });
    setIsRefundModalOpen(true);
  };

  const handleRefundBalance = async () => {
    if (!studentId) return;
    const amount = Number(refundForm.amount);
    const available = Math.max(data?.paymentHistory?.studentBalance ?? 0, 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushToast({ message: 'Введите корректную сумму возврата', tone: 'error' });
      return;
    }
    if (amount > available) {
      pushToast({ message: `Сумма возврата превышает доступную сумму (максимум: ${formatMoney(available)})`, tone: 'error' });
      return;
    }
    try {
      await refundBalanceMutation.mutate({
        studentId,
        amount,
        refundDate: refundForm.refundDate,
        method: refundForm.method,
        notes: refundForm.notes.trim() || undefined,
      });
    } catch (err) {
      pushToast({ message: getErrorMessage(err, 'Не удалось выполнить возврат'), tone: 'error' });
      return;
    }
    setIsRefundModalOpen(false);
    await refetch();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Удалить эту оплату? Действие будет видно в истории (кто и когда удалил).')) return;
    try {
      await deletePaymentMutation.mutate(paymentId);
    } catch (err) {
      pushToast({ message: getErrorMessage(err, 'Не удалось удалить оплату'), tone: 'error' });
      return;
    }
    await refetch();
  };

  const handleUpdateEnrollmentDate = async () => {
    if (!studentId || !enrollmentDateModal?.startDate) return;
    await updateEnrollmentDateMutation.mutate({
      courseId: enrollmentDateModal.enrollment.courseId,
      studentId,
      startDate: enrollmentDateModal.startDate,
    });
    setEnrollmentDateModal(null);
    await refetch();
  };

  const CALL_RESULTS = [
    { value: 'NO_ANSWER', label: 'Не отвечает', color: 'border-rose-200 bg-rose-50 text-rose-700' },
    { value: 'BUSY', label: 'Занято', color: 'border-orange-200 bg-orange-50 text-orange-700' },
    { value: 'CALLBACK', label: 'Перезвонить', color: 'border-amber-200 bg-amber-50 text-amber-700' },
    { value: 'SUCCESS', label: 'Успешно', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { value: 'INTERESTED', label: 'Заинтересован', color: 'border-sky-200 bg-sky-50 text-sky-700' },
    { value: 'NOT_INTERESTED', label: 'Не заинтересован', color: 'border-slate-200 bg-slate-50 text-slate-600' },
    { value: 'OTHER', label: 'Другое', color: 'border-gray-200 bg-gray-50 text-gray-600' },
  ] as const;

  const openAddCallLog = () => {
    setEditingCallLog(null);
    setCallLogForm({
      callDate: new Date().toISOString().slice(0, 10),
      callTime: new Date().toTimeString().slice(0, 5),
      callResult: '',
      notes: '',
      followUpRequired: false,
      followUpDate: '',
      updateReason: '',
    });
    setIsCallLogModalOpen(true);
  };

  const openEditCallLog = (log: StudentCallLogDto) => {
    setEditingCallLog(log);
    setCallLogForm({
      callDate: log.callDate,
      callTime: log.callTime,
      callResult: log.callResult || '',
      notes: log.notes || '',
      followUpRequired: log.followUpRequired,
      followUpDate: log.followUpDate || '',
      updateReason: '',
    });
    setIsCallLogModalOpen(true);
  };

  const handleSaveCallLog = async () => {
    if (!studentId || !callLogForm.callDate || !callLogForm.callTime) {
      return;
    }

    const payload: SaveStudentCallLogRequest = {
      studentId,
      callerStaffId: currentStaffId ?? undefined,
      callDate: callLogForm.callDate,
      callTime: callLogForm.callTime,
      callResult: callLogForm.callResult || undefined,
      notes: callLogForm.notes || undefined,
      followUpRequired: callLogForm.followUpRequired,
      followUpDate: callLogForm.followUpDate || undefined,
    };

    if (editingCallLog) {
      // For edits: close main modal, open reason modal
      setPendingCallLogPayload({ id: editingCallLog.id, data: payload });
      setIsCallLogModalOpen(false);
      setIsCallLogReasonModalOpen(true);
    } else {
      await createCallLogMutation.mutate(payload);
      setIsCallLogModalOpen(false);
      await refetch();
    }
  };

  const handleConfirmCallLogReason = async () => {
    if (!pendingCallLogPayload) return;
    await updateCallLogMutation.mutate({
      id: pendingCallLogPayload.id,
      data: { ...pendingCallLogPayload.data, updateReason: callLogForm.updateReason || undefined },
    });
    setIsCallLogReasonModalOpen(false);
    setPendingCallLogPayload(null);
    await refetch();
  };

  const handleDeleteCallLog = async (logId: string) => {
    const reason = prompt('Укажите причину удаления:');
    if (!reason?.trim()) {
      return;
    }

    await deleteCallLogMutation.mutate({ id: logId, reason: reason.trim() });
    await refetch();
  };

  if (!studentId) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/students')}>
          Назад к ученикам
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Не удалось определить ID ученика.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/students')}>
          Назад к ученикам
        </Button>
        <div className="crm-surface flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isNotFound = error?.toLowerCase().includes('not found') || error?.toLowerCase().includes('не найден');
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/students')}>
          Назад к ученикам
        </Button>
        <div className="crm-surface space-y-4 p-6">
          <p className="text-sm font-medium text-red-600">
            {isNotFound
              ? 'Ученик не найден или был удалён из системы.'
              : error || 'Не удалось загрузить карточку ученика.'}
          </p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      </div>
    );
  }

  const displayName = getStudentDisplayName(data.student);
  const primaryPhone = getPrimaryPhone(data.student);
  const messengerPhone = primaryPhone ? normalizePhoneForMessenger(primaryPhone) : '';
  const whatsappUrl = messengerPhone ? `https://wa.me/${messengerPhone}` : null;
  const telegramUrl = messengerPhone ? `tg://resolve?phone=${messengerPhone}` : null;

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/students')}>
        Назад к ученикам
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="h-20 w-20 rounded-full border border-gray-200 object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
                <User className="h-7 w-7" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-[#1f2530]">{displayName}</h1>

                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Открыть WhatsApp: ${primaryPhone}`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#dbe2e8] bg-white p-1 transition-colors hover:bg-[#eefaf1]"
                  >
                    <img src="/logo/whatsapp.svg" alt="WhatsApp" className="h-4 w-4" />
                  </a>
                ) : null}

                {telegramUrl ? (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Открыть Telegram: ${primaryPhone}`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#dbe2e8] bg-white p-1 transition-colors hover:bg-[#eef5ff]"
                  >
                    <img src="/logo/telegram.svg" alt="Telegram" className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#7f8794]">{data.student.parentName || 'Родитель не указан'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STUDENT_STATUS_COLORS[data.student.status]}`}
                >
                  {STUDENT_STATUS_LABELS[data.student.status]}
                </span>
                <span className="rounded-lg border border-[#dbe2e8] bg-white px-2.5 py-1 text-xs font-medium text-[#5a6576]">
                  {data.student.gender ? STUDENT_GENDER_LABELS[data.student.gender] : 'Пол не указан'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid min-w-60 grid-cols-1 gap-1.5 text-sm text-[#586272]">
            <div>
              <span className="text-[#8a93a3]">Телефон ученика:</span> {data.student.studentPhone || data.student.phone || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Email:</span> {data.student.email || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Дата рождения:</span> {formatDate(data.student.birthDate)}
            </div>
            <div className="pt-1 text-xs border-t border-[#f0f3f6]">
              <span className="text-[#8a93a3]">Создал(а):</span>{' '}
              <span className="font-medium text-[#374151]">{data.student.createdByName || data.student.createdBy || 'Администратор'}</span>
              {data.student.createdAt ? <span className="text-[#9ca3af]"> · {formatDate(data.student.createdAt)}</span> : null}
            </div>
            {data.student.updatedAt && (
              <div className="text-xs">
                <span className="text-[#8a93a3]">Изменил(а):</span>{' '}
                <span className="font-medium text-[#374151]">{data.student.updatedByName || data.student.updatedBy || 'Администратор'}</span>
                <span className="text-[#9ca3af]"> · {formatDate(data.student.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Начало действия</p>
            <p className="mt-1 text-lg font-semibold text-blue-900">{formatDate(currentEnrollmentStart)}</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Группы</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{groupsCount}</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Посещений</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{attendanceStats.present} / {attendanceStats.total}</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Посещаемость</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">{attendanceStats.rate}%</p>
          </div>
          <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Долг / оплачено</p>
            <p className="mt-1 text-lg font-semibold text-[#1f2530]">
              <span className={data.paymentHistory?.totalDebt ? 'text-rose-600' : 'text-[#1f2530]'}>
                {formatMoney(data.paymentHistory?.totalDebt ?? 0)}
              </span>
              {' / '}
              <span className="text-emerald-600">
                {formatMoney(data.paymentHistory?.totalPaid ?? 0)}
              </span>
            </p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${
            (data.paymentHistory?.studentBalance ?? 0) > 0
              ? 'border-emerald-300 bg-emerald-50/80 shadow-sm'
              : 'border-[#e7edf3] bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-medium uppercase tracking-wide ${
                (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-800' : 'text-[#8a93a3]'
              }`}>Баланс (Аванс)</p>
              <Wallet className={`h-4 w-4 ${
                (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-600' : 'text-[#8a93a3]'
              }`} />
            </div>
            <p className={`mt-1 text-lg font-bold ${
              (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-700' : 'text-[#1f2530]'
            }`}>
              {formatMoney(data.paymentHistory?.studentBalance ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e6ebf0] pt-4">
          <Button
            variant="secondary"
            icon={Edit2}
            onClick={() => setIsEditModalOpen(true)}
            disabled={updateStudentMutation.loading || deleteStudentMutation.loading}
          >
            Редактировать
          </Button>
          {transferBranches.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() => setIsTransferBranchModalOpen(true)}
              disabled={transferStudentMutation.loading}
            >
              Перевести в филиал
            </Button>
          ) : null}
          {addableBranches.length > 0 ? (
            <Button
              variant="secondary"
              icon={Building2}
              onClick={openAddBranchModal}
              disabled={addToBranchMutation.loading}
            >
              Добавить в филиал
            </Button>
          ) : null}
          <Button
            variant="secondary"
            icon={PlusCircle}
            onClick={openPaymentModal}
            disabled={createPaymentMutation.loading || data.subscriptions.length === 0}
          >
            Добавить оплату
          </Button>
          <Button
            variant="secondary"
            icon={Undo2}
            onClick={openRefundModal}
            disabled={refundBalanceMutation.loading}
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            Сделать возврат
          </Button>
          <Button
            variant="secondary"
            icon={Phone}
            onClick={openAddCallLog}
            disabled={createCallLogMutation.loading}
          >
            Добавить звонок
          </Button>
          <Button
            variant="ghost"
            icon={Trash2}
            onClick={() => void handleDeleteStudent()}
            disabled={deleteStudentMutation.loading}
          >
            {deleteStudentMutation.loading ? 'Удаляем...' : 'Удалить'}
          </Button>
          {data.subscriptions.length === 0 ? (
            <span className="text-xs text-[#8a93a3]">Оплата недоступна: у студента нет абонементов</span>
          ) : null}
        </div>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={profileTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as StudentProfileTab)}
          className="w-fit"
          aria-label="Вкладки карточки ученика"
        />
      </div>

      {activeTab === 'profile' && (
        <div className="crm-surface space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Родитель</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.parentName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Телефон родителя</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.parentPhone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Город</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.city || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Школа</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.school || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Класс</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.grade || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Лояльность</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.loyalty || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Скидка</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">
                {data.student.discountPercent != null && data.student.discountPercent > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-emerald-700">
                    {data.student.discountPercent}%
                  </span>
                ) : data.student.discount || '—'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Адрес</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#273142]">{data.student.address || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Дополнительная информация</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#273142]">{data.student.additionalInfo || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Комментарий / заметки</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#273142]">
              {data.student.comment || data.student.notes || '—'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <GraduationCap className="mr-2 inline h-4 w-4" />
              Групп/абонементов: <span className="font-semibold text-gray-900">{data.subscriptions.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Курс</th>
                  <th className="crm-table-th">Начало действия</th>
                  <th className="crm-table-th">Кто добавил</th>
                  <th className="crm-table-th">Уроки</th>
                  <th className="crm-table-th">Сумма</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th text-right">Скидка</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {data.subscriptions.length > 0 ? (
                  data.subscriptions.map((subscription, index) => {
                    const enrollment = subscription.courseId
                      ? latestEnrollmentByCourseId.get(subscription.courseId)
                      : undefined;

                    return (
                      <tr key={subscription.id} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
<td className="crm-table-cell">
                          {subscription.courseId ? (
                            <Link
                              href="/classes"
                              className="font-medium text-[#202938] transition-colors hover:text-[#3568eb] hover:underline"
                            >
                              {data.coursesById[subscription.courseId]?.name || 'Неизвестный курс'}
                            </Link>
                          ) : (
                            'Без курса'
                          )}
                          {subscription.groupId && data.schedulesById[subscription.groupId] && (
                            <div>
                              <Link
                                href={`/classes/${subscription.groupId}`}
                                className="text-xs text-[#8a93a3] transition-colors hover:text-[#3568eb] hover:underline"
                              >
                                {data.schedulesById[subscription.groupId].name}
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-[#273142]">
                                {formatDate(enrollment?.enrolledAt || subscription.startDate)}
                              </div>
                              <div className="text-xs text-[#8a93a3]">
                                {enrollment?.removedAt ? `до ${formatDate(enrollment.removedAt)}` : 'без даты окончания'}
                              </div>
                              {enrollment?.updatedByName || enrollment?.updatedBy ? (
                                <div className="text-xs text-[#b3bac6]">
                                  Изменил: {enrollment.updatedByName || enrollment.updatedBy}
                                </div>
                              ) : null}
                            </div>
                            {enrollment?.enrollmentStatus === 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => setEnrollmentDateModal({
                                  enrollment,
                                  startDate: enrollment.enrolledAt.slice(0, 10),
                                })}
                                className="rounded-md p-1 text-[#8a93a3] transition-colors hover:bg-[#edf3ff] hover:text-[#3568eb]"
                                title="Изменить начало действия"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="crm-table-cell">
                          <div className="text-sm font-medium text-[#374151]">
                            {enrollment?.createdByName || enrollment?.createdBy || 'Администратор'}
                          </div>
                          <div className="text-xs text-[#8a93a3]">
                            {formatDateTime(enrollment?.createdAt)}
                          </div>
                        </td>
                        <td className="crm-table-cell">
                          {subscription.lessonsLeft} / {subscription.totalLessons}
                        </td>
                        <td className="crm-table-cell">
                          {(() => {
                            const subSummary = data.paymentHistory?.subscriptions.find(
                              (s) => s.subscriptionId === subscription.id
                            );
                            if (subSummary?.monthlyExpected && subSummary.totalAmount && subSummary.totalAmount > subSummary.monthlyExpected) {
                              return (
                                <div>
                                  <div className="font-medium text-[#202938]">{formatMoney(subSummary.monthlyExpected)} <span className="text-xs text-[#8a93a3]">/ мес</span></div>
                                  <div className="text-xs text-[#8a93a3]">Всего: {formatMoney(subscription.amount)}</div>
                                </div>
                              );
                            }
                            return <span>{formatMoney(subscription.amount)}</span>;
                          })()}
                        </td>
                        <td className="crm-table-cell">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}
                          >
                            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                          </span>
                          {(() => {
                            // Group = schedule when the subscription has one, otherwise the course itself.
                            const returnGroupId = subscription.groupId || subscription.courseId;
                            if (!returnGroupId) return null;
                            const isWithdrawn =
                              (enrollment ? WITHDRAWN_ENROLLMENT_STATUSES.has(enrollment.enrollmentStatus) : false) ||
                              (subscription.status === 'EXPIRED' && Boolean(subscription.courseId));
                            const isActiveElsewhere =
                              activeCourseOrGroupIds.has(returnGroupId) ||
                              (subscription.courseId ? activeCourseOrGroupIds.has(subscription.courseId) : false);
                            if (!isWithdrawn || isActiveElsewhere) return null;
                            const label =
                              (subscription.groupId ? data.schedulesById[subscription.groupId]?.name : null) ||
                              (subscription.courseId ? data.coursesById[subscription.courseId]?.name : null) ||
                              'группу';
                            return (
                              <div className="mt-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={RotateCcw}
                                  onClick={() => setReturnToGroupModal({
                                    groupId: returnGroupId,
                                    label,
                                    fromDate: todayIsoDate(),
                                  })}
                                  disabled={returnToGroupMutation.loading}
                                >
                                  Вернуть в группу с даты
                                </Button>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="crm-table-cell text-right">
                          {subscription.courseId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={Edit2}
                              onClick={() => setDiscountModal({
                                isOpen: true,
                                subscriptionId: subscription.id,
                                courseId: subscription.courseId,
                                courseName: data.coursesById[subscription.courseId]?.name || 'Курс',
                                discountPercent: subscription.discountPercent ?? 0,
                                discountAmount: subscription.discountAmount?.toString() || '',
                                discountFromMonth: subscription.discountFromMonth || '',
                                discountToMonth: subscription.discountToMonth || '',
                                salaryDiscountMode: subscription.salaryDiscountMode || 'FULL_PRICE',
                              })}
                            >
                              Скидка
                            </Button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      У студента пока нет активных групп или абонементов
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
              Расписание ученика: <span className="font-semibold text-gray-900">{studentScheduleRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Группа</th>
                  <th className="crm-table-th">Курс</th>
                  <th className="crm-table-th">Дни</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {studentScheduleRows.length > 0 ? (
                  studentScheduleRows.map((row, index) => (
                    <tr key={row.key} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">
                        <Link
                          href={`/classes/${row.key}`}
                          className="font-medium text-[#273142] transition-colors hover:text-[#3568eb] hover:underline"
                        >
                          {row.groupName}
                        </Link>
                      </td>
                      <td className="crm-table-cell">
                        <Link
                          href="/classes"
                          className="text-sm text-[#586272] transition-colors hover:text-[#3568eb] hover:underline"
                        >
                          {row.courseName}
                        </Link>
                      </td>
                      <td className="crm-table-cell">{row.daysText}</td>
                      <td className="crm-table-cell">{row.timeText}</td>
                      <td className="crm-table-cell">{row.periodText}</td>
                      <td className="crm-table-cell">{row.statusText}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={8} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Для ученика пока не найдено расписаний
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <CalendarCheck2 className="mr-2 inline h-4 w-4" />
              Записей посещаемости: <span className="font-semibold text-gray-900">{attendanceRows.length}</span>
            </p>
            <p className="text-sm font-medium text-gray-700">
              Начислено за занятия:{' '}
              <span className="font-semibold text-[#1f2530]">{formatMoney(attendanceChargeTotal)}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Дата занятия</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Группа</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Начислено</th>
                  <th className="crm-table-th">Расчёт</th>
                  <th className="crm-table-th">Отмечено</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {attendanceRows.length > 0 ? (
                  attendanceRows.map((row, index) => (
                    <tr key={row.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">{row.lessonDate ? formatDate(row.lessonDate) : '—'}</td>
                      <td className="crm-table-cell">{row.lessonTime}</td>
                      <td className="crm-table-cell">
                        {row.groupId ? (
                          <Link
                            href={`/classes/${row.groupId}`}
                            className="font-medium text-[#273142] transition-colors hover:text-[#3568eb] hover:underline"
                          >
                            {row.groupName}
                          </Link>
                        ) : (
                          row.groupName
                        )}
                      </td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${ATTENDANCE_STATUS_COLORS[row.status]}`}
                        >
                          {ATTENDANCE_STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">
                        {row.charge && row.charge.billable ? (
                          <span className="font-semibold text-[#1f2530]">{formatMoney(row.charge.chargedAmount)}</span>
                        ) : (
                          <span className="text-[#8a93a3]">—</span>
                        )}
                      </td>
                      <td className="crm-table-cell text-xs text-[#6b7686]">
                        {row.charge
                          ? row.charge.billable
                            ? row.charge.splitCount && row.charge.splitCount > 1
                              ? `${formatMoney(row.charge.lessonPrice)} ÷ ${row.charge.splitCount} уч.`
                              : `Стоимость занятия ${formatMoney(row.charge.lessonPrice)}`
                            : row.charge.note || 'Оплата не начисляется'
                          : '—'}
                      </td>
                      <td className="crm-table-cell">{formatDateTime(row.markedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={8} className="crm-table-cell py-10 text-center text-sm">
                      {studentScheduleRows.length > 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-gray-600">
                          <p className="font-semibold text-gray-800">
                            Ученик записан в группы: {studentScheduleRows.map((r) => r.groupName).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Занятия начнутся по расписанию ({studentScheduleRows[0]?.daysText || ''} {studentScheduleRows[0]?.timeText || ''}).
                            Отметки посещаемости появятся сразу после первого проведенного урока.
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#8a93a3]">История посещаемости отсутствует</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="crm-surface p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-xl border px-4 py-3.5 ${
                (data.paymentHistory?.studentBalance ?? 0) > 0
                  ? 'border-emerald-300 bg-emerald-50/90 shadow-sm'
                  : 'border-[#e7edf3] bg-white'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${
                    (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-800' : 'text-[#8a93a3]'
                  }`}>
                    Баланс ученика (Аванс)
                  </p>
                  <Wallet className={`h-4 w-4 ${
                    (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-600' : 'text-[#8a93a3]'
                  }`} />
                </div>
                <p className={`mt-1.5 text-xl font-bold ${
                  (data.paymentHistory?.studentBalance ?? 0) > 0 ? 'text-emerald-700' : 'text-[#1f2530]'
                }`}>
                  {formatMoney(data.paymentHistory?.studentBalance ?? 0)}
                </p>
                {(data.paymentHistory?.studentBalance ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-emerald-700 font-medium">Доступно для списания в счёт курсов</p>
                )}
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Оплачено всего</p>
                <p className="mt-1.5 text-xl font-semibold text-emerald-700">{formatMoney(data.paymentHistory?.totalPaid ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Общий долг</p>
                <p className={`mt-1.5 text-xl font-semibold ${(data.paymentHistory?.totalDebt ?? 0) > 0 ? 'text-rose-600' : 'text-[#1f2530]'}`}>
                  {formatMoney(data.paymentHistory?.totalDebt ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Платежей</p>
                <p className="mt-1.5 text-xl font-semibold text-[#1f2530]">{paymentRows.length}</p>
              </div>
            </div>
          </div>

          {/* Subscription summary — always show if there are subscriptions in payment history */}
          {data.paymentHistory && data.paymentHistory.subscriptions.length > 0 && (
            <div className="crm-table-wrap overflow-hidden">
              <div className="border-b border-[#e6ebf0] px-6 py-4">
                <p className="text-sm font-medium text-gray-700">Абонементы</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="crm-table-head">
                    <tr>
                      <th className="crm-table-th">Курс</th>
                      <th className="crm-table-th">Период</th>
                      <th className="crm-table-th">Статус</th>
                      <th className="crm-table-th">Скидка</th>
                      <th className="crm-table-th">Ежемесячно</th>
                      <th className="crm-table-th">Оплачено</th>
                      <th className="crm-table-th">Долг</th>
                    </tr>
                  </thead>
                  <tbody className="crm-table-body">
                    {data.paymentHistory.subscriptions.map((sub) => {
                      const courseName = sub.courseId
                        ? data.coursesById[sub.courseId]?.name || 'Неизвестный курс'
                        : 'Без курса';
                      const statusColors: Record<string, string> = {
                        ACTIVE: 'border-green-200 bg-green-100 text-green-700',
                        EXPIRED: 'border-gray-200 bg-gray-100 text-gray-700',
                        CANCELLED: 'border-red-200 bg-red-100 text-red-700',
                        FROZEN: 'border-sky-200 bg-sky-100 text-sky-700',
                      };
                      const statusLabels: Record<string, string> = {
                        ACTIVE: 'Активен', EXPIRED: 'Истек', CANCELLED: 'Отменен', FROZEN: 'Заморожен',
                      };
                      const salaryDiscountMode = data.subscriptions.find((item) => item.id === sub.subscriptionId)?.salaryDiscountMode || 'FULL_PRICE';
                      const expanded = expandedSubscriptions.has(sub.subscriptionId);
                      const toggleExpanded = () =>
                        setExpandedSubscriptions((prev) => {
                          const next = new Set(prev);
                          if (next.has(sub.subscriptionId)) next.delete(sub.subscriptionId);
                          else next.add(sub.subscriptionId);
                          return next;
                        });
                      return (
                        <Fragment key={sub.subscriptionId}>
                        <tr className="crm-table-row">
                          <td className="crm-table-cell font-medium text-[#202938]">
                            <button
                              type="button"
                              onClick={toggleExpanded}
                              className="inline-flex items-center gap-1.5 text-left hover:text-[#467aff]"
                              title="Показать по месяцам"
                            >
                              {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              {courseName}
                            </button>
                          </td>
                          <td className="crm-table-cell text-sm text-[#667085]">
                            {formatDate(sub.startDate)} — {sub.endDate ? formatDate(sub.endDate) : 'бессрочно'}
                          </td>
                          <td className="crm-table-cell">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusColors[sub.subscriptionStatus] || 'border-gray-200 bg-gray-100 text-gray-700'}`}>
                              {statusLabels[sub.subscriptionStatus] || sub.subscriptionStatus}
                            </span>
                          </td>
                          <td className="crm-table-cell">
                            <div className="flex items-center gap-1.5">
                              {sub.discountPercent != null && sub.discountPercent > 0 ? (
                                <span className="inline-flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    {sub.discountPercent}%
                                  </span>
                                  {formatDiscountPeriod(sub.discountFromMonth, sub.discountToMonth) ? (
                                    <span className="text-[11px] text-[#8a93a3]">
                                      {formatDiscountPeriod(sub.discountFromMonth, sub.discountToMonth)}
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-[#667085]">—</span>
                              )}
                              {sub.courseId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDiscountModal({
                                      isOpen: true,
                                      subscriptionId: sub.subscriptionId,
                                      courseId: sub.courseId,
                                      courseName,
                                      discountPercent: sub.discountPercent ?? 0,
                                      discountAmount: data.subscriptions.find((item) => item.id === sub.subscriptionId)?.discountAmount?.toString() || '',
                                      discountFromMonth: sub.discountFromMonth || '',
                                      discountToMonth: sub.discountToMonth || '',
                                      salaryDiscountMode,
                                    })
                                  }
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#467aff] transition-colors"
                                  title="Изменить скидку на курс"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="crm-table-cell">
                            {formatMoney(sub.monthlyExpected)}
                            {sub.lessonPrice != null && sub.lessonPrice > 0 && (
                              <span className="mt-0.5 block text-xs text-[#8a93a3]">
                                занятие {formatMoney(sub.lessonPrice)} · делится между учениками
                              </span>
                            )}
                          </td>
                          <td className="crm-table-cell text-emerald-700">{formatMoney(sub.totalPaid)}</td>
                          <td className="crm-table-cell text-rose-700 font-semibold">
                            {formatMoney(sub.totalDebt)}
                            {sub.advanceApplied != null && sub.advanceApplied > 0 && (
                              <span className="mt-0.5 block text-xs font-normal text-emerald-700">
                                зачтено авансом {formatMoney(sub.advanceApplied)} из {formatMoney(sub.grossDebt ?? 0)}
                              </span>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-[#f8fafc]">
                            <td colSpan={7} className="px-6 py-3">
                              {sub.months && sub.months.length > 0 ? (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs uppercase text-[#8a93a3]">
                                      <th className="py-1.5 pr-4 font-medium">Месяц</th>
                                      <th className="py-1.5 pr-4 font-medium">Начислено</th>
                                      <th className="py-1.5 pr-4 font-medium">Оплачено</th>
                                      <th className="py-1.5 pr-4 font-medium">Долг</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sub.months.map((m) => (
                                      <tr key={m.month} className="border-t border-[#e6ebf0]">
                                        <td className="py-1.5 pr-4 text-[#202938]">
                                          {new Date(`${m.month}-01T00:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="py-1.5 pr-4">{formatMoney(m.expected)}</td>
                                        <td className="py-1.5 pr-4 text-emerald-700">{formatMoney(m.paid)}</td>
                                        <td className={`py-1.5 pr-4 ${m.debt > 0 ? 'font-semibold text-rose-700' : 'text-[#667085]'}`}>
                                          {formatMoney(m.debt)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-sm text-[#667085]">Начислений по месяцам пока нет</p>
                              )}
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-gray-700">
                <Wallet className="mr-2 inline h-4 w-4" />
                История оплат
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Дата</th>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Группа / курс</th>
                    <th className="crm-table-th">Метод</th>
                    <th className="crm-table-th">Сумма</th>
                    <th className="crm-table-th">Кто принял</th>
                    <th className="crm-table-th">Комментарий</th>
                    <th className="crm-table-th">Действие</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {paymentRows.length > 0 ? (
                    paymentRows.map((row, index) => (
                      <tr key={row.id} className={`crm-table-row ${row.deleted ? 'bg-slate-50 text-slate-400 line-through opacity-70' : ''}`}>
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">{formatDate(row.paidAt)}</td>
                        <td className="crm-table-cell">{row.paymentMonth || '—'}</td>
                        <td className="crm-table-cell">
                          {row.courseName === 'Оплата / Баланс' || !row.subscriptionId ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                              row.paymentScope === 'BALANCE_REFUND'
                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            }`}>
                              {row.paymentScope === 'BALANCE_REFUND' ? (
                                <Undo2 className="h-3.5 w-3.5 text-rose-600" />
                              ) : (
                                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              {row.paymentScope === 'BALANCE_REFUND' ? 'Возврат с баланса' : 'Пополнение баланса (Аванс)'}
                            </span>
                          ) : (
                            <>
                              {row.groupId ? (
                                <div className="text-sm font-medium text-[#273142]">
                                  <Link
                                    href={`/classes/${row.groupId}`}
                                    className="transition-colors hover:text-[#3568eb] hover:underline"
                                  >
                                    {row.groupName}
                                  </Link>
                                </div>
                              ) : null}
                              <div className={row.groupId ? 'text-xs text-[#8a93a3]' : 'text-sm font-medium text-[#273142]'}>
                                <Link
                                  href="/classes"
                                  className="transition-colors hover:text-[#3568eb] hover:underline"
                                >
                                  {row.courseName}
                                </Link>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          {row.paymentScope === 'BALANCE_ALLOCATION' ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <span>С баланса</span>
                              {row.notes === AUTO_BALANCE_NOTE ? (
                                <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
                                  авто
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            PAYMENT_METHOD_LABELS[row.method] || row.method
                          )}
                        </td>
                        <td className={`crm-table-cell font-medium ${
                          row.paymentScope === 'BALANCE_REFUND'
                            ? 'text-rose-700 font-semibold'
                            : row.courseName === 'Оплата / Баланс' || !row.subscriptionId
                            ? 'text-emerald-700 font-semibold'
                            : ''
                        }`}>
                          {row.paymentScope === 'BALANCE_REFUND'
                            ? `− ${formatMoney(row.amount)}`
                            : row.courseName === 'Оплата / Баланс' || !row.subscriptionId
                            ? `+ ${formatMoney(row.amount)}`
                            : formatMoney(row.amount)}
                        </td>
                        <td className="crm-table-cell text-sm text-[#374151]">
                          <span className="inline-flex items-center gap-1 font-medium">
                            {row.cashierName || 'Администратор'}
                          </span>
                        </td>
                        <td className="crm-table-cell">{row.notes || '—'}</td>
                        <td className="crm-table-cell">
                          {row.deleted ? (
                            <span
                              className="text-xs font-semibold text-rose-500 no-underline"
                              title={`${row.deletedBy || ''} ${row.deletedAt ? formatDateTime(row.deletedAt) : ''}`.trim()}
                            >
                              Удалено{row.deletedBy ? ` (${row.deletedBy})` : ''}
                              {row.deletedAt ? ` · ${formatDateTime(row.deletedAt)}` : ''}
                            </span>
                          ) : row.paymentScope === 'BALANCE_ALLOCATION' && row.notes === AUTO_BALANCE_NOTE ? (
                            <span
                              className="text-xs text-[#8a93a3]"
                              title="CRM сама зачислила свободный баланс ученика на самый старый долг"
                            >
                              Зачислено автоматически
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDeletePayment(row.id)}
                              disabled={deletePaymentMutation.loading}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Удалить
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        {data.paymentHistory ? 'Платежи ещё не внесены' : 'Нет данных об оплатах'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="crm-table-wrap overflow-hidden">
            <div className="border-b border-[#e6ebf0] px-6 py-4">
              <p className="text-sm font-medium text-gray-700">
                Дополнительно: финансовые транзакции ({data.transactions.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">Дата</th>
                    <th className="crm-table-th">Категория</th>
                    <th className="crm-table-th">Описание</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Сумма</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {data.transactions.length > 0 ? (
                    data.transactions
                      .slice()
                      .sort((left, right) => compareIsoDateDesc(left.transactionDate, right.transactionDate))
                      .slice(0, 30)
                      .map((row) => (
                        <tr key={row.id} className="crm-table-row">
                          <td className="crm-table-cell">{formatDate(row.transactionDate)}</td>
                          <td className="crm-table-cell">{row.category || '—'}</td>
                          <td className="crm-table-cell">{row.description || '—'}</td>
                          <td className="crm-table-cell">{row.status}</td>
                          <td className="crm-table-cell">{formatMoney(row.amount)}</td>
                        </tr>
                      ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="crm-table-cell py-8 text-center text-sm text-[#8a93a3]">
                        Финансовые транзакции не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calls' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              <Phone className="mr-2 inline h-4 w-4" />
              История обзвонов: <span className="font-semibold text-gray-900">{data.callLogs.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Дата</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Результат</th>
                  <th className="crm-table-th">Заметки</th>
                  <th className="crm-table-th">Перезвонить</th>
                  <th className="crm-table-th">Кем создано</th>
                  <th className="crm-table-th">Причина изменения</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {data.callLogs.length > 0 ? (
                  data.callLogs
                    .slice(callLogPage * CALL_LOG_PAGE_SIZE, (callLogPage + 1) * CALL_LOG_PAGE_SIZE)
                    .map((log, index) => {
                    const callResultMeta = CALL_RESULTS.find((r) => r.value === log.callResult);
                    const creatorName = log.callerName || log.createdByName || (
                      currentUser && log.createdBy === currentUser.id
                        ? `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email
                        : null
                    );
                    return (
                    <tr key={log.id} className="crm-table-row">
                      <td className="crm-table-cell">{callLogPage * CALL_LOG_PAGE_SIZE + index + 1}</td>
                      <td className="crm-table-cell">{formatDate(log.callDate)}</td>
                      <td className="crm-table-cell">{log.callTime}</td>
                      <td className="crm-table-cell">
                        {log.callResult ? (
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${callResultMeta?.color ?? 'border-[#dbe2e8] bg-white text-[#5a6576]'}`}>
                            {callResultMeta?.label ?? log.callResult}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="crm-table-cell max-w-xs truncate">{log.notes || '—'}</td>
                      <td className="crm-table-cell">
                        {log.followUpDate
                          ? <span className="text-sm text-[#273142]">{formatDate(log.followUpDate)}</span>
                          : log.followUpRequired
                            ? <span className="text-xs text-amber-600">Дата не указана</span>
                            : '—'
                        }
                      </td>
                      <td className="crm-table-cell">
                        <div className="text-sm font-semibold text-[#273142]">{creatorName || '—'}</div>
                        <div className="text-xs text-[#8a93a3]">{formatDateTime(log.createdAt)}</div>
                      </td>
                      <td className="crm-table-cell max-w-[180px]">
                        {log.updateReason ? (
                          <span className="text-sm text-[#273142]">{log.updateReason}</span>
                        ) : (
                          <span className="text-xs text-[#c0c7d0]">—</span>
                        )}
                      </td>
                      <td className="crm-table-cell">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCallLog(log)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff]"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCallLog(log.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#c34c4c] transition-colors hover:bg-[#fff1f1]"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      История обзвонов отсутствует
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.callLogs.length > CALL_LOG_PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[#e6ebf0] px-6 py-3">
              <span className="text-xs text-[#8a93a3]">
                {callLogPage * CALL_LOG_PAGE_SIZE + 1}–{Math.min((callLogPage + 1) * CALL_LOG_PAGE_SIZE, data.callLogs.length)} из {data.callLogs.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCallLogPage((p) => Math.max(p - 1, 0))}
                  disabled={callLogPage === 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e3e8] bg-white text-sm text-[#4b5565] disabled:opacity-40 hover:bg-[#f4f6f8]"
                >
                  ‹
                </button>
                {Array.from({ length: Math.ceil(data.callLogs.length / CALL_LOG_PAGE_SIZE) }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCallLogPage(i)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      callLogPage === i
                        ? 'border-[#467aff] bg-[#eef5ff] text-[#467aff]'
                        : 'border-[#e0e3e8] bg-white text-[#4b5565] hover:bg-[#f4f6f8]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCallLogPage((p) => Math.min(p + 1, Math.ceil(data.callLogs.length / CALL_LOG_PAGE_SIZE) - 1))}
                  disabled={callLogPage >= Math.ceil(data.callLogs.length / CALL_LOG_PAGE_SIZE) - 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e3e8] bg-white text-sm text-[#4b5565] disabled:opacity-40 hover:bg-[#f4f6f8]"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveStudent}
        initialValues={toFormValues(data.student)}
        isSubmitting={updateStudentMutation.loading}
        title="Редактировать ученика"
        includeStatus
        studentId={studentId}
      />

      <Modal
        isOpen={isTransferBranchModalOpen}
        onClose={() => setIsTransferBranchModalOpen(false)}
        title="Перевести ученика в другой филиал"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTransferBranchModalOpen(false)} disabled={transferStudentMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleTransferStudent()}
              disabled={!targetBranchId || transferStudentMutation.loading}
            >
              {transferStudentMutation.loading ? 'Переводим...' : 'Перевести'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
            Активные записи ученика в группах текущего филиала будут закрыты как «Переведён». История посещений и оплат сохранится в прежнем филиале. После перевода добавьте ученика в группу нового филиала.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Новый филиал</label>
            <select
              value={targetBranchId}
              onChange={(event) => setTargetBranchId(event.target.value)}
              className="crm-select"
            >
              <option value="">Выберите филиал</option>
              {transferBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.code ? ` (${branch.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
        title="Добавить ученика в филиал"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddBranchModalOpen(false)} disabled={addToBranchMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleAddToBranch()}
              disabled={!addBranchId || addToBranchMutation.loading}
            >
              {addToBranchMutation.loading ? 'Добавляем...' : 'Добавить'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-5 text-sky-900">
            Ученик останется в текущем филиале и будет доступен ещё в выбранном. Карточка, история оплат и посещений остаются общими — новую карточку создавать не нужно.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Филиал</label>
            <select
              value={addBranchId}
              onChange={(event) => setAddBranchId(event.target.value)}
              className="crm-select"
            >
              <option value="">Выберите филиал</option>
              {addableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.code ? ` (${branch.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={returnToGroupModal !== null}
        onClose={() => setReturnToGroupModal(null)}
        title="Вернуть в группу"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnToGroupModal(null)} disabled={returnToGroupMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleReturnToGroup()}
              disabled={!returnToGroupModal?.fromDate || returnToGroupMutation.loading}
            >
              {returnToGroupMutation.loading ? 'Возвращаем...' : 'Вернуть'}
            </Button>
          </>
        }
      >
        {returnToGroupModal ? (
          <div className="space-y-4">
            <p className="text-sm text-[#5d6676]">
              Группа: <span className="font-medium text-[#1f2530]">{returnToGroupModal.label}</span>
            </p>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Вернуть с даты</label>
              <input
                type="date"
                value={returnToGroupModal.fromDate}
                onChange={(event) => {
                  const fromDate = event.target.value;
                  setReturnToGroupModal((prev) => (prev ? { ...prev, fromDate } : prev));
                }}
                className="crm-input"
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {(() => {
        // Only the advance left after all debts can be refunded (matches the server limit).
        const maxRefundable = Math.max(data.paymentHistory?.studentBalance ?? 0, 0);
        return (
          <Modal
            isOpen={isRefundModalOpen}
            onClose={() => setIsRefundModalOpen(false)}
            title="Возврат ученику"
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsRefundModalOpen(false)} disabled={refundBalanceMutation.loading}>
                  Отмена
                </Button>
                <Button
                  onClick={() => void handleRefundBalance()}
                  disabled={
                    refundBalanceMutation.loading ||
                    Number(refundForm.amount) <= 0 ||
                    Number(refundForm.amount) > maxRefundable
                  }
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {refundBalanceMutation.loading ? 'Возвращаем...' : 'Подтвердить возврат'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Доступно для возврата</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">
                  {formatMoney(maxRefundable)}
                </p>
                {(data.paymentHistory?.studentBalance ?? 0) > 0 ? (
                  <p className="mt-0.5 text-xs text-emerald-600">
                    Баланс: {formatMoney(data.paymentHistory?.studentBalance ?? 0)}, всего оплат: {formatMoney(data.paymentHistory?.totalPaid ?? 0)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-emerald-600">
                    Всего оплат: {formatMoney(data.paymentHistory?.totalPaid ?? 0)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5d6676]">Сумма возврата *</label>
                  <input
                    type="number"
                    min="0.01"
                    max={maxRefundable}
                    step="0.01"
                    value={refundForm.amount}
                    onChange={(event) => setRefundForm((prev) => ({ ...prev, amount: event.target.value }))}
                    className="crm-input"
                  />
                </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Дата возврата *</label>
              <input
                type="date"
                value={refundForm.refundDate}
                onChange={(event) => setRefundForm((prev) => ({ ...prev, refundDate: event.target.value }))}
                className="crm-input"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Способ возврата</label>
            <select
              value={refundForm.method}
              onChange={(event) => setRefundForm((prev) => ({ ...prev, method: event.target.value as StudentPaymentDto['method'] }))}
              className="crm-select"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Комментарий</label>
            <textarea
              value={refundForm.notes}
              onChange={(event) => setRefundForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="crm-input min-h-24 resize-y"
              placeholder="Причина возврата"
            />
          </div>
          <p className="text-xs text-[#8a93a3]">Автор и точное время возврата сохранятся автоматически.</p>
        </div>
      </Modal>
        );
      })()}

      <Modal
        isOpen={Boolean(enrollmentDateModal)}
        onClose={() => setEnrollmentDateModal(null)}
        title="Начало действия зачисления"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrollmentDateModal(null)} disabled={updateEnrollmentDateMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleUpdateEnrollmentDate()}
              disabled={!enrollmentDateModal?.startDate || updateEnrollmentDateMutation.loading}
            >
              {updateEnrollmentDateMutation.loading ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#667085]">
            До этой даты ученик не появится в посещаемости, а начисление будет считаться только с начала действия.
          </p>
          <input
            type="date"
            value={enrollmentDateModal?.startDate || ''}
            onChange={(event) => setEnrollmentDateModal((prev) => prev ? { ...prev, startDate: event.target.value } : prev)}
            className="crm-input"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Добавить оплату"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} disabled={createPaymentMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleCreatePayment()}
              disabled={
                createPaymentMutation.loading ||
                !paymentForm.subscriptionId ||
                !paymentForm.paidAt ||
                !paymentForm.paymentMonth ||
                Number(paymentForm.amount) <= 0
              }
            >
              {createPaymentMutation.loading ? 'Сохраняем...' : 'Сохранить оплату'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Абонемент</label>
            <select
              value={paymentForm.subscriptionId}
              onChange={(event) => {
                const subId = event.target.value;
                const sub = data.subscriptions.find((s) => s.id === subId);
                const subSummary = data.paymentHistory?.subscriptions.find((s) => s.subscriptionId === subId);
                let defaultAmt = 4500;
                if (subSummary?.monthlyExpected && subSummary.monthlyExpected > 0) {
                  defaultAmt = subSummary.monthlyExpected;
                } else if (sub?.amount) {
                  defaultAmt = sub.amount >= 10000 ? Math.round(sub.amount / 12) : sub.amount;
                }
                setPaymentForm((prev) => ({
                  ...prev,
                  subscriptionId: subId,
                  amount: String(defaultAmt),
                }));
              }}
              className="crm-select"
            >
              {payableSubscriptions.map((subscription) => {
                const subSummary = data.paymentHistory?.subscriptions.find((s) => s.subscriptionId === subscription.id);
                const monthly = subSummary?.monthlyExpected || (subscription.amount >= 10000 ? Math.round(subscription.amount / 12) : subscription.amount);
                const courseName = subscription.courseId ? data.coursesById[subscription.courseId]?.name || 'Курс' : 'Курс';
                const groupLabel = subscription.groupId
                  ? data.schedulesById[subscription.groupId]?.name || null
                  : null;

                return (
                  <option key={subscription.id} value={subscription.id}>
                    {courseName}{groupLabel ? ` (${groupLabel})` : ''} • {formatMoney(monthly)} / мес
                  </option>
                );
              })}
              <option value={BALANCE_ONLY}>На баланс (без курса) — CRM сама зачислит на долги</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Сумма</label>
              <input
                type="number"
                min={0}
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="crm-input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Метод оплаты</label>
              <select
                value={paymentForm.method}
                onChange={(event) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    method: event.target.value as StudentPaymentDto['method'],
                  }))
                }
                className="crm-select"
              >
                <option value="CASH">Наличные</option>
                <option value="CARD">Карта</option>
                <option value="TRANSFER">Перевод</option>
                <option value="OTHER">Другое</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Дата оплаты</label>
              <input
                type="date"
                value={paymentForm.paidAt}
                onChange={(event) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paidAt: event.target.value,
                    paymentMonth: event.target.value ? event.target.value.slice(0, 7) : prev.paymentMonth,
                  }))
                }
                className="crm-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Платежный месяц</label>
              <input
                type="month"
                value={paymentForm.paymentMonth}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMonth: event.target.value }))}
                className="crm-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Комментарий</label>
            <textarea
              value={paymentForm.notes}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="crm-textarea resize-none"
              placeholder="Комментарий к оплате"
            />
          </div>

          {selectedSubscription ? (
            <div className="rounded-xl border border-[#e7edf3] bg-[#f8fafc] px-4 py-3 text-xs text-[#667085]">
              Остаток по абонементу: {selectedSubscription.lessonsLeft} / {selectedSubscription.totalLessons} уроков,
              статус: {SUBSCRIPTION_STATUS_LABELS[selectedSubscription.status]}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={isCallLogModalOpen}
        onClose={() => setIsCallLogModalOpen(false)}
        title={editingCallLog ? 'Редактировать звонок' : 'Добавить звонок'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCallLogModalOpen(false)} disabled={createCallLogMutation.loading}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleSaveCallLog()}
              disabled={createCallLogMutation.loading || !callLogForm.callDate || !callLogForm.callTime}
            >
              {createCallLogMutation.loading ? 'Сохраняем...' : editingCallLog ? 'Далее →' : 'Сохранить'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Дата звонка</label>
              <input
                type="date"
                value={callLogForm.callDate}
                onChange={(event) => setCallLogForm((prev) => ({ ...prev, callDate: event.target.value }))}
                className="crm-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Время</label>
              <input
                type="time"
                value={callLogForm.callTime}
                onChange={(event) => setCallLogForm((prev) => ({ ...prev, callTime: event.target.value }))}
                className="crm-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Результат звонка</label>
            <select
              value={callLogForm.callResult}
              onChange={(event) => {
                const value = event.target.value;
                setCallLogForm((prev) => ({
                  ...prev,
                  callResult: value,
                  ...(value === 'CALLBACK' && { followUpRequired: true }),
                }));
              }}
              className="crm-select"
            >
              <option value="">— Не выбрано —</option>
              {CALL_RESULTS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметки</label>
            <textarea
              value={callLogForm.notes}
              onChange={(event) => setCallLogForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="crm-textarea resize-none"
              placeholder="Дополнительные заметки по звонку"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={callLogForm.followUpRequired}
              onChange={(event) => setCallLogForm((prev) => ({ ...prev, followUpRequired: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[#467aff] focus:ring-[#467aff]"
            />
            <label htmlFor="followUpRequired" className="text-sm font-medium text-[#5d6676]">
              Требуется повторный звонок
            </label>
          </div>

          {callLogForm.followUpRequired && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Дата повторного звонка</label>
              <input
                type="date"
                value={callLogForm.followUpDate}
                onChange={(event) => setCallLogForm((prev) => ({ ...prev, followUpDate: event.target.value }))}
                className="crm-input"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isCallLogReasonModalOpen}
        onClose={() => { setIsCallLogReasonModalOpen(false); setPendingCallLogPayload(null); }}
        title="Причина изменения"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsCallLogReasonModalOpen(false); setPendingCallLogPayload(null); }} disabled={updateCallLogMutation.loading}>
              Отмена
            </Button>
            <Button onClick={() => void handleConfirmCallLogReason()} disabled={updateCallLogMutation.loading}>
              {updateCallLogMutation.loading ? 'Сохраняем...' : 'Сохранить изменение'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#5d6676]">Укажите причину редактирования записи о звонке.</p>
          <textarea
            value={callLogForm.updateReason}
            onChange={(event) => setCallLogForm((prev) => ({ ...prev, updateReason: event.target.value }))}
            rows={3}
            className="crm-textarea resize-none"
            placeholder="Например: Исправлена дата звонка"
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={discountModal.isOpen}
        onClose={() => setDiscountModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Скидка на курс: ${discountModal.courseName}`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDiscountModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveDiscount} disabled={!discountPeriodValid}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Процент скидки (%)
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-base font-semibold outline-none focus:border-[#467aff]"
              type="number"
              min="0"
              max="100"
              value={discountModal.discountPercent}
              onChange={(e) =>
                setDiscountModal((prev) => ({
                  ...prev,
                  discountPercent: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                }))
              }
            />
          </label>
          <p className="text-xs text-[#7f8794]">
            При установке скидки размер долга и ежемесячный платёж по курсу автоматически пересчитаются в соответствии с указанным процентом.
          </p>
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Или скидка суммой (₸)
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-base font-semibold outline-none focus:border-[#467aff]"
              type="number" min="0" value={discountModal.discountAmount}
              placeholder="Например, 5000"
              onChange={(e) => setDiscountModal((prev) => ({ ...prev, discountAmount: e.target.value }))}
            />
          </label>
          <p className="text-xs text-[#7f8794]">Можно использовать процент, сумму или оба варианта: сначала применяется процент, затем сумма.</p>
          <div>
            <p className="text-sm font-semibold text-[#3f4b5a]">Период действия скидки</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[#7f8794]">
                С месяца
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-semibold text-[#202938] outline-none focus:border-[#467aff]"
                  type="month"
                  value={discountModal.discountFromMonth}
                  max={discountModal.discountToMonth || undefined}
                  onChange={(e) => setDiscountModal((prev) => ({ ...prev, discountFromMonth: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-[#7f8794]">
                По месяц
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-semibold text-[#202938] outline-none focus:border-[#467aff]"
                  type="month"
                  value={discountModal.discountToMonth}
                  min={discountModal.discountFromMonth || undefined}
                  onChange={(e) => setDiscountModal((prev) => ({ ...prev, discountToMonth: e.target.value }))}
                />
              </label>
            </div>
            {!discountPeriodValid ? (
              <p className="mt-2 text-xs font-medium text-red-600">Месяц начала не может быть позже месяца окончания.</p>
            ) : (
              <p className="mt-2 text-xs text-[#7f8794]">
                {discountPeriodLabel
                  ? `Скидка действует: ${discountPeriodLabel}. В остальные месяцы — полная цена.`
                  : 'Оставьте пустым, чтобы скидка действовала без ограничения по времени.'}
              </p>
            )}
            {discountModal.discountFromMonth || discountModal.discountToMonth ? (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-[#467aff] hover:underline"
                onClick={() => setDiscountModal((prev) => ({ ...prev, discountFromMonth: '', discountToMonth: '' }))}
              >
                Сбросить период
              </button>
            ) : null}
          </div>
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Расчёт зарплаты преподавателя
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm outline-none focus:border-[#467aff]"
              value={discountModal.salaryDiscountMode}
              onChange={(e) => setDiscountModal((prev) => ({
                ...prev,
                salaryDiscountMode: e.target.value as SalaryDiscountMode,
              }))}
            >
              <option value="FULL_PRICE">От полной цены курса</option>
              <option value="DISCOUNTED_PRICE">От цены после скидки</option>
            </select>
          </label>
          <p className="text-xs text-[#7f8794]">
            Этот выбор влияет только на базу для начисления преподавателю, а не на скидку ученика.
          </p>
        </div>
      </Modal>
    </div>
  );
}
