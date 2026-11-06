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
  ReturnStudentToGroupRequest,
  AddStudentToBranchRequest,
  StudentBranchDto,
  SimilarStudentDto,
  StudentMembershipDto,
} from './types';

// ─── Students Service ───────────────────────────────────────────

export interface StudentRestoreOptionsDto {
  /** Deletion day (YYYY-MM-DD). */
  deletedOn: string;
  /** Earliest allowed return date: the day after the deletion. */
  earliestReturnDate: string;
  groups: { groupId: string; groupName: string; courseName: string }[];
}

export const studentsService = {
  /** Get paginated list of students */
  async getAll(params?: PaginationParams & { status?: StudentStatus; includeDeleted?: boolean }) {
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

  /** Move a student profile to another branch. Active source enrolments are closed. */
  async transferToBranch(id: string, targetBranchId: string) {
    const response = await api.post<ApiResponse<StudentDto>>(
      `/api/v1/students/${id}/transfer-branch`,
      { targetBranchId }
    );
    return response.data;
  },

  /** Mark a student as deleted (soft delete: card, payments and attendance are kept) */
  async delete(id: string, reason?: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/students/${id}`, {
      params: reason ? { reason } : undefined,
    });
    return response.data;
  },

  /** All group memberships of the student in every branch, labelled with the branch. */
  async getMemberships(id: string) {
    const response = await api.get<ApiResponse<StudentMembershipDto[]>>(`/api/v1/students/${id}/memberships`);
    return response.data;
  },

  /** Deleted student: deletion day and the groups the deletion closed (choices for «Восстановить»). */
  async restoreOptions(id: string) {
    const response = await api.get<ApiResponse<StudentRestoreOptionsDto>>(`/api/v1/students/${id}/restore-options`);
    return response.data;
  },

  /**
   * Restore a soft-deleted student (status ACTIVE). Each of groupIds is returned like
   * «Вернуть в группу с даты» from fromDate (new period); empty = card only.
   */
  async restore(id: string, body: { groupIds: string[]; fromDate?: string } = { groupIds: [] }) {
    const response = await api.post<ApiResponse<StudentDto>>(`/api/v1/students/${id}/restore`, body);
    return response.data;
  },

  /** Get student stats */
  async getStats() {
    const response = await api.get<ApiResponse<StudentStatsDto>>('/api/v1/students/stats');
    return response.data;
  },

  /** Search students */
  async search(params: PaginationParams & { query: string; includeDeleted?: boolean }) {
    const response = await api.get<ApiResponse<PageResponse<StudentDto>>>('/api/v1/students/search', {
      params,
    });
    return response.data;
  },

  /** Get students by group */
  /** Students of several groups at once: { [groupId]: same page as getByGroup }. 2026-11-04. */
  async getByGroups(groupIds: string[], params?: PaginationParams) {
    const response = await api.get<ApiResponse<Record<string, PageResponse<StudentDto>>>>(
      '/api/v1/students/group-batch',
      { params: { ...params, ids: groupIds.join(',') } }
    );
    return response.data;
  },

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

  /** Return a withdrawn student to a group starting from the given date (YYYY-MM-DD) */
  async returnToGroup(studentId: string, groupId: string, fromDate: string) {
    const body: ReturnStudentToGroupRequest = { fromDate };
    const response = await api.post<ApiResponse<void>>(
      `/api/v1/students/${studentId}/groups/${groupId}/return`,
      body
    );
    return response.data;
  },

  /** Attach the same student card to one more branch; returns the student's branch list */
  async addToBranch(studentId: string, branchId: string) {
    const body: AddStudentToBranchRequest = { branchId };
    const response = await api.post<ApiResponse<StudentBranchDto[]>>(`/api/v1/students/${studentId}/branches`, body);
    return response.data;
  },

  /**
   * Students with the same phone — a duplicate hint shown next to the phone field.
   * Never blocks creation, so errors are silent (no global toast).
   */
  async findSimilar(phone: string, excludeId?: string) {
    const response = await api.get<ApiResponse<SimilarStudentDto[]>>('/api/v1/students/similar', {
      params: excludeId ? { phone, excludeId } : { phone },
      skipErrorToast: true,
    });
    return response.data;
  },

  /** «Добавить в мой филиал»: links a student of another branch (matched by phone) to the current branch. */
  async linkToCurrentBranch(studentId: string, phone: string) {
    const response = await api.post<ApiResponse<SimilarStudentDto>>(
      `/api/v1/students/${studentId}/link-current-branch`,
      null,
      { params: { phone } },
    );
    return response.data;
  },
};

/** POST /api/v1/students/{studentId}/groups/{groupId}/return */
export const returnStudentToGroup = (studentId: string, groupId: string, fromDate: string) =>
  studentsService.returnToGroup(studentId, groupId, fromDate);

/** POST /api/v1/students/{studentId}/branches */
export const addStudentToBranch = (studentId: string, branchId: string) =>
  studentsService.addToBranch(studentId, branchId);
