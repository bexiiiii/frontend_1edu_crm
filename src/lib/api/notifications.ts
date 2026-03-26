import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, NotificationDto } from './types';

// ─── Notifications Service ──────────────────────────────────────

export interface BroadcastNotificationResultDto {
  scope: string;
  tenantsAffected: number;
  recipients: number;
}

export const notificationsService = {
  /** Get paginated notifications */
  async getAll(params?: PaginationParams & { type?: string; status?: string; mine?: boolean }) {
    const response = await api.get<ApiResponse<PageResponse<NotificationDto>>>('/api/v1/notifications', { params });
    return response.data;
  },

  /** Get notification by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<NotificationDto>>(`/api/v1/notifications/${id}`);
    return response.data;
  },

  /** Broadcast to all staff (SUPER_ADMIN only) */
  async broadcast(data: { subject: string; body: string; alsoEmail?: boolean }) {
    const response = await api.post<ApiResponse<BroadcastNotificationResultDto>>('/api/v1/notifications/broadcast', data);
    return response.data;
  },
};
