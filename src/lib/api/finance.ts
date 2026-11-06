import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  TransactionDto,
  CreateTransactionRequest,
  TransactionType,
  StudentPaymentDto,
  CreateStudentPaymentRequest,
  UpdateStudentPaymentRequest,
  StudentAttendanceChargeDto,
  StudentPaymentHistoryResponse,
  MonthlyOverviewResponse,
  StudentDebtDto,
  SalaryOverviewDto,
  StaffSalaryHistoryDto,
  CreateSalaryPaymentRequest,
  UpdateSalaryPaymentRequest,
  SalaryPaymentDto,
  GenerateKpayInvoicesResponse,
  KpayInvoiceDto,
  KpayInvoiceStatus,
  GenerateApiPayInvoicesResponse,
  ApiPayInvoiceDto,
  ApiPayInvoiceStatus,
} from './types';

export type CashShiftStatus = 'OPEN' | 'CLOSED';

export interface CashShiftDto {
  id: string;
  branchId: string;
  cashierUserId: string;
  cashierName?: string | null;
  status: CashShiftStatus;
  openedAt: string;
  closedAt?: string | null;
  openingFloat: number;
  expectedCash?: number | null;
  actualCash?: number | null;
  differenceAmount?: number | null;
  closingNote?: string | null;
  recipientUserId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  handoverAccepted?: boolean;
  handoverAcceptedAt?: string | null;
  handoverAcceptedBy?: string | null;
}

export interface StudentPaymentsPageRow {
  studentId: string;
  studentName: string;
  deleted: boolean;
  /** WhatsApp-ready digits or empty. */
  phone: string;
  studentDiscountPercent: number | null;
  courseNames: string[];
  subscriptionIds: string[];
  expected?: number;
  paid?: number;
  debt?: number;
  status?: 'PAID' | 'PARTIAL' | 'UNPAID';
  totalDebt?: number;
  debtMonths?: number;
  monthlyExpected?: number;
  discountPercent?: number | null;
}

export interface StudentPaymentsPageDto {
  month: string | null;
  page: number;
  size: number;
  totalPages: number;
  filteredStudents: number;
  totalStudents?: number | null;
  totalExpected?: number | null;
  totalCollected?: number | null;
  totalDebt?: number | null;
  debtorsTotalDebt?: number | null;
  debtorsAverageDebt?: number | null;
  debtorsCritical?: number | null;
  rows: StudentPaymentsPageRow[];
}

export interface CashOperationDto {
  id: string;
  shiftId: string;
  branchId: string;
  type: 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE' | 'SALARY';
  amount: number;
  category?: string | null;
  reason?: string | null;
  paymentMethod?: string | null;
  /** «Перевод»: phone number of the transfer, +7XXXXXXXXXX. */
  transferPhone?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  paymentMonth?: string | null;
  courseNames?: string | null;
  receiptNumber?: string | null;
  cashierUserId: string;
  cashierName?: string | null;
  occurredAt: string;
  deleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CashierPolicyDto {
  id: string;
  cashierUserId: string;
  branchId?: string | null;
  canOpenShift: boolean;
  canAcceptPayment: boolean;
  canDeletePayment: boolean;
  canMakeExpense: boolean;
  canPaySalary: boolean;
  canCloseShift: boolean;
  canViewReports: boolean;
  expenseLimit: number;
  active: boolean;
}

export interface CashDailyReportDto {
  date: string;
  branchId: string;
  cashIncome: number;
  nonCashIncome: number;
  expenses: number;
  salaries: number;
  deposits: number;
  withdrawals: number;
  expectedCash: number;
  receiptsCount: number;
  operationsCount: number;
}

// ─── Finance Service (Transactions) ────────────────────────────

export const financeService = {
  /** Get paginated transactions */
  async getTransactions(params?: PaginationParams & { type?: TransactionType }) {
    const response = await api.get<ApiResponse<PageResponse<TransactionDto>>>('/api/v1/finance/transactions', { params });
    return response.data;
  },

  /** Get transaction by ID */
  async getTransactionById(id: string) {
    const response = await api.get<ApiResponse<TransactionDto>>(`/api/v1/finance/transactions/${id}`);
    return response.data;
  },

  /** Create transaction */
  async createTransaction(data: CreateTransactionRequest) {
    const response = await api.post<ApiResponse<TransactionDto>>('/api/v1/finance/transactions', data);
    return response.data;
  },

  /** Update transaction */
  async updateTransaction(id: string, data: Partial<CreateTransactionRequest>) {
    const response = await api.put<ApiResponse<TransactionDto>>(`/api/v1/finance/transactions/${id}`, data);
    return response.data;
  },

  /** Delete transaction (kept as cancelled; the reason is required) */
  async deleteTransaction(id: string, reason: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/finance/transactions/${id}`, { params: { reason } });
    return response.data;
  },

  /** Get transactions by date range */
  async getByDate(params: { from: string; to: string } & PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<TransactionDto>>>('/api/v1/finance/transactions/by-date', { params });
    return response.data;
  },

  /** Get transactions for a student */
  async getStudentTransactions(studentId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<TransactionDto>>>(
      `/api/v1/finance/transactions/student/${studentId}`, { params }
    );
    return response.data;
  },
};

export const cashierService = {
  async getActiveShift() {
    const response = await api.get<ApiResponse<CashShiftDto | null>>('/api/v1/finance/cashier/shift/active');
    return response.data;
  },

  async getShifts(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<CashShiftDto[]>>('/api/v1/finance/cashier/shifts', { params });
    return response.data;
  },

  async getShiftOperationsById(shiftId: string) {
    const response = await api.get<ApiResponse<CashOperationDto[]>>(`/api/v1/finance/cashier/shifts/${shiftId}/operations`);
    return response.data;
  },

  async getHistory(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<CashOperationDto[]>>('/api/v1/finance/cashier/history', { params });
    return response.data;
  },

  async openShift(data: { openingFloat: number; cashierName?: string }) {
    const response = await api.post<ApiResponse<CashShiftDto>>('/api/v1/finance/cashier/shift/open', data);
    return response.data;
  },

  async closeShift(data: { actualCash: number; recipientUserId: string; closingNote?: string }) {
    const response = await api.post<ApiResponse<CashShiftDto>>('/api/v1/finance/cashier/shift/close', data);
    return response.data;
  },

  async createOperation(data: {
    type: 'EXPENSE' | 'SALARY' | 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    category?: string;
    reason: string;
    staffId?: string;
    salaryMonth?: string;
  }) {
    const response = await api.post<ApiResponse<CashOperationDto>>('/api/v1/finance/cashier/operations', data);
    return response.data;
  },

  async recordPayment(data: {
    receiptNumber: string;
    studentId: string;
    studentName: string;
    paymentMonth: string;
    paymentMethod: string;
    courseNames: string;
    amount: number;
    transferPhone?: string;
  }) {
    const response = await api.post<ApiResponse<CashOperationDto>>('/api/v1/finance/cashier/payments', data);
    return response.data;
  },

  async getDailyReport(date?: string) {
    const response = await api.get<ApiResponse<CashDailyReportDto>>('/api/v1/finance/cashier/reports/daily', {
      params: date ? { date } : undefined,
    });
    return response.data;
  },

  async getShiftOperations() {
    const response = await api.get<ApiResponse<CashOperationDto[]>>('/api/v1/finance/cashier/operations');
    return response.data;
  },

  async deletePayment(id: string) {
    const response = await api.delete<ApiResponse<CashOperationDto>>(`/api/v1/finance/cashier/payments/${id}`);
    return response.data;
  },

  async getPolicies() {
    const response = await api.get<ApiResponse<CashierPolicyDto[]>>('/api/v1/finance/cashier/policies');
    return response.data;
  },

  async createPolicy(data: Omit<CashierPolicyDto, 'id'>) {
    const response = await api.post<ApiResponse<CashierPolicyDto>>('/api/v1/finance/cashier/policies', data);
    return response.data;
  },

  async updatePolicy(id: string, data: Omit<CashierPolicyDto, 'id'>) {
    const response = await api.put<ApiResponse<CashierPolicyDto>>(`/api/v1/finance/cashier/policies/${id}`, data);
    return response.data;
  },
};

// ─── Student Payments Service ───────────────────────────────────

export interface DiscountHistoryPeriod {
  fromMonth: string;
  toMonth: string | null;
  percent: number;
  amount: number | null;
  label: string;
}

export interface DiscountHistory {
  periods: DiscountHistoryPeriod[];
  /** Months that received money of their own (automatic balance allocations do not count): locked. */
  paidMonths: string[];
  /** null — every billed month of an ended subscription is paid. */
  defaultStartMonth: string | null;
  /** Ended subscription: suggested last month of the discount (end of the first unpaid run). */
  defaultEndMonth?: string | null;
  /** Expired / the student left: bills only billedFromMonth..billedToMonth. */
  ended?: boolean;
  billedFromMonth?: string | null;
  billedToMonth?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface DiscountPreviewMonth {
  month: string;
  expectedBefore: number;
  expectedAfter: number;
  paid: number;
  debtBefore: number;
  debtAfter: number;
  locked: boolean;
}

export interface DiscountPreview {
  subscriptionId: string;
  fromMonth: string | null;
  toMonth: string | null;
  debtBefore: number;
  debtAfter: number;
  /** Money already on the discounted months that goes back to the student's balance. */
  returnedToBalance: number;
  months: DiscountPreviewMonth[];
}

export interface SubscriptionDiscountParams {
  discountPercent: number;
  discountAmount?: number;
  salaryDiscountMode?: 'FULL_PRICE' | 'DISCOUNTED_PRICE';
  fromMonth?: string | null;
  toMonth?: string | null;
}

export const studentPaymentsService = {
  /** Get student payment history */
  async getByStudent(studentId: string) {
    const response = await api.get<ApiResponse<StudentPaymentHistoryResponse>>(
      `/api/v1/payments/student-payments/student/${studentId}`
    );
    return response.data;
  },

  /** Начисления по занятиям: за какой урок сколько списано, а какой не тарифицируется */
  async getAttendanceCharges(studentId: string, params?: { fromMonth?: string; toMonth?: string }) {
    const response = await api.get<ApiResponse<StudentAttendanceChargeDto[]>>(
      `/api/v1/payments/student-payments/student/${studentId}/attendance-charges`,
      { params }
    );
    return response.data;
  },

  /** Create student payment */
  async create(data: CreateStudentPaymentRequest) {
    const response = await api.post<ApiResponse<StudentPaymentDto>>('/api/v1/payments/student-payments', data);
    return response.data;
  },

  /** Return available advance to the student and keep an auditable ledger entry. */
  async refundBalance(studentId: string, data: import('./types').RefundStudentBalanceRequest) {
    const response = await api.post<ApiResponse<StudentPaymentDto>>(
      `/api/v1/payments/student-payments/student/${studentId}/refunds`,
      data
    );
    return response.data;
  },

  /** Update student payment */
  async update(id: string, data: UpdateStudentPaymentRequest) {
    const response = await api.put<ApiResponse<StudentPaymentDto>>(`/api/v1/payments/student-payments/${id}`, data);
    return response.data;
  },

  /** Delete student payment (the reason is required and kept in history) */
  async delete(id: string, reason: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/payments/student-payments/${id}`, { params: { reason } });
    return response.data;
  },

  /** Discount timeline of a subscription, month by month as billing applies it. */
  async getDiscountHistory(subscriptionId: string) {
    const response = await api.get<ApiResponse<DiscountHistory>>(`/api/v1/subscriptions/${subscriptionId}/discount-history`);
    return response.data;
  },

  /** What a discount change would do to one subscription's months (nothing is saved). */
  async previewSubscriptionDiscountById(subscriptionId: string, p: SubscriptionDiscountParams) {
    const response = await api.get<ApiResponse<DiscountPreview>>(
      `/api/v1/subscriptions/${subscriptionId}/discount-preview`,
      { params: {
        discountPercent: p.discountPercent,
        discountAmount: p.discountAmount,
        discountFromMonth: p.fromMonth || undefined,
        discountToMonth: p.toMonth || undefined,
      } }
    );
    return response.data;
  },

  /**
   * Discount of exactly this subscription — also an expired one or one the
   * student left (the server limits it to the months it billed and re-splits
   * the student's balance afterwards).
   */
  async updateSubscriptionDiscountById(subscriptionId: string, p: SubscriptionDiscountParams) {
    const response = await api.put<ApiResponse<any>>(
      `/api/v1/subscriptions/${subscriptionId}/discount`,
      null,
      { params: {
        discountPercent: p.discountPercent,
        discountAmount: p.discountAmount,
        salaryDiscountMode: p.salaryDiscountMode,
        discountFromMonth: p.fromMonth || '',
        discountToMonth: p.toMonth || '',
      } }
    );
    return response.data;
  },

  /** Update course subscription discount percent */
  async updateSubscriptionDiscount(
    studentId: string,
    courseId: string,
    discountPercent: number,
    salaryDiscountMode: 'FULL_PRICE' | 'DISCOUNTED_PRICE' = 'FULL_PRICE',
    discountAmount?: number,
    period?: { fromMonth?: string | null; toMonth?: string | null }
  ) {
    const discountFromMonth = period ? period.fromMonth || '' : undefined;
    const discountToMonth = period ? period.toMonth || '' : undefined;
    try {
      const response = await api.put<ApiResponse<any>>(
        `/api/v1/subscriptions/student/${studentId}/course/${courseId}/discount`,
        null,
        { params: { discountPercent, salaryDiscountMode, discountAmount, discountFromMonth, discountToMonth } }
      );
      return response.data;
    } catch {
      const response = await api.put<ApiResponse<any>>(
        `/api/v1/payments/subscriptions/student/${studentId}/course/${courseId}/discount`,
        null,
        { params: { discountPercent, salaryDiscountMode, discountAmount, discountFromMonth, discountToMonth } }
      );
      return response.data;
    }
  },

  /** Get monthly overview */
  async getMonthlyOverview(params?: { month?: string }) {
    const response = await api.get<ApiResponse<MonthlyOverviewResponse>>('/api/v1/payments/student-payments/overview', { params });
    return response.data;
  },

  /** Get debtors list */
  async getDebtors(params?: { month?: string; fromDate?: string; toDate?: string }) {
    const response = await api.get<ApiResponse<StudentDebtDto[]>>('/api/v1/payments/student-payments/debtors', { params });
    return response.data;
  },

  /** «Платежи студентов» one page: one row per student, search/status filter, month totals. */
  async getOverviewPage(params: { month?: string; page?: number; size?: number; search?: string; status?: string }) {
    const response = await api.get<ApiResponse<StudentPaymentsPageDto>>('/api/v1/payments/student-payments/overview/page', { params });
    return response.data;
  },

  /** «Должники» one page: one row per student, search/stage filter, totals of the filtered list. */
  async getDebtorsPage(params: { month?: string; fromDate?: string; toDate?: string; page?: number; size?: number; search?: string; stage?: string }) {
    const response = await api.get<ApiResponse<StudentPaymentsPageDto>>('/api/v1/payments/student-payments/debtors/page', { params });
    return response.data;
  },

  /** Calculate suggested partial payment amount */
  async calculatePartial(params: { subscriptionId: string; month: string }) {
    const response = await api.get<ApiResponse<{ suggestedAmount: number; remainingDebt: number }>>('/api/v1/payments/student-payments/calculate-partial', { params });
    return response.data;
  },
};

export const salaryService = {
  /** Get monthly salary overview */
  async getSalaryOverview(params?: { month?: string; year?: number }) {
    const response = await api.get<ApiResponse<SalaryOverviewDto>>('/api/v1/finance/salary', { params });
    return response.data;
  },

  /** Backwards-compatible alias */
  async getSalaryReport(params?: { month?: string; year?: number }) {
    return salaryService.getSalaryOverview(params);
  },

  /** Get history for a staff member */
  async getStaffHistory(staffId: string, params?: { from?: string; to?: string; branchId?: string }) {
    const response = await api.get<ApiResponse<StaffSalaryHistoryDto>>(`/api/v1/finance/salary/staff/${staffId}`, {
      params,
    });
    return response.data;
  },

  /** Exclude one lesson from payroll without changing the lesson or attendance. */
  async excludeLesson(staffId: string, lessonId: string, reason?: string) {
    const response = await api.put<ApiResponse<void>>(
      `/api/v1/finance/salary/staff/${staffId}/lessons/${lessonId}/exclusion`,
      { reason: reason || undefined }
    );
    return response.data;
  },

  /** Return an excluded lesson to payroll calculation. */
  async restoreLesson(staffId: string, lessonId: string) {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/finance/salary/staff/${staffId}/lessons/${lessonId}/exclusion`
    );
    return response.data;
  },

  /** Record a salary payment */
  async createPayment(data: CreateSalaryPaymentRequest) {
    const response = await api.post<ApiResponse<SalaryPaymentDto>>('/api/v1/finance/salary/payments', data);
    return response.data;
  },

  /** Update salary payment */
  async cancelPayment(id: string) {
    const response = await api.delete<ApiResponse<SalaryPaymentDto>>(`/api/v1/finance/salary/payments/${id}`);
    return response.data;
  },

  /** Update salary payment */
  async updatePayment(id: string, data: UpdateSalaryPaymentRequest) {
    const response = await api.put<ApiResponse<SalaryPaymentDto>>(`/api/v1/finance/salary/payments/${id}`, data);
    return response.data;
  },

  /** Calculate suggested partial salary payment amount */
  async calculatePartial(params: { staffId: string; month: string }) {
    const response = await api.get<ApiResponse<{ suggestedAmount: number; outstandingAmount: number }>>('/api/v1/finance/salary/calculate-partial', { params });
    return response.data;
  },
};

export const kpayInvoicesService = {
  /** Generate KPAY invoices for month */
  async generate(data?: { month?: string }) {
    const response = await api.post<ApiResponse<GenerateKpayInvoicesResponse>>('/api/v1/payments/kpay/invoices/generate', data);
    return response.data;
  },

  /** List KPAY invoices */
  async getAll(params?: { month?: string; status?: KpayInvoiceStatus }) {
    const response = await api.get<ApiResponse<KpayInvoiceDto[]>>('/api/v1/payments/kpay/invoices', { params });
    return response.data;
  },

  /** Get KPAY invoice by id */
  async getById(id: string) {
    const response = await api.get<ApiResponse<KpayInvoiceDto>>(`/api/v1/payments/kpay/invoices/${id}`);
    return response.data;
  },
};

export const apiPayInvoicesService = {
  /** Generate ApiPay invoices for month */
  async generate(data?: { month?: string }) {
    const response = await api.post<ApiResponse<GenerateApiPayInvoicesResponse>>('/api/v1/payments/apipay/invoices/generate', data);
    return response.data;
  },

  /** Create single ApiPay invoice */
  async createSingle(data: {
    studentId: string;
    subscriptionId?: string;
    month: string;
    recipientField: string;
    amount?: number;
    currency?: string;
    description?: string;
  }) {
    const response = await api.post<ApiResponse<ApiPayInvoiceDto>>('/api/v1/payments/apipay/invoices/single', data);
    return response.data;
  },

  /** List ApiPay invoices */
  async getAll(params?: { month?: string; status?: ApiPayInvoiceStatus }) {
    const response = await api.get<ApiResponse<ApiPayInvoiceDto[]>>('/api/v1/payments/apipay/invoices', { params });
    return response.data;
  },

  /** Get ApiPay invoice by id */
  async getById(id: string) {
    const response = await api.get<ApiResponse<ApiPayInvoiceDto>>(`/api/v1/payments/apipay/invoices/${id}`);
    return response.data;
  },
};
