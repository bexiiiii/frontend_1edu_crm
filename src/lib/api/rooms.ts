import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, RoomDto, CreateRoomRequest, RoomStatus } from './types';

// ─── Rooms Service ──────────────────────────────────────────────

export const roomsService = {
  /** Get all rooms */
  async getAll(params?: PaginationParams & { status?: RoomStatus }) {
    const response = await api.get<ApiResponse<PageResponse<RoomDto>>>('/api/v1/rooms', { params });
    return response.data;
  },

  /** Get room by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<RoomDto>>(`/api/v1/rooms/${id}`);
    return response.data;
  },

  /** Create a room */
  async create(data: CreateRoomRequest) {
    const response = await api.post<ApiResponse<RoomDto>>('/api/v1/rooms', data);
    return response.data;
  },

  /** Update room */
  async update(id: string, data: Partial<CreateRoomRequest> & { status?: RoomStatus }) {
    const response = await api.put<ApiResponse<RoomDto>>(`/api/v1/rooms/${id}`, data);
    return response.data;
  },

  /** Delete room */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/rooms/${id}`);
    return response.data;
  },

  /** Search rooms */
  async search(query: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<RoomDto>>>('/api/v1/rooms/search', {
      params: { query, ...params },
    });
    return response.data;
  },
};
