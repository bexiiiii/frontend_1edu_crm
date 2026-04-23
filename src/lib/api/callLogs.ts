import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  StudentCallLogDto,
  SaveStudentCallLogRequest,
} from './types';

// ─── Student Call Logs Service ───────────────────────────────────

export const studentCallLogsService = {
  /** Get call logs for a student */
  async getByStudent(studentId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<StudentCallLogDto>>>(
      `/api/v1/students/call-logs/student/${studentId}`,
      { params }
    );
    return response.data;
  },

  /** Get call logs for a student in date range */
  async getByStudentRange(
    studentId: string,
    params: { fromDate: string; toDate: string } & PaginationParams
  ) {
    const response = await api.get<ApiResponse<PageResponse<StudentCallLogDto>>>(
      `/api/v1/students/call-logs/student/${studentId}/range`,
      { params }
    );
    return response.data;
  },

  /** Create a call log entry */
  async create(data: SaveStudentCallLogRequest) {
    const response = await api.post<ApiResponse<StudentCallLogDto>>(
      '/api/v1/students/call-logs',
      data
    );
    return response.data;
  },

  /** Update a call log entry */
  async update(id: string, data: SaveStudentCallLogRequest) {
    const response = await api.put<ApiResponse<StudentCallLogDto>>(
      `/api/v1/students/call-logs/${id}`,
      data
    );
    return response.data;
  },

  /** Delete a call log entry */
  async delete(id: string, reason: string) {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/students/call-logs/${id}`,
      { params: { reason } }
    );
    return response.data;
  },

  /** Get call logs by caller (staff) */
  async getByCaller(staffId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<StudentCallLogDto>>>(
      `/api/v1/students/call-logs/caller/${staffId}`,
      { params }
    );
    return response.data;
  },
};
