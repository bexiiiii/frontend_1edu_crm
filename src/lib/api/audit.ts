import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, TenantAuditLog, SystemAuditLog } from './types';

// ─── Audit Service ──────────────────────────────────────────────

export const auditService = {
  /** Get tenant audit log entries (TENANT_ADMIN, SUPER_ADMIN) */
  async getTenantLog(params?: PaginationParams & { category?: string; action?: string; actorId?: string; from?: string; to?: string }) {
    const response = await api.get<ApiResponse<PageResponse<TenantAuditLog>>>('/api/v1/audit/tenant', { params });
    return response.data;
  },

  /** Get system audit log entries (SUPER_ADMIN only) */
  async getSystemLog(params?: PaginationParams & { category?: string; action?: string; actorId?: string; tenantId?: string; from?: string; to?: string }) {
    const response = await api.get<ApiResponse<PageResponse<SystemAuditLog>>>('/api/v1/audit/system', { params });
    return response.data;
  },
};
