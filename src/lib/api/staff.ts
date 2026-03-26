import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  StaffDto,
  CreateStaffRequest,
  UpdateStaffRequest,
  StaffRole,
  StaffStatus,
} from './types';

// ─── Staff Service ──────────────────────────────────────────────

export const staffService = {
  /** Get paginated list of staff members */
  async getAll(params?: PaginationParams & { role?: StaffRole; status?: StaffStatus }) {
    const response = await api.get<ApiResponse<PageResponse<StaffDto>>>('/api/v1/staff', { params });
    return response.data;
  },

  /** Get staff member by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<StaffDto>>(`/api/v1/staff/${id}`);
    return response.data;
  },

  /** Create a new staff member */
  async create(data: CreateStaffRequest) {
    const response = await api.post<ApiResponse<StaffDto>>('/api/v1/staff', data);
    return response.data;
  },

  /** Update staff member */
  async update(id: string, data: UpdateStaffRequest) {
    const response = await api.put<ApiResponse<StaffDto>>(`/api/v1/staff/${id}`, data);
    return response.data;
  },

  /** Delete a staff member */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/staff/${id}`);
    return response.data;
  },

  /** Search staff members */
  async search(params: PaginationParams & { query: string }) {
    const response = await api.get<ApiResponse<PageResponse<StaffDto>>>('/api/v1/staff/search', { params });
    return response.data;
  },

  /** Get teachers only */
  async getTeachers(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<StaffDto>>>('/api/v1/staff', {
      params: { ...params, role: 'TEACHER' },
    });
    return response.data;
  },
};
