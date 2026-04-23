import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  InventoryItemDto,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from './types';

// ─── Inventory Service ───────────────────────────────────────────

export const inventoryService = {
  /** Get list of inventory items */
  async getAll(params?: { status?: string; search?: string; page?: number; size?: number }) {
    const queryParams: Record<string, any> = {};
    
    if (params?.status) queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.size !== undefined) queryParams.size = params.size;

    const response = await api.get<ApiResponse<PageResponse<InventoryItemDto>>>(
      '/api/v1/inventory/items',
      { params: Object.keys(queryParams).length > 0 ? queryParams : undefined }
    );
    return response.data;
  },

  /** Get inventory item by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<InventoryItemDto>>(
      `/api/v1/inventory/items/${id}`
    );
    return response.data;
  },

  /** Create inventory item */
  async create(data: CreateInventoryItemRequest) {
    const response = await api.post<ApiResponse<InventoryItemDto>>(
      '/api/v1/inventory/items',
      data
    );
    return response.data;
  },

  /** Update inventory item */
  async update(id: string, data: UpdateInventoryItemRequest) {
    const response = await api.put<ApiResponse<InventoryItemDto>>(
      `/api/v1/inventory/items/${id}`,
      data
    );
    return response.data;
  },

  /** Delete inventory item */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/inventory/items/${id}`
    );
    return response.data;
  },

  /** Get items by category */
  async getByCategory(categoryId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<InventoryItemDto>>>(
      `/api/v1/inventory/items/category/${categoryId}`,
      { params }
    );
    return response.data;
  },

  /** Get items requiring reorder */
  async getReorderRequired(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<InventoryItemDto>>>(
      '/api/v1/inventory/items/reorder-required',
      { params }
    );
    return response.data;
  },
};
