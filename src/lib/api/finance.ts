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
  StudentPaymentHistoryResponse,
  MonthlyOverviewResponse,
  StudentDebtDto,
  SalaryOverviewDto,
  StaffSalaryHistoryDto,
  CreateSalaryPaymentRequest,
  SalaryPaymentDto,
} from './types';

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

  /** Delete transaction */
  async deleteTransaction(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/finance/transactions/${id}`);
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

// ─── Student Payments Service ───────────────────────────────────

export const studentPaymentsService = {
  /** Get student payment history */
  async getByStudent(studentId: string) {
    const response = await api.get<ApiResponse<StudentPaymentHistoryResponse>>(
      `/api/v1/payments/student-payments/student/${studentId}`
    );
    return response.data;
  },

  /** Create student payment */
  async create(data: CreateStudentPaymentRequest) {
    const response = await api.post<ApiResponse<StudentPaymentDto>>('/api/v1/payments/student-payments', data);
    return response.data;
  },

  /** Delete student payment */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/payments/student-payments/${id}`);
    return response.data;
  },

  /** Get monthly overview */
  async getMonthlyOverview(params?: { month?: string }) {
    const response = await api.get<ApiResponse<MonthlyOverviewResponse>>('/api/v1/payments/student-payments/overview', { params });
    return response.data;
  },

  /** Get debtors list */
  async getDebtors() {
    const response = await api.get<ApiResponse<StudentDebtDto[]>>('/api/v1/payments/student-payments/debtors');
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
  async getStaffHistory(staffId: string, params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<StaffSalaryHistoryDto>>(`/api/v1/finance/salary/staff/${staffId}`, {
      params,
    });
    return response.data;
  },

  /** Record a salary payment */
  async createPayment(data: CreateSalaryPaymentRequest) {
    const response = await api.post<ApiResponse<SalaryPaymentDto>>('/api/v1/finance/salary/payments', data);
    return response.data;
  },
};
