'use client';

import { BadgeAlert, Calendar, CalendarDays, ChevronLeft, ChevronRight, Eye, Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { AddStudentPaymentModal } from '@/components/features/finance/AddStudentPaymentModal';
import { ApiPayInvoiceModal } from '@/components/features/settings/ApiPayInvoiceModal';
import {
  STUDENT_PAYMENT_STATUS_COLORS,
  STUDENT_PAYMENT_STATUS_LABELS,
} from '@/constants/finance';
import {
  coursesService,
  studentPaymentsService,
  studentsService,
  subscriptionsService,
  type CreateStudentPaymentRequest,
  type StudentPaymentMonthStatus,
  type SubscriptionStatus,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';

type StudentPaymentsTab = 'OVERVIEW' | 'DEBTORS';
type DebtorStageFilter = 'all' | 'two_plus' | 'three_plus';

interface PaymentModalState {
  key: number;
  isOpen: boolean;
  studentId: string;
  lockStudent?: boolean;
  subscriptionId?: string;
}

interface KaspiInvoiceModalState {
  isOpen: boolean;
  studentId: string;
  subscriptionId: string;
}

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Активный',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
  FROZEN: 'Заморожен',
};

const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
  FROZEN: 'border-sky-200 bg-sky-50 text-sky-700',
};

function getCurrentMonth(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 7);
}

function getStudentFullName(student: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ')
    || student.fullName?.trim()
    || '';
}

function normalizePhoneForWhatsApp(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, '') || '';
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

function getStudentWhatsAppPhone(student: {
  phone?: string | null;
  studentPhone?: string | null;
  parentPhone?: string | null;
  additionalPhones?: string[] | null;
}): string {
  const candidates = [student.phone, student.studentPhone, student.parentPhone, ...(student.additionalPhones ?? [])];
  return candidates.map(normalizePhoneForWhatsApp).find(Boolean) || '';
}

function WhatsAppAction({ phone, studentName }: { phone: string; studentName: string }) {
  if (!phone) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg opacity-40"
        title="У ученика не указан номер WhatsApp"
        aria-label={`Номер WhatsApp для ${studentName} не указан`}
      >
        <Image src="/logo/whatsapp.svg" alt="" width={18} height={18} />
      </button>
    );
  }

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
      title="Открыть WhatsApp"
      aria-label={`Открыть WhatsApp для ${studentName}`}
    >
      <Image src="/logo/whatsapp.svg" alt="" width={18} height={18} />
    </a>
  );
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₸`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');
}

function formatMonthLabel(value: string): string {
  if (!value) {
    return 'Месяц не выбран';
  }

  return new Date(`${value}-01T00:00:00`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(value: string, delta: number): string {
  if (!value) {
    return getCurrentMonth();
  }

  const [year, month] = value.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function getOverviewStatusMeta(status: StudentPaymentMonthStatus) {
  return {
    label: STUDENT_PAYMENT_STATUS_LABELS[status],
    color: STUDENT_PAYMENT_STATUS_COLORS[status],
  };
}

function getSubscriptionStatusMeta(status: SubscriptionStatus | undefined) {
  if (!status) {
    return {
      label: 'Без статуса',
      color: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }

  return {
    label: SUBSCRIPTION_STATUS_LABELS[status],
    color: SUBSCRIPTION_STATUS_COLORS[status],
  };
}

function getDebtSeverityMeta(debtMonths: number) {
  if (debtMonths >= 3) {
    return {
      label: 'Критично',
      color: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }

  if (debtMonths >= 2) {
    return {
      label: 'Риск',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'Новый долг',
    color: 'border-sky-200 bg-sky-50 text-sky-700',
  };
}

export default function StudentPaymentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudentPaymentsTab>('OVERVIEW');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentPaymentMonthStatus | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [debtorStageFilter, setDebtorStageFilter] = useState<DebtorStageFilter>('all');
  const [debtorFromDate, setDebtorFromDate] = useState('');
  const [debtorToDate, setDebtorToDate] = useState('');
  const [paymentModalState, setPaymentModalState] = useState<PaymentModalState>({
    key: 0,
    isOpen: false,
    studentId: '',
  });
  const [kaspiInvoiceModalState, setKaspiInvoiceModalState] = useState<KaspiInvoiceModalState>({
    isOpen: false,
    studentId: '',
    subscriptionId: '',
  });

  const { data: studentsPage } = useApi(() => studentsService.getAll({ page: 0, size: 1000 }), []);
  const { data: coursesPage } = useApi(() => coursesService.getAll({ page: 0, size: 1000 }), []);
  const { data: subscriptionsPage } = useApi(() => subscriptionsService.getAll({ page: 0, size: 1000 }), []);
  const {
    data: monthlyOverview,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi(() => studentPaymentsService.getMonthlyOverview({ month: selectedMonth }), [selectedMonth]);
  const {
    data: debtorsData,
    loading: debtorsLoading,
    error: debtorsError,
    refetch: refetchDebtors,
  } = useApi(() => studentPaymentsService.getDebtors({
    month: selectedMonth || undefined,
    fromDate: debtorFromDate || undefined,
    toDate: debtorToDate || undefined,
  }), [selectedMonth, debtorFromDate, debtorToDate]);

  const createPaymentMutation = useMutation((data: CreateStudentPaymentRequest) => studentPaymentsService.create(data));

  const studentMap = useMemo(
    () =>
      new Map(
        (studentsPage?.content ?? []).map((student) => [
          student.id,
          getStudentFullName(student) || student.email || student.phone || student.id,
        ])
      ),
    [studentsPage]
  );
  const studentDiscountMap = useMemo(
    () => new Map((studentsPage?.content ?? []).map((student) => [student.id, student.discountPercent ?? null])),
    [studentsPage]
  );
  const studentWhatsAppMap = useMemo(
    () => new Map((studentsPage?.content ?? []).map((student) => [student.id, getStudentWhatsAppPhone(student)])),
    [studentsPage]
  );
  const courseMap = useMemo(
    () => new Map((coursesPage?.content ?? []).map((course) => [course.id, course.name])),
    [coursesPage]
  );
  const subscriptionMetaMap = useMemo(
    () =>
      new Map(
        (subscriptionsPage?.content ?? []).map((subscription) => [
          subscription.id,
          {
            courseId: subscription.courseId,
            courseName: subscription.courseId ? courseMap.get(subscription.courseId) || 'Без курса' : 'Без курса',
            amount: subscription.amount,
            currency: subscription.currency,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          },
        ])
      ),
    [courseMap, subscriptionsPage]
  );

  const overviewRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (monthlyOverview?.students ?? [])
      .filter((item) => {
        const studentName = (item as any).fullName || studentMap.get(item.studentId) || item.studentId;
        const subscriptionMeta = subscriptionMetaMap.get(item.subscriptionId);
        const haystack = [
          studentName,
          subscriptionMeta?.courseName || '',
          item.subscriptionId,
          STUDENT_PAYMENT_STATUS_LABELS[item.status],
        ]
          .join(' ')
          .toLowerCase();

        if (query && !haystack.includes(query)) {
          return false;
        }

        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.debt - left.debt || right.expected - left.expected);
  }, [monthlyOverview, search, statusFilter, studentMap, subscriptionMetaMap]);

  // Soft-deleted students (card kept): flagged by the debtors API or the student list.
  const softDeletedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    (studentsPage?.content ?? []).forEach((student) => {
      if (student.deleted) ids.add(student.id);
    });
    (debtorsData ?? []).forEach((debtor) => {
      if (debtor.deleted) ids.add(debtor.studentId);
    });
    return ids;
  }, [studentsPage, debtorsData]);

  const debtorRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (debtorsData ?? [])
      .filter((item) => {
        const studentName = item.fullName || studentMap.get(item.studentId) || item.studentId;
        const subscriptionMeta = subscriptionMetaMap.get(item.subscriptionId);
        const haystack = [studentName, subscriptionMeta?.courseName || '', item.subscriptionId].join(' ').toLowerCase();

        if (query && !haystack.includes(query)) {
          return false;
        }

        if (debtorStageFilter === 'two_plus' && item.debtMonths < 2) {
          return false;
        }

        if (debtorStageFilter === 'three_plus' && item.debtMonths < 3) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const leftName = left.fullName || studentMap.get(left.studentId) || left.studentId;
        const rightName = right.fullName || studentMap.get(right.studentId) || right.studentId;
        return leftName.localeCompare(rightName, 'ru');
      });
  }, [debtorStageFilter, debtorsData, search, studentMap, subscriptionMetaMap]);

  // Карточка студента показывает общий долг по всем курсам одной суммой —
  // сворачиваем построчные записи (по абонементу) в одну строку на ученика,
  // чтобы список Должников/Платежей студентов совпадал с тем, что видно в профиле.
  const groupedOverviewRows = useMemo(() => {
    const byStudent = new Map<string, {
      studentId: string;
      studentName: string;
      isDeleted: boolean;
      expected: number;
      paid: number;
      debt: number;
      status: StudentPaymentMonthStatus;
      courseNames: string[];
      subscriptionIds: string[];
    }>();

    for (const item of overviewRows) {
      const studentName = (item as any).fullName || studentMap.get(item.studentId) || 'Ученик удален';
      const isDeleted = !studentMap.has(item.studentId) && !(item as any).fullName;
      const subscriptionMeta = subscriptionMetaMap.get(item.subscriptionId);
      const existing = byStudent.get(item.studentId);
      const courseName = subscriptionMeta?.courseName || `Абонемент #${shortId(item.subscriptionId)}`;

      if (!existing) {
        byStudent.set(item.studentId, {
          studentId: item.studentId,
          studentName,
          isDeleted,
          expected: item.expected,
          paid: item.paid,
          debt: item.debt,
          status: item.status,
          courseNames: [courseName],
          subscriptionIds: [item.subscriptionId],
        });
      } else {
        existing.expected += item.expected;
        existing.paid += item.paid;
        existing.debt += item.debt;
        existing.courseNames.push(courseName);
        existing.subscriptionIds.push(item.subscriptionId);
        // Worst status wins: UNPAID > PARTIAL > PAID
        if (existing.status !== 'UNPAID') {
          if (item.status === 'UNPAID') existing.status = 'UNPAID';
          else if (item.status === 'PARTIAL' && existing.status === 'PAID') existing.status = 'PARTIAL';
        }
      }
    }

    return Array.from(byStudent.values()).sort((left, right) => right.debt - left.debt || left.studentName.localeCompare(right.studentName, 'ru'));
  }, [overviewRows, studentMap, subscriptionMetaMap]);

  const groupedDebtorRows = useMemo(() => {
    const byStudent = new Map<string, {
      studentId: string;
      studentName: string;
      isDeleted: boolean;
      totalDebt: number;
      debtMonths: number;
      monthlyExpected: number;
      discountPercent: number | null;
      courseNames: string[];
      subscriptionIds: string[];
    }>();

    for (const item of debtorRows) {
      const studentName = item.fullName || studentMap.get(item.studentId) || 'Ученик удален';
      const isDeleted = !item.fullName && !studentMap.has(item.studentId);
      const subscriptionMeta = subscriptionMetaMap.get(item.subscriptionId);
      const existing = byStudent.get(item.studentId);
      const courseName = subscriptionMeta?.courseName || `Абонемент #${shortId(item.subscriptionId)}`;

      if (!existing) {
        byStudent.set(item.studentId, {
          studentId: item.studentId,
          studentName,
          isDeleted,
          totalDebt: item.totalDebt,
          debtMonths: item.debtMonths,
          monthlyExpected: item.monthlyExpected,
          discountPercent: item.discountPercent ?? null,
          courseNames: [courseName],
          subscriptionIds: [item.subscriptionId],
        });
      } else {
        existing.totalDebt += item.totalDebt;
        existing.monthlyExpected += item.monthlyExpected;
        existing.debtMonths = Math.max(existing.debtMonths, item.debtMonths);
        existing.courseNames.push(courseName);
        existing.subscriptionIds.push(item.subscriptionId);
      }
    }

    return Array.from(byStudent.values()).sort((left, right) => left.studentName.localeCompare(right.studentName, 'ru'));
  }, [debtorRows, studentMap, subscriptionMetaMap]);

  const paymentSubscriptionOptions = useMemo(
    () => {
      const options = new Map<
        string,
        {
          id: string;
          studentId: string;
          label: string;
        }
      >();

      (subscriptionsPage?.content ?? []).forEach((subscription) => {
        const subscriptionMeta = subscriptionMetaMap.get(subscription.id);
        options.set(subscription.id, {
          id: subscription.id,
          studentId: subscription.studentId,
          label: `${subscriptionMeta?.courseName || 'Без курса'} · ${formatMoney(subscription.amount)} · ${getSubscriptionStatusMeta(subscription.status).label}`,
        });
      });

      return Array.from(options.values());
    },
    [subscriptionMetaMap, subscriptionsPage]
  );
  // Payment picker: soft-deleted students are hidden unless the modal is opened
  // for that student (e.g. from the debtors list — past debt can still be paid).
  const studentOptions = useMemo(
    () =>
      (studentsPage?.content ?? [])
        .filter((student) => !student.deleted || student.id === paymentModalState.studentId)
        .map((student) => ({
          id: student.id,
          name: getStudentFullName(student) || student.email || student.phone || 'Без имени',
        })),
    [studentsPage, paymentModalState.studentId]
  );
  const overviewStats = useMemo(
    () => [
      {
        label: 'Период',
        value: formatMonthLabel(monthlyOverview?.month || selectedMonth),
        cardClass: 'border-[#dbe2e8] bg-[#eef5ff]',
        valueClass: 'text-[#20314f]',
      },
      {
        label: 'Ученики в отчёте',
        value: String(monthlyOverview?.totalStudents ?? 0),
        cardClass: 'border-[#dbe2e8] bg-[#f8fafc]',
        valueClass: 'text-[#1f2530]',
      },
      {
        label: 'Собрано',
        value: formatMoney(monthlyOverview?.totalCollected ?? 0),
        cardClass: 'border-emerald-100 bg-emerald-50',
        valueClass: 'text-emerald-700',
      },
      {
        label: 'Осталось',
        value: formatMoney(monthlyOverview?.totalDebt ?? 0),
        cardClass: 'border-rose-100 bg-rose-50',
        valueClass: 'text-rose-700',
      },
    ],
    [monthlyOverview, selectedMonth]
  );
  const debtorStats = useMemo(
    () => [
      {
        label: 'Должников',
        value: String(groupedDebtorRows.length),
        cardClass: 'border-[#dbe2e8] bg-[#f8fafc]',
        valueClass: 'text-[#1f2530]',
      },
      {
        label: 'Общий долг',
        value: formatMoney(groupedDebtorRows.reduce((sum, item) => sum + item.totalDebt, 0)),
        cardClass: 'border-rose-100 bg-rose-50',
        valueClass: 'text-rose-700',
      },
      {
        label: 'Средний долг',
        value: formatMoney(
          groupedDebtorRows.length > 0
            ? Math.round(groupedDebtorRows.reduce((sum, item) => sum + item.totalDebt, 0) / groupedDebtorRows.length)
            : 0
        ),
        cardClass: 'border-amber-100 bg-amber-50',
        valueClass: 'text-amber-700',
      },
      {
        label: 'Критичные кейсы',
        value: String(groupedDebtorRows.filter((item) => item.debtMonths >= 3).length),
        cardClass: 'border-[#dbe2e8] bg-white',
        valueClass: 'text-[#1f2530]',
      },
    ],
    [groupedDebtorRows]
  );

  const openAddPayment = (options?: { studentId?: string; subscriptionId?: string; lockStudent?: boolean }) => {
    setPaymentModalState((prev) => ({
      key: prev.key + 1,
      isOpen: true,
      studentId: options?.studentId || '',
      lockStudent: options?.lockStudent ?? false,
      subscriptionId: options?.subscriptionId,
    }));
  };

  const closeAddPayment = () => {
    setPaymentModalState((prev) => ({
      ...prev,
      isOpen: false,
      studentId: '',
      lockStudent: false,
      subscriptionId: undefined,
    }));
  };

  const openKaspiInvoice = (studentId: string, subscriptionId: string) => {
    setKaspiInvoiceModalState({ isOpen: true, studentId, subscriptionId });
  };

  const closeKaspiInvoice = () => {
    setKaspiInvoiceModalState({ isOpen: false, studentId: '', subscriptionId: '' });
  };

  const handleCreatePayment = async (data: CreateStudentPaymentRequest) => {
    await createPaymentMutation.mutate(data);
    closeAddPayment();
    await Promise.all([refetchOverview(), refetchDebtors()]);
  };

  const isTableLoading = activeTab === 'OVERVIEW' ? overviewLoading : debtorsLoading;
  const tableError = activeTab === 'OVERVIEW' ? overviewError : debtorsError;
  const hasDirtyFilters =
    activeTab === 'OVERVIEW'
      ? search.trim().length > 0 || statusFilter !== 'all' || selectedMonth !== getCurrentMonth()
      : search.trim().length > 0 || debtorStageFilter !== 'all' || debtorFromDate || debtorToDate;

  const resetFilters = () => {
    setSearch('');

    if (activeTab === 'OVERVIEW') {
      setStatusFilter('all');
      setSelectedMonth(getCurrentMonth());
      return;
    }

    setDebtorStageFilter('all');
    setDebtorFromDate('');
    setDebtorToDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => openAddPayment()}>
          Записать платёж
        </Button>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={[
            { id: 'OVERVIEW', label: 'Платежи студентов' },
            { id: 'DEBTORS', label: 'Должники' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as StudentPaymentsTab)}
          aria-label="Вкладки платежей студентов"
          className="w-fit"
        />
      </div>

      <div className="crm-surface p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202938]">
              {activeTab === 'OVERVIEW' ? 'Платежи студентов' : 'Должники'}
            </h2>
          </div>

          {hasDirtyFilters ? (
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={resetFilters}>
              Сбросить
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(activeTab === 'OVERVIEW' ? overviewStats : debtorStats).map((card) => (
            <div key={card.label} className={`rounded-2xl border p-4 ${card.cardClass}`}>
              <p className="text-sm text-[#7f8794]">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold ${card.valueClass}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'OVERVIEW' ? 'Поиск по ученику или курсу' : 'Поиск по должнику или курсу'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="crm-input crm-input-with-icon"
            />
          </div>

          {activeTab === 'OVERVIEW' ? (
            <>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StudentPaymentMonthStatus | 'all')}
                className="crm-select"
              >
                <option value="all">Все статусы</option>
                {Object.entries(STUDENT_PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value || getCurrentMonth())}
                className="crm-select"
              />
            </>
          ) : (
            <>
              <select
                value={debtorStageFilter}
                onChange={(event) => setDebtorStageFilter(event.target.value as DebtorStageFilter)}
                className="crm-select"
              >
                <option value="all">Все долги</option>
                <option value="two_plus">От 2 месяцев</option>
                <option value="three_plus">3 месяца и больше</option>
              </select>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#8a93a3]" />
                <input
                  type="date"
                  value={debtorFromDate}
                  onChange={(event) => setDebtorFromDate(event.target.value)}
                  className="crm-input"
                  placeholder="Дата от"
                />
                <span className="text-sm text-[#8a93a3]">—</span>
                <input
                  type="date"
                  value={debtorToDate}
                  onChange={(event) => setDebtorToDate(event.target.value)}
                  className="crm-input"
                  placeholder="Дата до"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e6ebf0] px-6 py-4 md:flex-row md:items-center md:justify-between">
          {activeTab === 'OVERVIEW' ? (
            <p className="text-sm font-medium text-gray-700">
              Ученики за месяц: <span className="font-semibold text-gray-900">{monthlyOverview?.totalStudents ?? 0}</span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                Должников: <span className="font-semibold text-gray-900">{groupedDebtorRows.length}</span>
              </p>
              <p className="text-sm font-medium text-gray-700">
                Общий долг: <span className="font-semibold text-rose-700">{formatMoney(groupedDebtorRows.reduce((sum, item) => sum + item.totalDebt, 0))}</span>
              </p>
            </>
          )}
        </div>

        {tableError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {tableError}
          </div>
        )}

        {isTableLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'OVERVIEW' ? (
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Ученик / абонемент</th>
                    <th className="crm-table-th">Ожидалось</th>
                    <th className="crm-table-th">Оплачено</th>
                    <th className="crm-table-th">Осталось</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {groupedOverviewRows.length > 0 ? (
                    groupedOverviewRows.map((item, index) => {
                      const statusMeta = getOverviewStatusMeta(item.status);

                      return (
                        <tr
                          key={item.studentId}
                          className="crm-table-row cursor-pointer"
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return;
                            if (item.isDeleted) {
                              pushToast({
                                message: 'Карточка ученика удалена или недоступна в текущем филиале',
                                tone: 'error',
                              });
                              return;
                            }
                            router.push(`/students/${item.studentId}`);
                          }}
                        >
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">
                            <div className="space-y-1.5">
                              {item.isDeleted ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8690a0]">
                                  {item.studentName}
                                  <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">
                                    Удален
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5">
                                  <Link
                                    href={`/students/${item.studentId}`}
                                    className={`text-sm font-semibold transition-colors hover:text-[#3568eb] hover:underline ${
                                      softDeletedStudentIds.has(item.studentId) ? 'text-gray-500 line-through' : 'text-[#202938]'
                                    }`}
                                  >
                                    {item.studentName}
                                  </Link>
                                  {softDeletedStudentIds.has(item.studentId) ? (
                                    <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                      Удалён
                                    </span>
                                  ) : null}
                                </span>
                              )}
                              <div className="text-xs text-[#8690a0]">
                                {item.courseNames.join(', ')}
                              </div>
                            </div>
                          </td>
                          <td className="crm-table-cell">{formatMoney(item.expected)}</td>
                          <td className="crm-table-cell text-emerald-700">{formatMoney(item.paid)}</td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(item.debt)}</td>
                          <td className="crm-table-cell">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusMeta.color}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="crm-table-cell">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.status !== 'PAID' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={Plus}
                                  onClick={() =>
                                    openAddPayment({
                                      studentId: item.studentId,
                                      subscriptionId: item.subscriptionIds.length === 1 ? item.subscriptionIds[0] : undefined,
                                      lockStudent: true,
                                    })
                                  }
                                >
                                  Платёж
                                </Button>
                              )}
                              <WhatsAppAction
                                phone={studentWhatsAppMap.get(item.studentId) || ''}
                                studentName={item.studentName}
                              />
                              <Link
                                href={`/finance/student-payments/${item.studentId}`}
                                className="inline-flex rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                                title="Открыть историю"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Платежи по выбранным фильтрам не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Ученик / абонемент</th>
                    <th className="crm-table-th">Общий долг</th>
                    <th className="crm-table-th">Скидка</th>
                    <th className="crm-table-th">Глубина долга</th>
                    <th className="crm-table-th">Ежемесячный платёж</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {groupedDebtorRows.length > 0 ? (
                    groupedDebtorRows.map((item, index) => {
                      const debtSeverity = getDebtSeverityMeta(item.debtMonths);

                      return (
                        <tr
                          key={item.studentId}
                          className="crm-table-row cursor-pointer"
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return;
                            if (item.isDeleted) {
                              pushToast({
                                message: 'Карточка ученика удалена или недоступна в текущем филиале',
                                tone: 'error',
                              });
                              return;
                            }
                            router.push(`/students/${item.studentId}`);
                          }}
                        >
                          <td className="crm-table-cell">{index + 1}</td>
                          <td className="crm-table-cell">
                            <div className="space-y-1.5">
                              {item.isDeleted ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8690a0]">
                                  {item.studentName}
                                  <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">
                                    Удален
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5">
                                  <Link
                                    href={`/students/${item.studentId}`}
                                    className={`text-sm font-semibold transition-colors hover:text-[#3568eb] hover:underline ${
                                      softDeletedStudentIds.has(item.studentId) ? 'text-gray-500 line-through' : 'text-[#202938]'
                                    }`}
                                  >
                                    {item.studentName}
                                  </Link>
                                  {softDeletedStudentIds.has(item.studentId) ? (
                                    <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                      Удалён
                                    </span>
                                  ) : null}
                                </span>
                              )}
                              <div className="text-xs text-[#8690a0]">
                                {item.courseNames.join(', ')}
                              </div>
                            </div>
                          </td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(item.totalDebt)}</td>
                          <td className="crm-table-cell">
                            {(() => {
                              const pct = item.discountPercent ?? studentDiscountMap.get(item.studentId) ?? null;
                              return pct != null && pct > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  {pct}%
                                </span>
                              ) : '—';
                            })()}
                          </td>
                          <td className="crm-table-cell">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${debtSeverity.color}`}
                              >
                                {debtSeverity.label}
                              </span>
                              <span className="text-sm text-[#667085]">{item.debtMonths} мес.</span>
                            </div>
                          </td>
                          <td className="crm-table-cell">{formatMoney(item.monthlyExpected)}</td>
                          <td className="crm-table-cell">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={Plus}
                                onClick={() =>
                                  openAddPayment({
                                    studentId: item.studentId,
                                    subscriptionId: item.subscriptionIds.length === 1 ? item.subscriptionIds[0] : undefined,
                                    lockStudent: true,
                                  })
                                }
                              >
                                Платёж
                              </Button>
                              {item.subscriptionIds.length === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => openKaspiInvoice(item.studentId, item.subscriptionIds[0])}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f1c4c8] bg-white transition-colors hover:bg-[#fff4f4] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/25"
                                  title="Выставить счёт Kaspi POS"
                                  aria-label={`Выставить счёт Kaspi POS для ${item.studentName}`}
                                >
                                  <Image src="/logo/kaspi.svg" alt="" width={22} height={22} />
                                </button>
                              ) : null}
                              <WhatsAppAction
                                phone={studentWhatsAppMap.get(item.studentId) || ''}
                                studentName={item.studentName}
                              />
                              <Link
                                href={`/finance/student-payments/${item.studentId}`}
                                className="inline-flex rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                                title="Открыть историю"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={7} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                        Должники не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <AddStudentPaymentModal
        key={paymentModalState.key}
        isOpen={paymentModalState.isOpen}
        onClose={closeAddPayment}
        onSave={handleCreatePayment}
        students={studentOptions}
        defaultStudentId={paymentModalState.studentId}
        lockStudent={paymentModalState.lockStudent}
        subscriptions={paymentSubscriptionOptions}
        defaultSubscriptionId={paymentModalState.subscriptionId}
        isSubmitting={createPaymentMutation.loading}
      />
      <ApiPayInvoiceModal
        isOpen={kaspiInvoiceModalState.isOpen}
        onClose={closeKaspiInvoice}
        initialStudentId={kaspiInvoiceModalState.studentId}
        initialSubscriptionId={kaspiInvoiceModalState.subscriptionId}
        initialMonth={selectedMonth}
      />
    </div>
  );
}
