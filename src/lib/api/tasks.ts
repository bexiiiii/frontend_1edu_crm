import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  TaskDto,
  CreateTaskRequest,
  TaskStatus,
  UpdateTaskRequest,
} from './types';

// ─── Tasks Service ──────────────────────────────────────────────

export const tasksService = {
  /** Get paginated list of tasks */
  async getAll(params?: PaginationParams & { status?: TaskStatus }) {
    const response = await api.get<ApiResponse<PageResponse<TaskDto>>>('/api/v1/tasks', { params });
    return response.data;
  },

  /** Get task by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<TaskDto>>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  /** Create a new task */
  async create(data: CreateTaskRequest) {
    const response = await api.post<ApiResponse<TaskDto>>('/api/v1/tasks', data);
    return response.data;
  },

  /** Update task */
  async update(id: string, data: UpdateTaskRequest) {
    const response = await api.put<ApiResponse<TaskDto>>(`/api/v1/tasks/${id}`, data);
    return response.data;
  },

  /** Delete task */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  /** Get tasks assigned to a specific employee */
  async getByAssignee(
    assignedTo: string,
    params?: PaginationParams & { status?: TaskStatus }
  ) {
    const response = await api.get<ApiResponse<PageResponse<TaskDto>>>(`/api/v1/tasks/assignee/${assignedTo}`, {
      params,
    });
    return response.data;
  },

  /** Search tasks by text query */
  async search(params: PaginationParams & { query: string }) {
    const response = await api.get<ApiResponse<PageResponse<TaskDto>>>('/api/v1/tasks/search', { params });
    return response.data;
  },

  /** Get overdue tasks */
  async getOverdue(params?: PaginationParams & { sort?: string }) {
    const response = await api.get<ApiResponse<PageResponse<TaskDto>>>('/api/v1/tasks/overdue', {
      params,
    });
    return response.data;
  },
};
