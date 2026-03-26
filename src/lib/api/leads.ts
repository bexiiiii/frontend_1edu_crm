import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  LeadDto,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadStage,
} from './types';

// ─── Leads Service (Kanban) ─────────────────────────────────────

export const leadsService = {
  /** Get paginated list of leads */
  async getAll(params?: PaginationParams & { stage?: LeadStage }) {
    const response = await api.get<ApiResponse<PageResponse<LeadDto>>>('/api/v1/leads', { params });
    return response.data;
  },

  /** Get lead by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<LeadDto>>(`/api/v1/leads/${id}`);
    return response.data;
  },

  /** Create a new lead */
  async create(data: CreateLeadRequest) {
    const response = await api.post<ApiResponse<LeadDto>>('/api/v1/leads', data);
    return response.data;
  },

  /** Update lead */
  async update(id: string, data: UpdateLeadRequest) {
    const response = await api.put<ApiResponse<LeadDto>>(`/api/v1/leads/${id}`, data);
    return response.data;
  },

  /** Move lead to a new stage (stage as query param) */
  async moveStage(id: string, stage: LeadStage) {
    const response = await api.patch<ApiResponse<LeadDto>>(`/api/v1/leads/${id}/stage`, null, {
      params: { stage },
    });
    return response.data;
  },

  /** Delete a lead */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/leads/${id}`);
    return response.data;
  },

  /** Search leads */
  async search(query: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<LeadDto>>>('/api/v1/leads/search', {
      params: { query, ...params },
    });
    return response.data;
  },
};
