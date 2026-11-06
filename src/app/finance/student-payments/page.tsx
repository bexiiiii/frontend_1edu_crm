'use client';

import { BadgeAlert, Calendar, CalendarDays, ChevronLeft, ChevronRight, Eye, Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { ExportExcelButton } from '@/components/analytics/ExportExcelButton';
import {
  listMonthsInRange,
  mapWithConcurrency,
  type ExcelExportPeriod,
  type ExcelSheet,
} from '@/lib/excel-export';
import { describeFilters } from '@/lib/excel-crm';
import { useUrlNumber, useUrlState } from '@/hooks/useUrlState';

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

/** Every subscription (the API returns at most 2000 per page). */
async function loadAllSubscriptions() {
  const first = await subscriptionsService.getAll({ page: 0, size: 2000 });
  const pages = first.data?.totalPages ?? 1;
  if (pages <= 1) return first;
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => subscriptionsService.getAll({ page: index + 1, size: 2000 })),
  );
  return { ...first, data: { ...first.data, content: [...(first.data?.content ?? []), ...rest.flatMap((item) => item.data?.content ?? [])] } };
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
  // Tab, filters and page live in the URL: «Назад» from a student returns to the same list.
  const [activeTabRaw, setActiveTab] = useUrlState('tab', 'OVERVIEW');
  const activeTab = activeTabRaw as StudentPaymentsTab;
  const [search, setSearch] = useUrlState('q');
  const [statusFilterRaw, setStatusFilter] = useUrlState('status', 'all');
  const statusFilter = statusFilterRaw as StudentPaymentMonthStatus | 'all';
  const [selectedMonth, setSelectedMonth] = useUrlState('month', getCurrentMonth());
  const [debtorStageRaw, setDebtorStageFilter] = useUrlState('stage', 'all');
  const debtorStageFilter = debtorStageRaw as DebtorStageFilter;
  const [debtorFromDate, setDebtorFromDate] = useUrlState('from');
  const [debtorToDate, setDebtorToDate] = useUrlState('to');
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

  const PAGE_SIZE = 50;
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  // The page number belongs to one set of filters: changing a filter starts again at page 1.
  const filterKey = [activeTab, debouncedSearch, statusFilter, selectedMonth, debtorStageFilter, debtorFromDate, debtorToDate].join('|');
  const [urlPage, setUrlPage] = useUrlNumber('page', 0);
  const [pageState, setPageState] = useState(() => ({ key: filterKey, page: urlPage }));
  const page = pageState.key === filterKey ? pageState.page : 0;
  useEffect(() => {
    setUrlPage(page);
  }, [page, setUrlPage]);
  const setPage = (update: (current: number) => number) =>
    setPageState((previous) => ({ key: filterKey, page: update(previous.key === filterKey ? previous.page : 0) }));

  // Every student / course / subscription is only needed by the payment form
  // (pickers); the tables come one page at a time from the server.
  const [lookupsWanted, setLookupsWanted] = useState(false);
  const { data: studentsPage } = useApi(
    () => (lookupsWanted
      ? studentsService.getAll({ page: 0, size: 5000, includeDeleted: true })
      : Promise.resolve({ data: null })),
    [lookupsWanted]
  );
  const { data: coursesPage } = useApi(
    () => (lookupsWanted ? coursesService.getAll({ page: 0, size: 1000 }) : Promise.resolve({ data: null })),
    [lookupsWanted]
  );
  const { data: subscriptionsPage } = useApi(async () => {
    if (!lookupsWanted) return { data: null };
    return loadAllSubscriptions();
  }, [lookupsWanted]);
  const {
    data: overviewPage,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi(
    () => (activeTab === 'OVERVIEW'
      ? studentPaymentsService.getOverviewPage({
          month: selectedMonth,
          page,
          size: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        })
      : Promise.resolve({ data: null })),
    [activeTab, selectedMonth, page, debouncedSearch, statusFilter]
  );
  const monthlyOverview = overviewPage;
  const {
    data: debtorsPage,
    loading: debtorsLoading,
    error: debtorsError,
    refetch: refetchDebtors,
  } = useApi(
    () => (activeTab === 'DEBTORS'
      ? studentPaymentsService.getDebtorsPage({
          month: selectedMonth || undefined,
          fromDate: debtorFromDate || undefined,
          toDate: debtorToDate || undefined,
          page,
          size: PAGE_SIZE,
          search: debouncedSearch || undefined,
          stage: debtorStageFilter === 'all' ? undefined : debtorStageFilter,
        })
      : Promise.resolve({ data: null })),
    [activeTab, selectedMonth, debtorFromDate, debtorToDate, page, debouncedSearch, debtorStageFilter]
  );
  const currentPage = activeTab === 'OVERVIEW' ? overviewPage : debtorsPage;

  const createPaymentMutation = useMutation((data: CreateStudentPaymentRequest) => studentPaymentsService.create(data));

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

  // Rows of the current page, folded per student on the server (same rules as before).
  const groupedOverviewRows = useMemo(
    () =>
      (overviewPage?.rows ?? []).map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        isDeleted: row.deleted,
        expected: row.expected ?? 0,
        paid: row.paid ?? 0,
        debt: row.debt ?? 0,
        status: (row.status ?? 'UNPAID') as StudentPaymentMonthStatus,
        courseNames: row.courseNames,
        subscriptionIds: row.subscriptionIds,
      })),
    [overviewPage]
  );
  const groupedDebtorRows = useMemo(
    () =>
      (debtorsPage?.rows ?? []).map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        isDeleted: row.deleted,
        totalDebt: row.totalDebt ?? 0,
        debtMonths: row.debtMonths ?? 0,
        monthlyExpected: row.monthlyExpected ?? 0,
        discountPercent: row.discountPercent ?? null,
        courseNames: row.courseNames,
        subscriptionIds: row.subscriptionIds,
      })),
    [debtorsPage]
  );
  const pageRows = useMemo(() => currentPage?.rows ?? [], [currentPage]);
  const softDeletedStudentIds = useMemo(
    () => new Set(pageRows.filter((row) => row.deleted).map((row) => row.studentId)),
    [pageRows]
  );
  const rowWhatsAppMap = useMemo(() => new Map(pageRows.map((row) => [row.studentId, row.phone])), [pageRows]);
  const rowDiscountMap = useMemo(
    () => new Map(pageRows.map((row) => [row.studentId, row.studentDiscountPercent ?? null])),
    [pageRows]
  );

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
        value: String(debtorsPage?.filteredStudents ?? 0),
        cardClass: 'border-[#dbe2e8] bg-[#f8fafc]',
        valueClass: 'text-[#1f2530]',
      },
      {
        label: 'Общий долг',
        value: formatMoney(debtorsPage?.debtorsTotalDebt ?? 0),
        cardClass: 'border-rose-100 bg-rose-50',
        valueClass: 'text-rose-700',
      },
      {
        label: 'Средний долг',
        value: formatMoney(debtorsPage?.debtorsAverageDebt ?? 0),
        cardClass: 'border-amber-100 bg-amber-50',
        valueClass: 'text-amber-700',
      },
      {
        label: 'Критичные кейсы',
        value: String(debtorsPage?.debtorsCritical ?? 0),
        cardClass: 'border-[#dbe2e8] bg-white',
        valueClass: 'text-[#1f2530]',
      },
    ],
    [debtorsPage]
  );

  const openAddPayment = (options?: { studentId?: string; subscriptionId?: string; lockStudent?: boolean }) => {
    setLookupsWanted(true);
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

  // Excel exports list every subscription: load names, phones and courses only when exporting.
  const loadExportLookups = async () => {
    const [studentsResponse, coursesResponse, subscriptionsResponse] = await Promise.all([
      studentsService.getAll({ page: 0, size: 5000, includeDeleted: true }),
      coursesService.getAll({ page: 0, size: 1000 }),
      loadAllSubscriptions(),
    ]);
    const students = studentsResponse.data?.content ?? [];
    const courseNames = new Map((coursesResponse.data?.content ?? []).map((course) => [course.id, course.name]));
    return {
      studentMap: new Map(students.map((student) => [
        student.id,
        getStudentFullName(student) || student.email || student.phone || student.id,
      ])),
      studentWhatsAppMap: new Map(students.map((student) => [student.id, getStudentWhatsAppPhone(student)])),
      studentDiscountMap: new Map(students.map((student) => [student.id, student.discountPercent ?? null])),
      deletedIds: new Set(students.filter((student) => student.deleted).map((student) => student.id)),
      subscriptionMetaMap: new Map((subscriptionsResponse.data?.content ?? []).map((subscription) => [
        subscription.id,
        { courseName: subscription.courseId ? courseNames.get(subscription.courseId) || 'Без курса' : 'Без курса' },
      ])),
    };
  };

  // «Скачать в Excel» — «Платежи студентов»: monthly overview for every month of the chosen period.
  const buildPaymentsExcel = async (period: ExcelExportPeriod): Promise<ExcelSheet[]> => {
    const months = listMonthsInRange(period.from, period.to);
    const { studentMap, subscriptionMetaMap, studentWhatsAppMap } = await loadExportLookups();
    const overviews = await mapWithConcurrency(months, 4, (month) =>
      studentPaymentsService.getMonthlyOverview({ month }).then((response) => response.data));
    const query = search.trim().toLowerCase();

    const firstWithData = period.allTime ? overviews.findIndex((item) => (item?.students?.length ?? 0) > 0) : 0;
    const used = firstWithData < 0 ? [] : overviews.slice(firstWithData);

    const detailRows = used.flatMap((overview) =>
      (overview?.students ?? [])
        .map((item) => {
          const studentName = (item as { fullName?: string }).fullName || studentMap.get(item.studentId) || 'Ученик удален';
          const courseName = subscriptionMetaMap.get(item.subscriptionId)?.courseName || `Абонемент #${shortId(item.subscriptionId)}`;
          return { item, studentName, courseName };
        })
        .filter(({ item, studentName, courseName }) => {
          const haystack = [studentName, courseName, item.subscriptionId, STUDENT_PAYMENT_STATUS_LABELS[item.status]]
            .join(' ').toLowerCase();
          if (query && !haystack.includes(query)) return false;
          return statusFilter === 'all' || item.status === statusFilter;
        })
        .sort((left, right) => left.studentName.localeCompare(right.studentName, 'ru'))
        .map(({ item, studentName, courseName }) => [
          formatMonthLabel(overview?.month || ''),
          studentName,
          studentWhatsAppMap.get(item.studentId) || '',
          courseName,
          item.expected,
          item.paid,
          item.debt,
          item.advanceApplied ?? null,
          item.discountPercent ?? null,
          STUDENT_PAYMENT_STATUS_LABELS[item.status] ?? item.status,
        ]));

    return [
      {
        name: 'Платежи студентов',
        tables: [{
          columns: [
            { header: 'Месяц' },
            { header: 'Ученик' },
            { header: 'Телефон' },
            { header: 'Курс / абонемент' },
            { header: 'Ожидалось, ₸', type: 'money' },
            { header: 'Оплачено, ₸', type: 'money' },
            { header: 'Осталось, ₸', type: 'money' },
            { header: 'Зачтено аванса, ₸', type: 'money' },
            { header: 'Скидка, %', type: 'number' },
            { header: 'Статус' },
          ],
          rows: detailRows,
        }],
      },
      {
        name: 'Итоги по месяцам',
        tables: [{
          columns: [
            { header: 'Месяц' },
            { header: 'Учеников', type: 'number' },
            { header: 'Оплатили', type: 'number' },
            { header: 'Частично', type: 'number' },
            { header: 'Не оплатили', type: 'number' },
            { header: 'Ожидалось, ₸', type: 'money' },
            { header: 'Собрано, ₸', type: 'money' },
            { header: 'Осталось, ₸', type: 'money' },
          ],
          rows: used.map((overview) => [
            formatMonthLabel(overview?.month || ''),
            overview?.totalStudents ?? 0,
            overview?.paidCount ?? 0,
            overview?.partialCount ?? 0,
            overview?.unpaidCount ?? 0,
            overview?.totalExpected ?? 0,
            overview?.totalCollected ?? 0,
            overview?.totalDebt ?? 0,
          ]),
        }],
      },
    ];
  };

  // «Скачать в Excel» — «Должники»: current list with the active filters.
  const buildDebtorsExcel = async (): Promise<ExcelSheet[]> => {
    const debtorParams = {
      month: selectedMonth || undefined,
      fromDate: debtorFromDate || undefined,
      toDate: debtorToDate || undefined,
      search: debouncedSearch || undefined,
      stage: debtorStageFilter === 'all' ? undefined : debtorStageFilter,
    };
    const [lookups, firstPage, allDebtors] = await Promise.all([
      loadExportLookups(),
      studentPaymentsService.getDebtorsPage({ ...debtorParams, page: 0, size: 500 }),
      studentPaymentsService.getDebtors({ month: debtorParams.month, fromDate: debtorParams.fromDate, toDate: debtorParams.toDate }),
    ]);
    const { studentMap, subscriptionMetaMap, studentWhatsAppMap, studentDiscountMap, deletedIds } = lookups;
    const restPages = await Promise.all(
      Array.from({ length: Math.max(0, (firstPage.data?.totalPages ?? 1) - 1) }, (_, index) =>
        studentPaymentsService.getDebtorsPage({ ...debtorParams, page: index + 1, size: 500 })),
    );
    const allGroupedRows = [firstPage, ...restPages].flatMap((response) => response.data?.rows ?? []);
    const query = debouncedSearch.toLowerCase();
    const debtorRows = (allDebtors.data ?? []).filter((item) => {
      const studentName = item.fullName || studentMap.get(item.studentId) || item.studentId;
      const haystack = [studentName, subscriptionMetaMap.get(item.subscriptionId)?.courseName || '', item.subscriptionId].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (debtorStageFilter === 'two_plus' && item.debtMonths < 2) return false;
      if (debtorStageFilter === 'three_plus' && item.debtMonths < 3) return false;
      return true;
    });
    return [
    {
      name: 'Должники',
      tables: [{
        columns: [
          { header: '№', type: 'number' },
          { header: 'Ученик' },
          { header: 'Телефон' },
          { header: 'Курсы / абонементы' },
          { header: 'Общий долг, ₸', type: 'money' },
          { header: 'Глубина долга, мес.', type: 'number' },
          { header: 'Ежемесячный платёж, ₸', type: 'money' },
          { header: 'Скидка, %', type: 'number' },
          { header: 'Удалён' },
        ],
        rows: allGroupedRows.map((row, index) => [
          index + 1,
          row.studentName,
          row.phone || studentWhatsAppMap.get(row.studentId) || '',
          row.courseNames.join(', '),
          row.totalDebt ?? 0,
          row.debtMonths ?? 0,
          row.monthlyExpected ?? 0,
          row.discountPercent ?? row.studentDiscountPercent ?? studentDiscountMap.get(row.studentId) ?? null,
          row.deleted || deletedIds.has(row.studentId) ? 'Да' : '',
        ]),
      }],
    },
    {
      name: 'По абонементам',
      tables: [{
        columns: [
          { header: 'Ученик' },
          { header: 'Курс / абонемент' },
          { header: 'Долг, ₸', type: 'money' },
          { header: 'Глубина долга, мес.', type: 'number' },
          { header: 'Ежемесячный платёж, ₸', type: 'money' },
          { header: 'Скидка, %', type: 'number' },
        ],
        rows: debtorRows.map((item) => [
          item.fullName || studentMap.get(item.studentId) || 'Ученик удален',
          subscriptionMetaMap.get(item.subscriptionId)?.courseName || `Абонемент #${shortId(item.subscriptionId)}`,
          item.totalDebt,
          item.debtMonths,
          item.monthlyExpected,
          item.discountPercent ?? null,
        ]),
      }],
    },
    ];
  };

  const monthStart = `${selectedMonth}-01`;
  const monthEnd = (() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return year && month ? `${selectedMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` : monthStart;
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {activeTab === 'OVERVIEW' ? (
          <ExportExcelButton
            page="student-payments"
            filePrefix=""
            reportTitle="Платежи студентов"
            note={describeFilters([
              statusFilter !== 'all' && `статус «${STUDENT_PAYMENT_STATUS_LABELS[statusFilter]}»`,
              search.trim() && `поиск «${search.trim()}»`,
            ])}
            defaultRange={{ from: monthStart, to: monthEnd }}
            buildSheets={buildPaymentsExcel}
            hint="Данные выгружаются по полным месяцам."
          />
        ) : (
          <ExportExcelButton
            page="debtors"
            filePrefix=""
            reportTitle="Должники"
            note={describeFilters([
              debtorStageFilter === 'two_plus' && 'долг от 2 месяцев',
              debtorStageFilter === 'three_plus' && 'долг от 3 месяцев',
              (debtorFromDate || debtorToDate) && `период ${debtorFromDate || '…'} — ${debtorToDate || '…'}`,
              search.trim() && `поиск «${search.trim()}»`,
            ])}
            buildSnapshot={buildDebtorsExcel}
            disabled={debtorsLoading}
          />
        )}
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
                Должников: <span className="font-semibold text-gray-900">{debtorsPage?.filteredStudents ?? 0}</span>
              </p>
              <p className="text-sm font-medium text-gray-700">
                Общий долг: <span className="font-semibold text-rose-700">{formatMoney(debtorsPage?.debtorsTotalDebt ?? 0)}</span>
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
                                phone={rowWhatsAppMap.get(item.studentId) || ''}
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
                            </div>
                          </td>
                          <td className="crm-table-cell text-rose-700">{formatMoney(item.totalDebt)}</td>
                          <td className="crm-table-cell">
                            {(() => {
                              const pct = item.discountPercent ?? rowDiscountMap.get(item.studentId) ?? null;
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
                                phone={rowWhatsAppMap.get(item.studentId) || ''}
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
        {currentPage && currentPage.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ebf0] px-5 py-3 text-sm text-[#5d6676]">
            <span>
              Страница {currentPage.page + 1} из {currentPage.totalPages} · учеников: {currentPage.filteredStudents}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={isTableLoading || currentPage.page <= 0}
              >
                Назад
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((value) => Math.min(currentPage.totalPages - 1, value + 1))}
                disabled={isTableLoading || currentPage.page >= currentPage.totalPages - 1}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
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
