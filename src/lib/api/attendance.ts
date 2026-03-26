import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, AttendanceDto, AttendanceStatus } from './types';

// ─── Attendance Service ─────────────────────────────────────────

export const attendanceService = {
  /** Mark single attendance for a lesson */
  async mark(lessonId: string, data: { studentId: string; status: AttendanceStatus; notes?: string }) {
    const response = await api.post<ApiResponse<AttendanceDto>>(
      `/api/v1/lessons/${lessonId}/attendance`, data
    );
    return response.data;
  },

  /** Bulk mark attendance for a lesson */
  async bulkMark(
    lessonId: string,
    attendances: { studentId: string; status: AttendanceStatus; notes?: string }[]
  ) {
    const response = await api.post<ApiResponse<AttendanceDto[]>>(
      `/api/v1/lessons/${lessonId}/attendance/bulk`, { attendances }
    );
    return response.data;
  },

  /** Mark all students as ATTENDED for a lesson */
  async markAll(lessonId: string, studentIds: string[]) {
    const response = await api.post<ApiResponse<AttendanceDto[]>>(
      `/api/v1/lessons/${lessonId}/attendance/mark-all`, studentIds
    );
    return response.data;
  },

  /** Get attendance list for a lesson */
  async getByLesson(lessonId: string) {
    const response = await api.get<ApiResponse<AttendanceDto[]>>(
      `/api/v1/lessons/${lessonId}/attendance`
    );
    return response.data;
  },

  /** Get student attendance history */
  async getStudentHistory(studentId: string, params?: PaginationParams & { from?: string; to?: string }) {
    const response = await api.get<ApiResponse<PageResponse<AttendanceDto>>>(
      `/api/v1/attendance/student/${studentId}`, { params }
    );
    return response.data;
  },
};
