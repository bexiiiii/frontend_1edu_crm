import type { AxiosRequestConfig } from 'axios';
import api from '../api';
import type { ApiResponse, RedListDto } from './types';

// ─── Red list («Редлист») ───────────────────────────────────────

export const redListService = {
  /** Put a student of a course (optionally one group) into the red list from a date (default today). */
  async create(data: {
    studentId: string;
    courseId: string;
    groupId?: string | null;
    fromDate?: string;
    reason?: string;
    force?: boolean;
    unlockReason?: string;
  }, config?: AxiosRequestConfig) {
    const response = await api.post<ApiResponse<RedListDto>>('/api/v1/lessons/red-list', data, config);
    return response.data;
  },

  /** Take a student out of the red list; returnDate = first day back (default today). */
  async close(id: string, data: { returnDate?: string; reason?: string; unlockReason?: string } = {}, config?: AxiosRequestConfig) {
    const response = await api.post<ApiResponse<RedListDto>>(`/api/v1/lessons/red-list/${id}/close`, data, config);
    return response.data;
  },

  async list(params: { courseId?: string; groupId?: string; studentId?: string; active?: boolean } = {}) {
    const response = await api.get<ApiResponse<RedListDto[]>>('/api/v1/lessons/red-list', { params });
    return response.data;
  },
};
