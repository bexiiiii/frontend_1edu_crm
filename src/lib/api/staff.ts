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
    // Avoid making staff list requests for users who don't have staff viewing permission.
    // This prevents 403 responses for roles like TEACHER that shouldn't access the endpoint.
    if (typeof window !== 'undefined') {
      try {
        const { useAuthStore } = await import('@/store/authStore');
        const { roles = [], permissions = [] } = useAuthStore.getState();

        // Only allow when user has explicit staff access (tenant admin) or STAFF_VIEW permission.
        const hasStaffRole = roles.some((r: string) => r === 'TENANT_ADMIN');
        const hasStaffPermission = Array.isArray(permissions) && permissions.includes('STAFF_VIEW');

        if (!hasStaffRole && !hasStaffPermission) {
          return {
            success: true,
            message: '',
            errorCode: null,
            data: {
              content: [],
              page: params?.page ?? 0,
              size: params?.size ?? 0,
              totalElements: 0,
              totalPages: 0,
              first: true,
              last: true,
              hasNext: false,
              hasPrevious: false,
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse<PageResponse<StaffDto>>;
        }
      } catch {
        // if store import fails, fall through and attempt the request (best effort)
      }
    }

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
