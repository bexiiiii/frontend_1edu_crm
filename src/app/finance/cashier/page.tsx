'use client';

import Link from 'next/link';

import { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  FileText,
  History,
  Layers,
  Loader2,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/vercel-tabs';
import {
  cashierService,
  getUsers,
  staffService,
  type CashDailyReportDto,
  type CashOperationDto,
  type CashShiftDto,
  type CashierPolicyDto,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const money = (amount: number | null | undefined = 0) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount ?? 0) + ' ₸';

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatTimeOnly = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

type PolicyDraft = Omit<CashierPolicyDto, 'id'>;

const newPolicy = (): PolicyDraft => ({
  cashierUserId: '',
  branchId: null,
  canOpenShift: true,
  canAcceptPayment: true,
  canDeletePayment: false,
  canMakeExpense: false,
  canPaySalary: false,
  canCloseShift: true,
  canViewReports: true,
  expenseLimit: 0,
  active: true,
});

export default function CashierPage() {
  const { user: currentUser, roles } = useAuthStore();
  const isManager = roles.includes('MANAGER') && !roles.some((role) => role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN');
  const cashierTabs = isManager
    ? [{ id: 'report', label: 'Дневной кассовый отчёт и операции' }]
    : [
        { id: 'report', label: 'Дневной кассовый отчёт и операции' },
        { id: 'shifts', label: 'История смен кассы' },
        { id: 'policies', label: 'Права и лимиты кассиров' },
      ];
  const [activeTab, setActiveTab] = useState<'report' | 'shifts' | 'policies'>('report');
  const [date, setDate] = useState(today());
  const [shiftsFrom, setShiftsFrom] = useState(daysAgo(60));
  const [shiftsTo, setShiftsTo] = useState(today());
  const [shiftsStatusFilter, setShiftsStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all');

  // Filters for daily operations
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [policyModal, setPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CashierPolicyDto | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(newPolicy);

  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openFloatInput, setOpenFloatInput] = useState('0');

  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeRecipientId, setCloseRecipientId] = useState('');
  const [closeNoteInput, setCloseNoteInput] = useState('');

  const [newOpModal, setNewOpModal] = useState(false);
  const [newOpType, setNewOpType] = useState<'EXPENSE' | 'SALARY' | 'DEPOSIT' | 'WITHDRAWAL'>('EXPENSE');
  const [newOpAmount, setNewOpAmount] = useState('');
  const [newOpCategory, setNewOpCategory] = useState('');
  const [newOpReason, setNewOpReason] = useState('');

  const [selectedShiftForOps, setSelectedShiftForOps] = useState<CashShiftDto | null>(null);
  const [shiftOpsModal, setShiftOpsModal] = useState(false);
  const [shiftOpsList, setShiftOpsList] = useState<CashOperationDto[]>([]);
  const [shiftOpsLoading, setShiftOpsLoading] = useState(false);

  // Queries
  const { data: shift, loading: shiftLoading, refetch: refetchShift } = useApi(
    () => cashierService.getActiveShift(),
    []
  );

  const { data: report, loading: reportLoading, refetch: refetchReport } = useApi(
    () => cashierService.getDailyReport(date),
    [date]
  );

  const { data: operations, loading: opsLoading, refetch: refetchOperations } = useApi(
    () => cashierService.getHistory({ from: date, to: date }),
    [date]
  );

  const { data: allShifts, loading: shiftsLoading, refetch: refetchShifts } = useApi(
    () => isManager ? Promise.resolve({ data: [] as CashShiftDto[] }) : cashierService.getShifts({ from: shiftsFrom, to: shiftsTo }),
    [shiftsFrom, shiftsTo, isManager]
  );

  const { data: policies, loading: policiesLoading, refetch: refetchPolicies } = useApi(
    () => isManager ? Promise.resolve({ data: [] as CashierPolicyDto[] }) : cashierService.getPolicies(),
    [isManager]
  );

  const { data: users } = useApi(() => getUsers({ size: 500 }), []);
  const { data: staffPage } = useApi(() => staffService.getAll({ page: 0, size: 1000 }), []);

  const [newOpStaffId, setNewOpStaffId] = useState('');
  const [newOpSalaryMonth, setNewOpSalaryMonth] = useState(today().slice(0, 7));

  const usersById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);
  const canDeletePayment = useMemo(() => {
    const own = (policies ?? []).find((policy) => policy.cashierUserId === currentUser?.id && policy.active);
    if (own) return own.canDeletePayment;
    return roles.some((role) => ['TENANT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(role));
  }, [currentUser?.id, policies, roles]);

  const getUserDisplayName = (userId?: string | null, fallbackName?: string | null) => {
    if (!userId && !fallbackName) return '—';
    if (userId && usersById.has(userId)) {
      const u = usersById.get(userId)!;
      const full = `${u.lastName || ''} ${u.firstName || ''}`.trim();
      return full || u.username || u.email || userId;
    }
    if (fallbackName && usersById.has(fallbackName)) {
      const u = usersById.get(fallbackName)!;
      const full = `${u.lastName || ''} ${u.firstName || ''}`.trim();
      return full || u.username || u.email || fallbackName;
    }
    return fallbackName || userId || '—';
  };

  const refreshAll = () => {
    refetchShift();
    refetchReport();
    refetchOperations();
    refetchShifts();
    refetchPolicies();
    pushToast({ message: 'Данные кассы обновлены.', tone: 'info' });
  };

  // Date stepper
  const stepDate = (deltaDays: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  // Filtered daily operations
  const filteredOperations = useMemo(() => {
    return (operations ?? []).filter((op) => {
      if (operationTypeFilter !== 'all' && op.type !== operationTypeFilter) return false;
      if (paymentMethodFilter !== 'all' && op.paymentMethod !== paymentMethodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const student = (op.studentName || '').toLowerCase();
        const reason = (op.reason || '').toLowerCase();
        const receipt = (op.receiptNumber || '').toLowerCase();
        const cashier = (op.cashierName || op.cashierUserId || '').toLowerCase();
        const method = (op.paymentMethod || '').toLowerCase();
        if (
          !student.includes(q) &&
          !reason.includes(q) &&
          !receipt.includes(q) &&
          !cashier.includes(q) &&
          !method.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [operations, operationTypeFilter, paymentMethodFilter, searchQuery]);

  // Filtered shifts
  const filteredShifts = useMemo(() => {
    return (allShifts ?? []).filter((s) => {
      if (shiftsStatusFilter !== 'all' && s.status !== shiftsStatusFilter) return false;
      return true;
    });
  }, [allShifts, shiftsStatusFilter]);

  // Open shift handler
  const handleOpenShift = async () => {
    const floatVal = parseFloat(openFloatInput);
    if (isNaN(floatVal) || floatVal < 0) {
      pushToast({ message: 'Введите корректную сумму начального остатка', tone: 'error' });
      return;
    }
    try {
      const cashierName = currentUser
        ? `${currentUser.lastName || ''} ${currentUser.firstName || ''}`.trim() || currentUser.username
        : undefined;
      await cashierService.openShift({ openingFloat: floatVal, cashierName });
      pushToast({ message: 'Смена успешно открыта!', tone: 'success' });
      setOpenShiftModal(false);
      refetchShift();
      refetchShifts();
      refetchReport();
    } catch (e: any) {
      pushToast({ message: e?.response?.data?.message || 'Не удалось открыть смену', tone: 'error' });
    }
  };

  // Close shift handler
  const handleCloseShift = async () => {
    const actualVal = parseFloat(actualCashInput);
    if (isNaN(actualVal) || actualVal < 0) {
      pushToast({ message: 'Введите фактическую сумму в кассе при закрытии', tone: 'error' });
      return;
    }
    if (!closeRecipientId) {
      pushToast({ message: 'Выберите администратора, которому передаётся касса', tone: 'error' });
      return;
    }
    try {
      await cashierService.closeShift({
        actualCash: actualVal,
        recipientUserId: closeRecipientId,
        closingNote: closeNoteInput.trim() || undefined,
      });
      pushToast({ message: 'Смена успешно закрыта!', tone: 'success' });
      setCloseShiftModal(false);
      refetchShift();
      refetchShifts();
      refetchReport();
      refetchOperations();
    } catch (e: any) {
      pushToast({ message: e?.response?.data?.message || 'Не удалось закрыть смену', tone: 'error' });
    }
  };

  // Create operation handler
  const handleCreateOperation = async () => {
    const amountVal = parseFloat(newOpAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      pushToast({ message: 'Введите положительную сумму операции', tone: 'error' });
      return;
    }
    if (!newOpReason.trim()) {
      pushToast({ message: 'Укажите обоснование или комментарий операции', tone: 'error' });
      return;
    }
    try {
      await cashierService.createOperation({
        type: newOpType,
        amount: amountVal,
        category: newOpCategory.trim() || undefined,
        reason: newOpReason.trim(),
        staffId: newOpType === 'SALARY' && newOpStaffId ? newOpStaffId : undefined,
        salaryMonth: newOpType === 'SALARY' ? newOpSalaryMonth : undefined,
      });
      pushToast({ message: 'Операция успешно проведена в кассе!', tone: 'success' });
      setNewOpModal(false);
      setNewOpAmount('');
      setNewOpCategory('');
      setNewOpReason('');
      setNewOpStaffId('');
      setNewOpSalaryMonth(today().slice(0, 7));
      refetchOperations();
      refetchReport();
      refetchShift();
      refetchShifts();
    } catch (e: any) {
      pushToast({ message: e?.response?.data?.message || 'Не удалось провести операцию', tone: 'error' });
    }
  };

  // View operations for a specific shift
  const openShiftOperations = async (s: CashShiftDto) => {
    setSelectedShiftForOps(s);
    setShiftOpsModal(true);
    setShiftOpsLoading(true);
    try {
      const res = await cashierService.getShiftOperationsById(s.id);
      setShiftOpsList(res.data || []);
    } catch (e) {
      setShiftOpsList([]);
    } finally {
      setShiftOpsLoading(false);
    }
  };

  // Policy handlers
  const savePolicy = useMutation((payload: { id?: string; data: PolicyDraft }) =>
    payload.id ? cashierService.updatePolicy(payload.id, payload.data) : cashierService.createPolicy(payload.data)
  );

  const openCreatePolicy = () => {
    setEditingPolicy(null);
    setPolicyDraft(newPolicy());
    setPolicyModal(true);
  };

  const openEditPolicy = (policy: CashierPolicyDto) => {
    setEditingPolicy(policy);
    const { id: _id, ...value } = policy;
    setPolicyDraft(value);
    setPolicyModal(true);
  };

  const submitPolicy = async () => {
    if (!policyDraft.cashierUserId) {
      pushToast({ message: 'Выберите сотрудника для кассовых прав.', tone: 'error' });
      return;
    }
    const result = await savePolicy.mutate({ id: editingPolicy?.id, data: policyDraft });
    if (result) {
      setPolicyModal(false);
      refetchPolicies();
      pushToast({
        message: editingPolicy ? 'Права кассира обновлены.' : 'Права кассира сохранены.',
        tone: 'success',
      });
    }
  };

  const deletePayment = async (operation: CashOperationDto) => {
    if (!window.confirm(`Пометить оплату ${operation.receiptNumber || ''} как удалённую? Чек останется в истории, но его нельзя будет открыть или напечатать.`)) return;
    try {
      await cashierService.deletePayment(operation.id);
      pushToast({ message: 'Оплата помечена как удалённая.', tone: 'success' });
      refetchOperations(); refetchReport(); refetchShift();
    } catch (e: any) {
      pushToast({ message: e?.response?.data?.message || 'Не удалось удалить оплату', tone: 'error' });
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1c2530]">Касса</h1>
        </div>
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
          <Button variant="secondary" icon={RefreshCw} onClick={refreshAll}>
            Обновить
          </Button>
          {shiftLoading ? null : !shift ? (
            <Button
              variant="primary"
              icon={Plus}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setOpenFloatInput('0');
                setOpenShiftModal(true);
              }}
            >
              Открыть смену
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => {
                  setNewOpType('EXPENSE');
                  setNewOpAmount('');
                  setNewOpCategory('');
                  setNewOpReason('');
                  setNewOpModal(true);
                }}
              >
                Новая операция
              </Button>
              <Button
                variant="danger"
                icon={Clock}
                onClick={() => {
                  setActualCashInput(report?.expectedCash ? String(report.expectedCash) : '0');
                  setCloseRecipientId('');
                  setCloseNoteInput('');
                  setCloseShiftModal(true);
                }}
              >
                Закрыть смену
              </Button>
            </>
          )}
          {activeTab === 'policies' && (
            <Button icon={Plus} onClick={openCreatePolicy}>
              Назначить кассира
            </Button>
          )}
        </div>
      </div>

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={WalletCards}
          label="Текущая смена"
          value={shiftLoading ? '…' : shift ? 'Открыта' : 'Закрыта'}
          subtext={
            shift
              ? `${getUserDisplayName(shift.cashierUserId, shift.cashierName)} · с ${formatTimeOnly(shift.openedAt)}`
              : 'Смена не открыта'
          }
          accent={shift ? 'text-emerald-600' : 'text-slate-600'}
        />
        <SummaryCard
          icon={Coins}
          label="Наличный приход"
          value={reportLoading ? '…' : money(report?.cashIncome)}
          subtext="В кассу за день"
          accent="text-emerald-600"
        />
        <SummaryCard
          icon={CreditCard}
          label="Kaspi приход"
          value={reportLoading ? '…' : money(report?.nonCashIncome)}
          subtext="POS, QR, Переводы"
          accent="text-red-600"
        />
        <SummaryCard
          icon={BadgeDollarSign}
          label="Расходы и Зарплаты"
          value={reportLoading ? '…' : money((report?.expenses ?? 0) + (report?.salaries ?? 0))}
          subtext={`Расх: ${money(report?.expenses)} · ЗП: ${money(report?.salaries)}`}
          accent="text-amber-600"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Ожидаемо в кассе"
          value={reportLoading ? '…' : money(report?.expectedCash)}
          subtext={`${report?.operationsCount ?? 0} операций · ${report?.receiptsCount ?? 0} чеков`}
          accent="text-blue-600"
        />
      </div>

      {/* Main navigation tabs */}
      <Tabs
        tabs={cashierTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ДНЕВНОЙ КАССОВЫЙ ОТЧЁТ И ОПЕРАЦИИ
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#e0e7ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-[#edf1f4] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#27303c]">Дневной кассовый отчёт</h2>
              </div>

              {/* Date navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => stepDate(-1)} title="Предыдущий день">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setDate(today())}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    date === today()
                      ? 'border-[#467aff] bg-[#eef4ff] text-[#467aff]'
                      : 'border-[#dbe2e8] bg-white text-[#536071] hover:bg-slate-50'
                  }`}
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  onClick={() => setDate(daysAgo(1))}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    date === daysAgo(1)
                      ? 'border-[#467aff] bg-[#eef4ff] text-[#467aff]'
                      : 'border-[#dbe2e8] bg-white text-[#536071] hover:bg-slate-50'
                  }`}
                >
                  Вчера
                </button>
                <Button size="sm" variant="outline" onClick={() => stepDate(1)} title="Следующий день">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm text-[#536071]">
                  <CalendarDays className="h-4 w-4 text-[#8491a0]" />
                  <input
                    className="bg-transparent text-sm outline-none"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col gap-3 border-b border-[#edf1f4] bg-[#fbfcfd] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8491a0]" />
                  <input
                    type="text"
                    placeholder="Поиск (студент, телефон, чек, кассир)…"
                    className="h-9 w-full rounded-xl border border-[#dbe2e8] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#467aff]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="h-9 rounded-xl border border-[#dbe2e8] bg-white px-3 text-xs outline-none focus:border-[#467aff]"
                  value={operationTypeFilter}
                  onChange={(e) => setOperationTypeFilter(e.target.value)}
                >
                  <option value="all">Все операции</option>
                  <option value="PAYMENT">Оплаты обучения</option>
                  <option value="EXPENSE">Расходы</option>
                  <option value="SALARY">Зарплаты</option>
                  <option value="DEPOSIT">Внесения (Инкассация)</option>
                  <option value="WITHDRAWAL">Изъятия (Инкассация)</option>
                </select>

                <select
                  className="h-9 rounded-xl border border-[#dbe2e8] bg-white px-3 text-xs outline-none focus:border-[#467aff]"
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                >
                  <option value="all">Все каналы оплаты</option>
                  <option value="CASH">Наличные</option>
                  <option value="KASPI_POS">Kaspi POS</option>
                  <option value="KASPI_QR">Kaspi QR</option>
                  <option value="KASPI_TRANSFER">Kaspi Перевод</option>
                </select>
              </div>

              <div className="text-xs text-[#8491a0]">
                Найдено: <strong className="text-[#27303c]">{filteredOperations.length}</strong> операций
              </div>
            </div>

            {/* Operations table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#f8fafb] text-xs font-semibold uppercase tracking-wide text-[#8491a0]">
                  <tr>
                    <th className="px-5 py-3">Время</th>
                    <th className="px-5 py-3">Тип</th>
                    <th className="px-5 py-3">Канал / Способ</th>
                    <th className="px-5 py-3">Студент / Назначение</th>
                    <th className="px-5 py-3">Чек / Документ</th>
                    <th className="px-5 py-3">Кассир</th>
                    <th className="px-5 py-3 text-right">Сумма</th>
                    <th className="px-5 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f4] text-[#3f4b5a]">
                  {filteredOperations.filter((op) => !op.deleted).map((op) => {
                    const isIncome = op.type === 'PAYMENT' || op.type === 'DEPOSIT';
                    const cashierName = getUserDisplayName(op.cashierUserId, op.cashierName);

                    return (
                      <tr key={op.id} className={op.deleted ? 'bg-slate-50 text-slate-400 line-through opacity-70' : 'hover:bg-slate-50/70 transition-colors'}>
                        {/* Time */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-[#536071]">
                          {formatTimeOnly(op.occurredAt)}
                        </td>

                        {/* Operation Type */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <OperationTypeBadge type={op.type} />
                        </td>

                        {/* Payment Method / Channel */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <PaymentMethodBadge method={op.paymentMethod} />
                        </td>

                        {/* Student / Description */}
                        <td className="px-5 py-4 max-w-[320px]">
                          {op.type === 'PAYMENT' && op.studentName ? (
                            <div>
                              {op.studentId && !op.deleted ? (
                                <Link
                                  href={`/students/${op.studentId}`}
                                  className="font-semibold text-[#467aff] hover:underline"
                                >
                                  {op.studentName}
                                </Link>
                              ) : (
                                <span className="font-semibold text-[#1c2530]">{op.studentName}</span>
                              )}
                              {op.courseNames && (
                                <span className="block text-xs text-[#738294] truncate">{op.courseNames}</span>
                              )}
                              {op.reason && op.reason.includes('Kaspi:') && (
                                <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                  <Phone className="h-3 w-3" />
                                  {op.reason.split('Kaspi:')[1].trim()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-sm text-[#27303c] font-medium">{op.reason || '—'}</span>
                              {op.category && (
                                <span className="block text-xs text-[#8491a0]">Статья: {op.category}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Receipt */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-[#738294]">
                          {op.receiptNumber && !op.deleted ? (
                            <span className="rounded bg-slate-100 px-2 py-1 text-[#334155]">
                              {op.receiptNumber}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Cashier */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-[#536071]">
                          {cashierName}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              op.deleted ? 'text-slate-400' : isIncome ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'}&nbsp;{money(op.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {op.deleted ? (
                            <span className="text-xs font-semibold text-slate-400 no-underline" title={`${op.deletedBy || ''} ${formatDateTime(op.deletedAt)}`.trim()}>
                              Удалено{op.deletedBy ? ` (${op.deletedBy})` : ''}
                            </span>
                          ) : op.type === 'PAYMENT' && canDeletePayment ? (
                            <button type="button" onClick={() => void deletePayment(op)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Удалить</button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {!opsLoading && filteredOperations.length === 0 && (
                    <tr>
                      <td className="px-5 py-12 text-center text-[#8491a0]" colSpan={8}>
                        <div className="mx-auto max-w-sm text-center">
                          <Receipt className="mx-auto h-8 w-8 text-[#cbd5e1] mb-2" />
                          <p className="font-medium text-[#27303c]">Нет кассовых операций за {date}</p>
                          <p className="text-xs text-[#8491a0] mt-1">
                            В этот день операции не совершались либо не подходят под выбранные фильтры.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ИСТОРИЯ СМЕН КАССЫ
          ───────────────────────────────────────────────────────────── */}
      {!isManager && activeTab === 'shifts' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#e0e7ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {/* Header & Date Range */}
            <div className="flex flex-col gap-4 border-b border-[#edf1f4] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#27303c]">История смен кассы</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-3 text-xs text-[#536071]">
                  <span>От:</span>
                  <input
                    className="bg-transparent outline-none"
                    type="date"
                    value={shiftsFrom}
                    onChange={(e) => setShiftsFrom(e.target.value)}
                  />
                </label>
                <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-3 text-xs text-[#536071]">
                  <span>До:</span>
                  <input
                    className="bg-transparent outline-none"
                    type="date"
                    value={shiftsTo}
                    onChange={(e) => setShiftsTo(e.target.value)}
                  />
                </label>
                <select
                  className="h-9 rounded-xl border border-[#dbe2e8] bg-white px-3 text-xs outline-none focus:border-[#467aff]"
                  value={shiftsStatusFilter}
                  onChange={(e) => setShiftsStatusFilter(e.target.value as any)}
                >
                  <option value="all">Все статусы</option>
                  <option value="OPEN">Только открытые</option>
                  <option value="CLOSED">Только закрытые</option>
                </select>
              </div>
            </div>

            {/* Table of shifts */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#f8fafb] text-xs font-semibold uppercase tracking-wide text-[#8491a0]">
                  <tr>
                    <th className="px-5 py-3">Статус</th>
                    <th className="px-5 py-3">Кто открыл</th>
                    <th className="px-5 py-3">Открытие (Сумма / Время)</th>
                    <th className="px-5 py-3">Кто закрыл / Кому передал</th>
                    <th className="px-5 py-3">Закрытие (Время)</th>
                    <th className="px-5 py-3">Ожидаемо</th>
                    <th className="px-5 py-3">Фактически</th>
                    <th className="px-5 py-3">Расхождение</th>
                    <th className="px-5 py-3">Передача</th>
                    <th className="px-5 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f4] text-[#3f4b5a]">
                  {filteredShifts.map((s) => {
                    const isOpen = s.status === 'OPEN';
                    const diff = s.differenceAmount ?? (s.actualCash != null && s.expectedCash != null ? s.actualCash - s.expectedCash : 0);
                    const opener = getUserDisplayName(s.cashierUserId, s.cashierName);
                    const recipient = getUserDisplayName(s.recipientUserId, s.recipientName);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Открыта
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Закрыта
                            </span>
                          )}
                        </td>

                        {/* Who opened */}
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-[#1c2530]">
                          {opener}
                        </td>

                        {/* Opening */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-[#27303c]">{money(s.openingFloat)}</span>
                          <span className="block text-xs text-[#8491a0]">{formatDateTime(s.openedAt)}</span>
                        </td>

                        {/* Who closed / recipient */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="text-xs text-[#8491a0]">В процессе работы…</span>
                          ) : (
                            <div>
                              <span className="text-xs font-medium text-[#27303c]">{opener}</span>
                              {recipient && recipient !== '—' && (
                                <span className="block text-xs text-[#8491a0]">
                                  Кому: {recipient}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Closed at */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-[#536071]">
                          {s.closedAt ? formatDateTime(s.closedAt) : '—'}
                        </td>

                        {/* Expected Cash */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-[#536071]">
                          {s.expectedCash != null ? money(s.expectedCash) : '—'}
                        </td>

                        {/* Actual Cash */}
                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-[#1c2530]">
                          {s.actualCash != null ? money(s.actualCash) : '—'}
                        </td>

                        {/* Discrepancy */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="text-xs text-[#8491a0]">—</span>
                          ) : diff === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              0 ₸ (В норме)
                            </span>
                          ) : diff > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              +{money(diff)} (Излишек)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              {money(diff)} (Недостача)
                            </span>
                          )}
                        </td>

                        {/* Handover status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isOpen ? (
                            '—'
                          ) : s.handoverAccepted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Принята
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                              <Clock className="h-3.5 w-3.5" />
                              Ожидает
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openShiftOperations(s)}
                          >
                            Операции
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {!shiftsLoading && filteredShifts.length === 0 && (
                    <tr>
                      <td className="px-5 py-12 text-center text-[#8491a0]" colSpan={10}>
                        <div className="mx-auto max-w-sm text-center">
                          <History className="mx-auto h-8 w-8 text-[#cbd5e1] mb-2" />
                          <p className="font-medium text-[#27303c]">История смен пуста</p>
                          <p className="text-xs text-[#8491a0] mt-1">
                            За выбранный период ({shiftsFrom} – {shiftsTo}) смены не найдены.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ПРАВА И ЛИМИТЫ КАССИРОВ
          ───────────────────────────────────────────────────────────── */}
      {!isManager && activeTab === 'policies' && (
        <section className="rounded-2xl border border-[#e0e7ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-[#edf1f4] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#27303c]">Права и лимиты кассиров</h2>
            </div>
            <Button icon={Plus} onClick={openCreatePolicy}>
              Назначить кассира
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#f8fafb] text-xs font-semibold uppercase tracking-wide text-[#8491a0]">
                <tr>
                  <th className="px-5 py-3">Сотрудник</th>
                  <th className="px-5 py-3">Смена (Откр/Закр)</th>
                  <th className="px-5 py-3">Оплата</th>
                  <th className="px-5 py-3">Расходы</th>
                  <th className="px-5 py-3">Зарплаты</th>
                  <th className="px-5 py-3">Лимит смены</th>
                  <th className="px-5 py-3">Статус</th>
                  <th className="px-5 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f4] text-[#3f4b5a]">
                {(policies ?? []).map((policy) => {
                  const user = usersById.get(policy.cashierUserId);
                  return (
                    <tr key={policy.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-medium text-[#1c2530]">
                        {user
                          ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username
                          : policy.cashierUserId}
                        <span className="mt-0.5 block text-xs font-normal text-[#8491a0]">
                          {user?.email || policy.cashierUserId}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {policy.canOpenShift ? '✓ Открытие' : '—'} ·{' '}
                        {policy.canCloseShift ? '✓ Закрытие' : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge allowed={policy.canAcceptPayment} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge allowed={policy.canMakeExpense} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge allowed={policy.canPaySalary} />
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#27303c]">
                        {money(policy.expenseLimit)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            policy.active
                              ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                              : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
                          }
                        >
                          {policy.active ? 'Активен' : 'Отключён'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => openEditPolicy(policy)}>
                          Изменить
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!policiesLoading && !(policies ?? []).length && (
                  <tr>
                    <td className="px-5 py-10 text-center text-[#8491a0]" colSpan={8}>
                      Права кассиров ещё не назначены.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ОТКРЫТИЕ СМЕНЫ
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        title="Открыть кассовую смену"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenShiftModal(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleOpenShift}
            >
              Открыть смену
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#536071]">
            При открытии смены зафиксируйте фактическое количество наличных денег в кассе на момент начала работы.
          </p>
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Стартовый остаток наличных в кассе, ₸
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-base font-semibold outline-none focus:border-[#467aff]"
              type="number"
              min="0"
              placeholder="0"
              value={openFloatInput}
              onChange={(e) => setOpenFloatInput(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ЗАКРЫТИЕ СМЕНЫ
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={closeShiftModal}
        onClose={() => setCloseShiftModal(false)}
        title="Закрыть кассовую смену"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseShiftModal(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleCloseShift}>
              Закрыть смену и сдать кассу
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50/70 p-3.5 text-xs text-blue-900 border border-blue-100">
            <span className="font-semibold">Расчётная сумма в кассе: </span>
            <strong className="text-sm">{money(report?.expectedCash)}</strong>
          </div>

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Фактически наличных в кассе при пересчёте, ₸
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-base font-semibold outline-none focus:border-[#467aff]"
              type="number"
              min="0"
              placeholder="0"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Кому передаётся касса (Администратор / Управляющий)
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 font-normal outline-none focus:border-[#467aff]"
              value={closeRecipientId}
              onChange={(e) => setCloseRecipientId(e.target.value)}
            >
              <option value="">Выберите сотрудника</option>
              {(users ?? [])
                .filter((u) => u.enabled)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.lastName || ''} ${u.firstName || ''}`.trim() || u.username} · {u.email}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Примечание при закрытии (опционально)
            <textarea
              rows={2}
              className="mt-2 w-full rounded-xl border border-[#dbe2e8] p-3 text-sm outline-none focus:border-[#467aff]"
              placeholder="Причины расхождения, комментарии к передаче…"
              value={closeNoteInput}
              onChange={(e) => setCloseNoteInput(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: НОВАЯ ОПЕРАЦИЯ (РАСХОД, ЗАРПЛАТА, ВНЕСЕНИЕ, ИЗЪЯТИЕ)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={newOpModal}
        onClose={() => setNewOpModal(false)}
        title="Новая кассовая операция"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateOperation}>
              Провести операцию
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Тип операции
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-normal outline-none focus:border-[#467aff]"
              value={newOpType}
              onChange={(e) => setNewOpType(e.target.value as any)}
            >
              <option value="EXPENSE">Расход (Хозяйственные расходы / траты)</option>
              <option value="SALARY">Выплата зарплаты сотруднику</option>
              <option value="DEPOSIT">Внесение наличных (Инкассация плюс)</option>
              <option value="WITHDRAWAL">Изъятие наличных (Инкассация минус)</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Сумма, ₸
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-base font-semibold outline-none focus:border-[#467aff]"
              type="number"
              min="1"
              placeholder="10 000"
              value={newOpAmount}
              onChange={(e) => setNewOpAmount(e.target.value)}
            />
          </label>

          {newOpType === 'EXPENSE' && (
            <label className="block text-sm font-semibold text-[#3f4b5a]">
              Категория расхода
              <input
                className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-sm font-normal outline-none focus:border-[#467aff]"
                type="text"
                placeholder="Канцелярия, кофе, хозтовары, интернет…"
                value={newOpCategory}
                onChange={(e) => setNewOpCategory(e.target.value)}
              />
            </label>
          )}

          {newOpType === 'SALARY' && (
            <>
              <label className="block text-sm font-semibold text-[#3f4b5a]">
                Сотрудник
                <select
                  className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-normal outline-none focus:border-[#467aff]"
                  value={newOpStaffId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setNewOpStaffId(id);
                    const st = staffPage?.content?.find((s) => s.id === id);
                    if (st) {
                      setNewOpReason(`Зарплата: ${st.lastName} ${st.firstName} (${newOpSalaryMonth})`);
                    }
                  }}
                >
                  <option value="">Выберите сотрудника</option>
                  {(staffPage?.content ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName} {s.firstName} {s.position ? `(${s.position})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-[#3f4b5a]">
                Оплачиваемый месяц
                <input
                  type="month"
                  className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-normal outline-none focus:border-[#467aff]"
                  value={newOpSalaryMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    setNewOpSalaryMonth(m);
                    const st = staffPage?.content?.find((s) => s.id === newOpStaffId);
                    if (st) {
                      setNewOpReason(`Зарплата: ${st.lastName} ${st.firstName} (${m})`);
                    }
                  }}
                />
              </label>
            </>
          )}

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Обоснование / Назначение платежа
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 text-sm font-normal outline-none focus:border-[#467aff]"
              type="text"
              placeholder={
                newOpType === 'SALARY'
                  ? 'Зарплата: ФИО сотрудника, месяц…'
                  : 'Описание операции…'
              }
              value={newOpReason}
              onChange={(e) => setNewOpReason(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ОПЕРАЦИИ ВЫБРАННОЙ СМЕНЫ
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={shiftOpsModal}
        onClose={() => setShiftOpsModal(false)}
        title={`Операции смены: ${selectedShiftForOps ? formatDateTime(selectedShiftForOps.openedAt) : ''}`}
        footer={
          <Button variant="secondary" onClick={() => setShiftOpsModal(false)}>
            Закрыть
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs text-[#536071]">
            <div>
              Кассир: <strong>{getUserDisplayName(selectedShiftForOps?.cashierUserId, selectedShiftForOps?.cashierName)}</strong>
            </div>
            <div>
              Начальный остаток: <strong>{money(selectedShiftForOps?.openingFloat)}</strong>
            </div>
            {selectedShiftForOps?.actualCash != null && (
              <div>
                Фактический остаток: <strong>{money(selectedShiftForOps.actualCash)}</strong>
              </div>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {shiftOpsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#467aff]" />
              </div>
            ) : shiftOpsList.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#8491a0]">
                В этой смене не было зафиксировано операций.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafb] uppercase text-[#8491a0]">
                  <tr>
                    <th className="p-2.5">Время</th>
                    <th className="p-2.5">Тип</th>
                    <th className="p-2.5">Способ</th>
                    <th className="p-2.5">Описание</th>
                    <th className="p-2.5 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f4]">
                  {shiftOpsList.filter((op) => !op.deleted).map((op) => {
                    const isIncome = op.type === 'PAYMENT' || op.type === 'DEPOSIT';
                    return (
                      <tr key={op.id} className={op.deleted ? 'bg-slate-50 text-slate-400 line-through opacity-70' : ''}>
                        <td className="p-2.5 font-mono text-[#536071] whitespace-nowrap">
                          {formatTimeOnly(op.occurredAt)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <OperationTypeBadge type={op.type} />
                            {op.deleted && (
                              <span
                                className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 not-sr-only"
                                title={`${op.deletedBy || ''} ${formatDateTime(op.deletedAt)}`.trim()}
                              >
                                Удалено{op.deletedBy ? ` (${op.deletedBy})` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <PaymentMethodBadge method={op.paymentMethod} />
                        </td>
                        <td className="p-2.5 max-w-[220px]">
                          <span className={`font-medium block truncate ${op.deleted ? 'text-slate-400 line-through' : 'text-[#27303c]'}`}>
                            {op.studentId && op.studentName && !op.deleted ? (
                              <Link href={`/students/${op.studentId}`} className="text-[#467aff] hover:underline">
                                {op.studentName}
                              </Link>
                            ) : (
                              op.studentName || op.reason || '—'
                            )}
                          </span>
                          {op.courseNames && (
                            <span className="text-[#8491a0] block truncate">{op.courseNames}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap font-semibold">
                          <span className={op.deleted ? 'text-slate-400 line-through' : isIncome ? 'text-emerald-600' : 'text-red-600'}>
                            {isIncome ? '+' : '-'}&nbsp;{money(op.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: НАЗНАЧИТЬ / НАСТРОИТЬ ПРАВА КАССИРА
          ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={policyModal}
        onClose={() => setPolicyModal(false)}
        title={editingPolicy ? 'Настроить права кассира' : 'Назначить кассира'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPolicyModal(false)}>
              Отмена
            </Button>
            <Button onClick={submitPolicy} disabled={savePolicy.loading}>
              {savePolicy.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить права'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Сотрудник
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 font-normal outline-none focus:border-[#467aff]"
              value={policyDraft.cashierUserId}
              onChange={(event) => setPolicyDraft({ ...policyDraft, cashierUserId: event.target.value })}
            >
              <option value="">Выберите пользователя CRM</option>
              {(users ?? [])
                .filter((user) => user.enabled)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username} · {user.email}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-[#3f4b5a]">
            Лимит расходов за смену, ₸
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#dbe2e8] px-3 font-normal outline-none focus:border-[#467aff]"
              type="number"
              min="0"
              value={policyDraft.expenseLimit}
              onChange={(event) =>
                setPolicyDraft({ ...policyDraft, expenseLimit: Number(event.target.value) || 0 })
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['canOpenShift', 'Открывать смену'],
                ['canCloseShift', 'Закрывать смену'],
                ['canAcceptPayment', 'Принимать оплату'],
                ['canDeletePayment', 'Удалять оплаты'],
                ['canMakeExpense', 'Проводить расходы'],
                ['canPaySalary', 'Выдавать зарплату'],
                ['canViewReports', 'Смотреть отчёты'],
                ['active', 'Право активно'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-xl border border-[#e5ebf0] p-3 text-sm font-medium text-[#3f4b5a] cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  className="rounded text-[#467aff]"
                  checked={policyDraft[key]}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, [key]: event.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BADGES & HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent = 'text-[#27303c]',
}: {
  icon: any;
  label: string;
  value: string;
  subtext?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e0e7ed] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8491a0]">
        <span className="rounded-lg bg-[#eef4ff] p-1.5 text-[#467aff]">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
      {subtext && <p className="mt-1 text-xs text-[#8491a0] truncate">{subtext}</p>}
    </div>
  );
}

function OperationTypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'PAYMENT':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Оплата
        </span>
      );
    case 'EXPENSE':
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
          Расход
        </span>
      );
    case 'SALARY':
      return (
        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
          Зарплата
        </span>
      );
    case 'DEPOSIT':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Внесение
        </span>
      );
    case 'WITHDRAWAL':
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Изъятие
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {type}
        </span>
      );
  }
}

function PaymentMethodBadge({ method }: { method?: string | null }) {
  if (!method) return <span className="text-xs text-[#8491a0]">—</span>;

  switch (method) {
    case 'KASPI_POS':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 border border-red-100">
          <CreditCard className="h-3 w-3" />
          Kaspi POS
        </span>
      );
    case 'KASPI_QR':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200/60">
          <Receipt className="h-3 w-3" />
          Kaspi QR
        </span>
      );
    case 'KASPI_TRANSFER':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-100">
          <Phone className="h-3 w-3" />
          Kaspi Перевод
        </span>
      );
    case 'CASH':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
          <Coins className="h-3 w-3" />
          Наличные
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {method}
        </span>
      );
  }
}

function StatusBadge({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="text-xs font-medium text-emerald-700">Разрешено</span>
  ) : (
    <span className="text-xs text-slate-400">Запрещено</span>
  );
}
