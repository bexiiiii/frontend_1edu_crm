import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  StudentDto,
  CreateStudentRequest,
  StudentStatsDto,
  StudentStatus,
  UpdateStudentRequest,
} from './types';

// ─── Students Service ───────────────────────────────────────────

export const studentsService = {
  /** Get paginated list of students */
  async getAll(params?: PaginationParams & { status?: StudentStatus }) {
    const response = await api.get<ApiResponse<PageResponse<StudentDto>>>('/api/v1/students', { params });
    return response.data;
  },

  /** Get student by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<StudentDto>>(`/api/v1/students/${id}`);
    return response.data;
  },

  /** Create a new student */
  async create(data: CreateStudentRequest) {
    const response = await api.post<ApiResponse<StudentDto>>('/api/v1/students', data);
    return response.data;
  },

  /** Update student */
  async update(id: string, data: UpdateStudentRequest) {
    const response = await api.put<ApiResponse<StudentDto>>(`/api/v1/students/${id}`, data);
    return response.data;
  },

  /** Delete a student */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/students/${id}`);
    return response.data;
  },

  /** Get student stats */
  async getStats() {
    const response = await api.get<ApiResponse<StudentStatsDto>>('/api/v1/students/stats');
    return response.data;
  },

  /** Search students */
  async search(params: PaginationParams & { query: string }) {
    const response = await api.get<ApiResponse<PageResponse<StudentDto>>>('/api/v1/students/search', {
      params,
    });
    return response.data;
  },

  /** Get students by group */
  async getByGroup(groupId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<StudentDto>>>(
      `/api/v1/students/group/${groupId}`, { params }
    );
    return response.data;
  },

  /** Add student to group */
  async addToGroup(studentId: string, groupId: string) {
    const response = await api.post<ApiResponse<void>>(`/api/v1/students/${studentId}/groups/${groupId}`);
    return response.data;
  },

  /** Remove student from group */
  async removeFromGroup(studentId: string, groupId: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/students/${studentId}/groups/${groupId}`);
    return response.data;
  },
};
