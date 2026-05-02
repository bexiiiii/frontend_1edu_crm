import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  CourseDto,
  CourseEnrollmentDto,
  CourseStatus,
  CourseType,
  CreateCourseRequest,
  UpdateCourseRequest,
} from './types';


// ─── Courses / Classes Service ──────────────────────────────────

export const coursesService = {
  /** Get paginated list of courses */
  async getAll(params?: PaginationParams & { type?: CourseType; status?: CourseStatus }) {
    const response = await api.get<ApiResponse<PageResponse<CourseDto>>>('/api/v1/courses', { params });
    return response.data;
  },

  /** Get course by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<CourseDto>>(`/api/v1/courses/${id}`);
    return response.data;
  },

  /** Create a new course */
  async create(data: CreateCourseRequest) {
    const response = await api.post<ApiResponse<CourseDto>>('/api/v1/courses', data);
    return response.data;
  },

  /** Update course */
  async update(id: string, data: UpdateCourseRequest) {
    const response = await api.put<ApiResponse<CourseDto>>(`/api/v1/courses/${id}`, data);
    return response.data;
  },

  /** Delete a course */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/courses/${id}`);
    return response.data;
  },

  /** Search courses */
  async search(query: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<CourseDto>>>('/api/v1/courses/search', {
      params: { query, ...params },
    });
    return response.data;
  },

  /** Get courses by teacher */
  async getByTeacher(teacherId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<CourseDto>>>(
      `/api/v1/courses/teacher/${teacherId}`, { params }
    );
    return response.data;
  },

  /** Enroll a student into a course */
  async enrollStudent(courseId: string, studentId: string) {
    const response = await api.post<ApiResponse<CourseDto>>(`/api/v1/courses/${courseId}/students/${studentId}`);
    return response.data;
  },

  /** Remove a student from a course */
  async removeStudent(courseId: string, studentId: string) {
    const response = await api.delete<ApiResponse<CourseDto>>(`/api/v1/courses/${courseId}/students/${studentId}`);
    return response.data;
  },

  /** Get enrollment history for a student */
  async getStudentEnrollments(studentId: string) {
    const response = await api.get<ApiResponse<CourseEnrollmentDto[]>>(`/api/v1/courses/student/${studentId}/enrollments`);
    return response.data;
  },
};
