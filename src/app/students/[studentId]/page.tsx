/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck2,
  Edit2,
  GraduationCap,
  Loader2,
  PlusCircle,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
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
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl';
import {
  attendanceService,
  coursesService,
  financeService,
  lessonsService,
  schedulesService,
  studentPaymentsService,
  studentsService,
  subscriptionsService,
  type CreateStudentPaymentRequest,
  type CreateStudentRequest,
  type AttendanceDto,
  type CourseDto,
  type LessonDto,
  type ScheduleDto,
  type StudentDto,
  type StudentPaymentDto,
  type StudentPaymentHistoryResponse,
  type SubscriptionDto,
  type TransactionDto,
  type UpdateStudentRequest,
} from '@/lib/api';
import type { StudentFormValues } from '@/types/student';

type StudentProfileTab = 'profile' | 'groups' | 'attendance' | 'payments';

type StudentProfileData = {
  student: StudentDto;
  subscriptions: SubscriptionDto[];
  attendanceHistory: AttendanceDto[];
  paymentHistory: StudentPaymentHistoryResponse | null;
  transactions: TransactionDto[];
  schedulesById: Record<string, ScheduleDto>;
  coursesById: Record<string, CourseDto>;
  lessonsById: Record<string, LessonDto>;
};

const profileTabs: Array<{ id: StudentProfileTab; label: string }> = [
  { id: 'profile', label: 'Профиль' },
  { id: 'groups', label: 'Группы и абонементы' },
  { id: 'attendance', label: 'Посещаемость' },
  { id: 'payments', label: 'Оплаты' },
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
  if (student.fullName?.trim()) {
    return student.fullName.trim();
  }

  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim() || 'Без имени';
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
    phone: student.phone || '',
    studentPhone: student.studentPhone || '',
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
    comment: student.comment || '',
    stateOrderParticipant: Boolean(student.stateOrderParticipant),
    loyalty: student.loyalty || '',
    additionalPhones: student.additionalPhones.join(', '),
    notes: student.notes || '',
  };
}

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentIdParam = params.studentId;
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam;

  const [activeTab, setActiveTab] = useState<StudentProfileTab>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    subscriptionId: string;
    amount: string;
    paidAt: string;
    paymentMonth: string;
    method: StudentPaymentDto['method'];
    notes: string;
  }>({
    subscriptionId: '',
    amount: '',
    paidAt: new Date().toISOString().slice(0, 10),
    paymentMonth: new Date().toISOString().slice(0, 7),
    method: 'CASH',
    notes: '',
  });

  const { data, loading, error, refetch } = useApi<StudentProfileData | null>(async () => {
    if (!studentId) {
      return { data: null };
    }

    const studentResponse = await studentsService.getById(studentId);

    const [subscriptionsResult, attendanceResult, paymentHistoryResult, transactionsResult] = await Promise.all([
      subscriptionsService.getByStudent(studentId, { page: 0, size: 200 }).catch(() => null),
      attendanceService.getStudentHistory(studentId, { page: 0, size: 200 }).catch(() => null),
      studentPaymentsService.getByStudent(studentId).catch(() => null),
      financeService.getStudentTransactions(studentId, { page: 0, size: 200 }).catch(() => null),
    ]);

    const subscriptions = subscriptionsResult?.data.content ?? [];
    const attendanceHistory = attendanceResult?.data.content ?? [];
    const paymentHistory = paymentHistoryResult?.data ?? null;
    const transactions = transactionsResult?.data.content ?? [];

    const scheduleIds = Array.from(
      new Set(subscriptions.map((subscription) => subscription.groupId).filter((id): id is string => Boolean(id)))
    );
    const courseIds = Array.from(
      new Set(subscriptions.map((subscription) => subscription.courseId).filter((id): id is string => Boolean(id)))
    );
    const lessonIds = Array.from(new Set(attendanceHistory.map((row) => row.lessonId))).slice(0, 120);

    const [scheduleEntries, courseEntries, lessonEntries] = await Promise.all([
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
            const response = await coursesService.getById(id);
            return [id, response.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      ),
      Promise.all(
        lessonIds.map(async (id) => {
          try {
            const response = await lessonsService.getById(id);
            return [id, response.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      ),
    ]);

    const schedulesById: Record<string, ScheduleDto> = {};
    const coursesById: Record<string, CourseDto> = {};
    const lessonsById: Record<string, LessonDto> = {};

    scheduleEntries.forEach(([id, value]) => {
      if (value) {
        schedulesById[id] = value;
      }
    });

    courseEntries.forEach(([id, value]) => {
      if (value) {
        coursesById[id] = value;
      }
    });

    lessonEntries.forEach(([id, value]) => {
      if (value) {
        lessonsById[id] = value;
      }
    });

    return {
      data: {
        student: studentResponse.data,
        subscriptions,
        attendanceHistory,
        paymentHistory,
        transactions,
        schedulesById,
        coursesById,
        lessonsById,
      },
    };
  }, [studentId]);

  const student = data?.student ?? null;
  const photoUrl = useResolvedFileUrl(student?.studentPhoto);

  const updateStudentMutation = useMutation(({ id, data }: { id: string; data: UpdateStudentRequest }) =>
    studentsService.update(id, data)
  );
  const deleteStudentMutation = useMutation((id: string) => studentsService.delete(id));
  const createPaymentMutation = useMutation((payload: CreateStudentPaymentRequest) =>
    studentPaymentsService.create(payload)
  );

  const groupsCount = useMemo(() => {
    if (!data) {
      return 0;
    }

    return new Set(data.subscriptions.map((subscription) => subscription.groupId).filter(Boolean)).size;
  }, [data]);

  const attendanceStats = useMemo(() => {
    if (!data) {
      return { total: 0, present: 0, rate: 0 };
    }

    const total = data.attendanceHistory.length;
    const present = data.attendanceHistory.filter((row) => isPresentStatus(row.status)).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, rate };
  }, [data]);

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
      courseName: string;
      groupName: string;
    }> = [];

    data.paymentHistory.subscriptions.forEach((subscriptionSummary) => {
      const matchedSubscription = data.subscriptions.find(
        (subscription) => subscription.id === subscriptionSummary.subscriptionId
      );

      const courseName = matchedSubscription?.courseId
        ? data.coursesById[matchedSubscription.courseId]?.name || matchedSubscription.courseId
        : 'Без курса';

      const groupName = matchedSubscription?.groupId
        ? data.schedulesById[matchedSubscription.groupId]?.name || matchedSubscription.groupId
        : 'Без группы';

      subscriptionSummary.months.forEach((month) => {
        month.payments.forEach((payment) => {
          rows.push({
            id: payment.id,
            paidAt: payment.paidAt,
            paymentMonth: payment.paymentMonth,
            amount: payment.amount,
            method: payment.method,
            notes: payment.notes,
            subscriptionId: payment.subscriptionId,
            courseName,
            groupName,
          });
        });
      });
    });

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
      }>;
    }

    return data.attendanceHistory
      .map((row) => {
        const lesson = data.lessonsById[row.lessonId];

        const lessonDate = lesson?.lessonDate || '';
        const lessonTime = lesson ? `${lesson.startTime.slice(0, 5)} - ${lesson.endTime.slice(0, 5)}` : '—';
        const groupName = lesson?.groupId
          ? data.schedulesById[lesson.groupId]?.name || lesson.groupId
          : 'Не указана';

        return {
          id: row.id,
          status: row.status,
          lessonDate,
          lessonTime,
          groupName,
          markedAt: row.updatedAt || row.createdAt,
        };
      })
      .sort((left, right) => {
        const leftDate = left.lessonDate || left.markedAt;
        const rightDate = right.lessonDate || right.markedAt;
        return compareIsoDateDesc(leftDate, rightDate);
      });
  }, [data]);

  const selectedSubscription = useMemo(
    () => data?.subscriptions.find((subscription) => subscription.id === paymentForm.subscriptionId) ?? null,
    [data, paymentForm.subscriptionId]
  );

  const openPaymentModal = () => {
    const firstSubscription = data?.subscriptions[0] ?? null;

    setPaymentForm((previous) => ({
      ...previous,
      subscriptionId: firstSubscription?.id || '',
      amount: firstSubscription?.amount ? String(firstSubscription.amount) : '',
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
      subscriptionId: paymentForm.subscriptionId,
      amount: parsedAmount,
      paidAt: paymentForm.paidAt,
      paymentMonth: paymentForm.paymentMonth,
      method: paymentForm.method,
      notes: paymentForm.notes.trim() || undefined,
    });

    setIsPaymentModalOpen(false);
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
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/students')}>
          Назад к ученикам
        </Button>
        <div className="crm-surface space-y-4 p-6">
          <p className="text-sm text-red-600">{error || 'Не удалось загрузить карточку ученика.'}</p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      </div>
    );
  }

  const displayName = getStudentDisplayName(data.student);

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
              <h1 className="truncate text-2xl font-semibold text-[#1f2530]">{displayName}</h1>
              <p className="mt-1 text-sm text-[#7f8794]">{data.student.customer || data.student.parentName || 'Без заказчика'}</p>
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

          <div className="grid min-w-60 grid-cols-1 gap-2 text-sm text-[#586272]">
            <div>
              <span className="text-[#8a93a3]">Телефон:</span> {data.student.phone || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Телефон ученика:</span> {data.student.studentPhone || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Email:</span> {data.student.email || '—'}
            </div>
            <div>
              <span className="text-[#8a93a3]">Дата рождения:</span> {formatDate(data.student.birthDate)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-2 xl:grid-cols-4">
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
              {formatMoney(data.paymentHistory?.totalDebt ?? 0)} / {formatMoney(data.paymentHistory?.totalPaid ?? 0)}
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
          <Button
            variant="secondary"
            icon={PlusCircle}
            onClick={openPaymentModal}
            disabled={createPaymentMutation.loading || data.subscriptions.length === 0}
          >
            Добавить оплату
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
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Договор</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.contract || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Скидка</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">{data.student.discount || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Госзаказ</p>
              <p className="mt-1 text-sm font-semibold text-[#273142]">
                {data.student.stateOrderParticipant ? 'Да' : 'Нет'}
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
                  <th className="crm-table-th">Группа</th>
                  <th className="crm-table-th">Курс</th>
                  <th className="crm-table-th">Период</th>
                  <th className="crm-table-th">Уроки</th>
                  <th className="crm-table-th">Сумма</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {data.subscriptions.length > 0 ? (
                  data.subscriptions.map((subscription, index) => (
                    <tr key={subscription.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell">
                        {subscription.groupId
                          ? data.schedulesById[subscription.groupId]?.name || subscription.groupId
                          : 'Без группы'}
                      </td>
                      <td className="crm-table-cell">
                        {subscription.courseId
                          ? data.coursesById[subscription.courseId]?.name || subscription.courseId
                          : 'Без курса'}
                      </td>
                      <td className="crm-table-cell">
                        {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                      </td>
                      <td className="crm-table-cell">
                        {subscription.lessonsLeft} / {subscription.totalLessons}
                      </td>
                      <td className="crm-table-cell">{formatMoney(subscription.amount)}</td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}
                        >
                          {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      У студента пока нет активных групп или абонементов
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
                      <td className="crm-table-cell">{row.groupName}</td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${ATTENDANCE_STATUS_COLORS[row.status]}`}
                        >
                          {ATTENDANCE_STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="crm-table-cell">{formatDateTime(row.markedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      История посещаемости отсутствует
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Оплачено всего</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(data.paymentHistory?.totalPaid ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Общий долг</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{formatMoney(data.paymentHistory?.totalDebt ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-[#e7edf3] bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Платежей</p>
                <p className="mt-1 text-lg font-semibold text-[#1f2530]">{paymentRows.length}</p>
              </div>
            </div>
          </div>

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
                    <th className="crm-table-th">Комментарий</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {paymentRows.length > 0 ? (
                    paymentRows.map((row, index) => (
                      <tr key={row.id} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">{formatDate(row.paidAt)}</td>
                        <td className="crm-table-cell">{row.paymentMonth || '—'}</td>
                        <td className="crm-table-cell">
                          <div className="text-sm text-[#273142]">{row.groupName}</div>
                          <div className="text-xs text-[#8a93a3]">{row.courseName}</div>
                        </td>
                        <td className="crm-table-cell">{PAYMENT_METHOD_LABELS[row.method]}</td>
                        <td className="crm-table-cell">{formatMoney(row.amount)}</td>
                        <td className="crm-table-cell">{row.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Платежи по студенту пока отсутствуют
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

      <AddStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveStudent}
        initialValues={toFormValues(data.student)}
        isSubmitting={updateStudentMutation.loading}
        title="Редактировать ученика"
        includeStatus
      />

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
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, subscriptionId: event.target.value }))}
              className="crm-select"
            >
              {data.subscriptions.map((subscription) => {
                const groupLabel = subscription.groupId
                  ? data.schedulesById[subscription.groupId]?.name || subscription.groupId
                  : 'Без группы';

                return (
                  <option key={subscription.id} value={subscription.id}>
                    {groupLabel} • {formatMoney(subscription.amount)}
                  </option>
                );
              })}
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
    </div>
  );
}
