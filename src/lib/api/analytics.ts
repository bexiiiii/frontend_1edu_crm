import api from '../api';
import type {
  ApiResponse,
  DashboardResponse,
  TodayStatsResponse,
  GroupLoadResponse,
  RoomLoadResponse,
  RetentionResponse,
  TeacherAnalyticsResponse,
  GroupAttendanceResponse,
  FinanceReportResponse,
  SubscriptionReportResponse,
  SalesFunnelResponse,
  LeadConversionResponse,
  ManagerEfficiencyResponse,
} from './types';

// ─── Analytics Service ──────────────────────────────────────────

export const analyticsService = {
  /** Get dashboard analytics */
  async getDashboard(params: { from: string; to: string; lessonType?: 'ALL' | 'GROUP' | 'INDIVIDUAL' | 'TRIAL' }) {
    const response = await api.get<ApiResponse<DashboardResponse>>('/api/v1/analytics/dashboard', { params });
    return response.data;
  },

  /** Get today stats */
  async getToday(params?: { date?: string }) {
    const response = await api.get<ApiResponse<TodayStatsResponse>>('/api/v1/analytics/today', { params });
    return response.data;
  },

  /** Get group load analytics */
  async getGroupLoad(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<GroupLoadResponse>>('/api/v1/analytics/group-load', { params });
    return response.data;
  },

  /** Get room load analytics */
  async getRoomLoad(params?: { from?: string; to?: string; timelineDate?: string }) {
    const response = await api.get<ApiResponse<RoomLoadResponse>>('/api/v1/analytics/room-load', { params });
    return response.data;
  },

  /** Get retention cohort analytics */
  async getRetention(params?: { from?: string; to?: string; cohortType?: 'FIRST_PAYMENT' | 'FIRST_VISIT' }) {
    const response = await api.get<ApiResponse<RetentionResponse>>('/api/v1/analytics/retention', { params });
    return response.data;
  },

  /** Get teacher analytics */
  async getTeachers(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<TeacherAnalyticsResponse>>('/api/v1/analytics/teachers', { params });
    return response.data;
  },

  /** Get group attendance analytics for a specific group */
  async getGroupAttendance(groupId: string, params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<GroupAttendanceResponse>>(
      `/api/v1/analytics/group-attendance/${groupId}`, { params }
    );
    return response.data;
  },

  /** Get group attendance for all groups (overview) */
  async getAllGroupAttendance(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<GroupAttendanceResponse[]>>(
      '/api/v1/analytics/group-attendance', { params }
    );
    return response.data;
  },

  /** Get finance report */
  async getFinanceReport(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<FinanceReportResponse>>('/api/v1/analytics/finance-report', { params });
    return response.data;
  },

  /** Get subscription analytics */
  async getSubscriptions(params?: { from?: string; to?: string; onlySuspicious?: boolean }) {
    const response = await api.get<ApiResponse<SubscriptionReportResponse>>('/api/v1/analytics/subscriptions', { params });
    return response.data;
  },

  /** Get sales funnel analytics */
  async getFunnel(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<SalesFunnelResponse>>('/api/v1/analytics/funnel', { params });
    return response.data;
  },

  /** Get lead conversion analytics */
  async getLeadConversions(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<LeadConversionResponse>>('/api/v1/analytics/lead-conversions', { params });
    return response.data;
  },

  /** Get manager efficiency analytics */
  async getManagers(params?: { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<ManagerEfficiencyResponse>>('/api/v1/analytics/managers', { params });
    return response.data;
  },
};
