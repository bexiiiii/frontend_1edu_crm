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
  ResumeCourseRequest,
  StopCourseRequest,
  UpdateCourseRequest,
} from './types';
import { isApiErrorCode } from '../error-message';

/** Delete of a course with students/lessons is refused with this code (the caller offers stop / archive). */
export const COURSE_HAS_DATA = 'COURSE_HAS_DATA';


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

  /**
   * Delete a course. A course with students/lessons fails with {@link COURSE_HAS_DATA}
   * (no toast — the caller shows a choice) unless `archive` is set: then it is archived
   * (restorable) and the archived course is returned.
   */
  async delete(id: string, options?: { archive?: boolean }) {
    const response = await api.delete<ApiResponse<CourseDto | null>>(`/api/v1/courses/${id}`, {
      params: options?.archive ? { archive: true } : undefined,
      skipErrorToast: (error) => isApiErrorCode(error, COURSE_HAS_DATA),
    });
    return response.data;
  },

  /** «Остановить курс» from a date: lessons after it are cancelled; restorable via resume. */
  async stop(id: string, data: StopCourseRequest) {
    const response = await api.post<ApiResponse<CourseDto>>(`/api/v1/courses/${id}/stop`, data);
    return response.data;
  },

  /** «Возобновить» a stopped or archived course from a date. */
  async resume(id: string, data: ResumeCourseRequest) {
    const response = await api.post<ApiResponse<CourseDto>>(`/api/v1/courses/${id}/resume`, data);
    return response.data;
  },

  /** Move a course and all of its branch-bound learning and billing data. */
  async transferToBranch(
    id: string,
    data: { targetBranchId: string; targetLevelId: string; targetRoomId?: string | null }
  ) {
    const response = await api.post<ApiResponse<CourseDto>>(`/api/v1/courses/${id}/transfer-branch`, data);
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
  async enrollStudent(courseId: string, studentId: string, discountPercent?: number, startDate?: string) {
    const response = await api.post<ApiResponse<CourseDto>>(
      `/api/v1/courses/${courseId}/students/${studentId}`,
      null,
      { params: { ...(discountPercent != null ? { discountPercent } : {}), ...(startDate ? { startDate } : {}) } }
    );
    return response.data;
  },

  /** Change the effective start date without losing enrollment history. */
  async updateEnrollmentDate(courseId: string, studentId: string, startDate: string) {
    const response = await api.patch<ApiResponse<CourseEnrollmentDto>>(
      `/api/v1/courses/${courseId}/students/${studentId}/enrollment-date`,
      null,
      { params: { startDate } }
    );
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

  /** Get enrollments for all students in a course */
  async getCourseEnrollments(courseId: string) {
    const response = await api.get<ApiResponse<CourseEnrollmentDto[]>>(`/api/v1/courses/${courseId}/enrollments`);
    return response.data;
  },
};
