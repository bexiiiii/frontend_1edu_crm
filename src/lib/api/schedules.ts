import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  ScheduleDto,
  CreateScheduleRequest,
  ScheduleStatus,
  UpdateScheduleRequest,
} from './types';

// ─── Schedules Service ──────────────────────────────────────────

export const schedulesService = {
  /** Get paginated list of schedules / groups */
  async getAll(params?: PaginationParams & { status?: ScheduleStatus; teacherId?: string; courseId?: string }) {
    const response = await api.get<ApiResponse<PageResponse<ScheduleDto>>>('/api/v1/schedules', { params });
    return response.data;
  },

  /** Get schedule by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<ScheduleDto>>(`/api/v1/schedules/${id}`);
    return response.data;
  },

  /** Create a new schedule */
  async create(data: CreateScheduleRequest) {
    const response = await api.post<ApiResponse<ScheduleDto>>('/api/v1/schedules', data);
    return response.data;
  },

  /** Update schedule */
  async update(id: string, data: UpdateScheduleRequest) {
    const response = await api.put<ApiResponse<ScheduleDto>>(`/api/v1/schedules/${id}`, data);
    return response.data;
  },

  /** Delete schedule */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/schedules/${id}`);
    return response.data;
  },

  /** Get schedules by room */
  async getByRoom(roomId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<ScheduleDto>>>(
      `/api/v1/schedules/room/${roomId}`, { params }
    );
    return response.data;
  },

  /** Search schedules */
  async search(query: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<ScheduleDto>>>('/api/v1/schedules/search', {
      params: { query, ...params },
    });
    return response.data;
  },
};
