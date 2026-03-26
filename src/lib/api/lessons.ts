import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, LessonDto, CreateLessonRequest } from './types';

// ─── Lessons Service ────────────────────────────────────────────

export const lessonsService = {
  /** Get paginated list of lessons */
  async getAll(params?: PaginationParams & {
    groupId?: string;
    teacherId?: string;
    status?: string;
    date?: string;
    from?: string;
    to?: string;
    type?: string;
  }) {
    const response = await api.get<ApiResponse<PageResponse<LessonDto>>>('/api/v1/lessons', { params });
    return response.data;
  },

  /** Get lessons for calendar range */
  async getCalendar(params: { from: string; to: string }) {
    const response = await api.get<ApiResponse<LessonDto[]>>('/api/v1/lessons/calendar', { params });
    return response.data;
  },

  /** Get lesson by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}`);
    return response.data;
  },

  /** Create a new lesson */
  async create(data: CreateLessonRequest) {
    const response = await api.post<ApiResponse<LessonDto>>('/api/v1/lessons', data);
    return response.data;
  },

  /** Update lesson */
  async update(id: string, data: Partial<CreateLessonRequest>) {
    const response = await api.put<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}`, data);
    return response.data;
  },

  /** Delete lesson */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/lessons/${id}`);
    return response.data;
  },

  /** Cancel lesson */
  async cancel(id: string) {
    const response = await api.post<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}/cancel`);
    return response.data;
  },

  /** Complete lesson */
  async complete(id: string, data?: { topic?: string; homework?: string }) {
    const response = await api.post<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}/complete`, data);
    return response.data;
  },

  /** Mark teacher absent */
  async teacherAbsent(id: string) {
    const response = await api.post<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}/teacher-absent`);
    return response.data;
  },

  /** Mark teacher sick */
  async teacherSick(id: string) {
    const response = await api.post<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}/teacher-sick`);
    return response.data;
  },

  /** Reschedule lesson */
  async reschedule(id: string, data: { newDate: string; newStartTime: string; newEndTime: string }) {
    const response = await api.post<ApiResponse<LessonDto>>(`/api/v1/lessons/${id}/reschedule`, data);
    return response.data;
  },

  /** Get lessons by group */
  async getByGroup(groupId: string, params?: PaginationParams & { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<PageResponse<LessonDto>>>(
      `/api/v1/lessons/group/${groupId}`, { params }
    );
    return response.data;
  },

  /** Get lessons by teacher */
  async getByTeacher(teacherId: string, params?: PaginationParams & { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<PageResponse<LessonDto>>>(
      `/api/v1/lessons/teacher/${teacherId}`, { params }
    );
    return response.data;
  },
};
