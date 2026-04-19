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

function getFilenameFromDisposition(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return fallback;
}

async function downloadAnalyticsExport(path: string, fallbackFilename: string, params?: Record<string, unknown>) {
  const response = await api.get<Blob>(path, {
    params,
    responseType: 'blob',
  });

  return {
    blob: response.data,
    filename: getFilenameFromDisposition(response.headers['content-disposition'], fallbackFilename),
    contentType: response.headers['content-type'],
  };
}

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

  /** Download dashboard analytics report (xlsx) */
  async exportDashboard(params: { from: string; to: string; lessonType?: 'ALL' | 'GROUP' | 'INDIVIDUAL' | 'TRIAL' }) {
    return downloadAnalyticsExport('/api/v1/analytics/dashboard/export', 'dashboard-report.xlsx', params);
  },

  /** Download finance analytics report (xlsx) */
  async exportFinanceReport(params: { from: string; to: string }) {
    return downloadAnalyticsExport('/api/v1/analytics/finance-report/export', 'finance-report.xlsx', params);
  },

  /** Download subscriptions analytics report (xlsx) */
  async exportSubscriptions(params?: { from?: string; to?: string; onlySuspicious?: boolean }) {
    return downloadAnalyticsExport('/api/v1/analytics/subscriptions/export', 'subscriptions-report.xlsx', params);
  },

  /** Download teachers analytics report (xlsx) */
  async exportTeachers(params?: { from?: string; to?: string }) {
    return downloadAnalyticsExport('/api/v1/analytics/teachers/export', 'teachers-report.xlsx', params);
  },

  /** Download retention analytics report (xlsx) */
  async exportRetention(params?: { from?: string; to?: string; cohortType?: 'FIRST_PAYMENT' | 'FIRST_VISIT' }) {
    return downloadAnalyticsExport('/api/v1/analytics/retention/export', 'retention-report.xlsx', params);
  },

  /** Download group load analytics report (xlsx) */
  async exportGroupLoad(params?: { from?: string; to?: string }) {
    return downloadAnalyticsExport('/api/v1/analytics/group-load/export', 'group-load-report.xlsx', params);
  },

  /** Download room load analytics report (xlsx) */
  async exportRoomLoad(params?: { from?: string; to?: string; timelineDate?: string }) {
    return downloadAnalyticsExport('/api/v1/analytics/room-load/export', 'room-load-report.xlsx', params);
  },

  /** Download group attendance analytics report (xlsx) */
  async exportGroupAttendance(params: { groupId: string; months?: 6 | 12; from?: string; to?: string }) {
    return downloadAnalyticsExport('/api/v1/analytics/group-attendance/export', 'group-attendance-report.xlsx', params);
  },
};
