import api from '../api';
import type {
  ApiResponse,
  PageResponse,
  PaginationParams,
  InventoryItemDto,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryCategoryDto,
  InventoryUnitDto,
  InventoryStatsDto,
  InventoryReportDto,
  InventoryRevisionRequest,
  InventoryRevisionResultDto,
  InventoryTransactionDto,
  CreateInventoryTransactionRequest,
  SaveInventoryCategoryRequest,
  SaveInventoryUnitRequest,
} from './types';

function getFilenameFromDisposition(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return fallback;
}

async function downloadInventoryExport(path: string, fallbackFilename: string, params?: Record<string, unknown>) {
  const response = await api.get<Blob>(path, {
    params,
    responseType: 'blob',
  });

  return {
    blob: response.data,
    filename: getFilenameFromDisposition(response.headers['content-disposition'], fallbackFilename),
    contentType: response.headers['content-type'],
  };
}

// ─── Inventory Service ───────────────────────────────────────────

export const inventoryService = {
  /** Get list of inventory items */
  async getAll(params?: { status?: string; search?: string; page?: number; size?: number }) {
    const queryParams: Record<string, string | number> = {};
    
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

  /** Create transaction for an item */
  async createTransaction(itemId: string, data: CreateInventoryTransactionRequest) {
    const response = await api.post<ApiResponse<InventoryTransactionDto>>(
      `/api/v1/inventory/items/${itemId}/transactions`,
      data
    );
    return response.data;
  },

  /** Get transaction history for an item */
  async getItemTransactions(
    itemId: string,
    params?: PaginationParams & { fromDate?: string; toDate?: string }
  ) {
    const response = await api.get<ApiResponse<PageResponse<InventoryTransactionDto>>>(
      `/api/v1/inventory/items/${itemId}/transactions`,
      { params }
    );
    return response.data;
  },

  /** Get transactions filtered by type */
  async getTransactionsByType(transactionType: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<InventoryTransactionDto>>>(
      '/api/v1/inventory/transactions',
      { params: { transactionType, ...params } }
    );
    return response.data;
  },

  /** Get transactions by date range */
  async getTransactionsByDateRange(fromDate: string, toDate: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<InventoryTransactionDto>>>(
      '/api/v1/inventory/transactions/date-range',
      { params: { fromDate, toDate, ...params } }
    );
    return response.data;
  },

  /** Get inventory categories */
  async getCategories() {
    const response = await api.get<ApiResponse<InventoryCategoryDto[]>>('/api/v1/inventory/categories');
    return response.data;
  },

  /** Get category by ID */
  async getCategoryById(id: string) {
    const response = await api.get<ApiResponse<InventoryCategoryDto>>(`/api/v1/inventory/categories/${id}`);
    return response.data;
  },

  /** Create inventory category */
  async createCategory(data: SaveInventoryCategoryRequest) {
    const response = await api.post<ApiResponse<InventoryCategoryDto>>('/api/v1/inventory/categories', data);
    return response.data;
  },

  /** Update inventory category */
  async updateCategory(id: string, data: SaveInventoryCategoryRequest) {
    const response = await api.put<ApiResponse<InventoryCategoryDto>>(`/api/v1/inventory/categories/${id}`, data);
    return response.data;
  },

  /** Delete inventory category */
  async deleteCategory(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/inventory/categories/${id}`);
    return response.data;
  },

  /** Get inventory units */
  async getUnits() {
    const response = await api.get<ApiResponse<InventoryUnitDto[]>>('/api/v1/inventory/units');
    return response.data;
  },

  /** Get unit by ID */
  async getUnitById(id: string) {
    const response = await api.get<ApiResponse<InventoryUnitDto>>(`/api/v1/inventory/units/${id}`);
    return response.data;
  },

  /** Create inventory unit */
  async createUnit(data: SaveInventoryUnitRequest) {
    const response = await api.post<ApiResponse<InventoryUnitDto>>('/api/v1/inventory/units', data);
    return response.data;
  },

  /** Update inventory unit */
  async updateUnit(id: string, data: SaveInventoryUnitRequest) {
    const response = await api.put<ApiResponse<InventoryUnitDto>>(`/api/v1/inventory/units/${id}`, data);
    return response.data;
  },

  /** Delete inventory unit */
  async deleteUnit(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/inventory/units/${id}`);
    return response.data;
  },

  /** Get inventory statistics */
  async getStats() {
    const response = await api.get<ApiResponse<InventoryStatsDto>>('/api/v1/inventory/stats');
    return response.data;
  },

  /** Get inventory report in JSON format */
  async getReport() {
    const response = await api.get<ApiResponse<InventoryReportDto>>('/api/v1/inventory/report');
    return response.data;
  },

  /** Download inventory report (xlsx) */
  async exportReport() {
    return downloadInventoryExport('/api/v1/inventory/report/export', 'inventory-report.xlsx');
  },

  /** Download inventory items list (xlsx) */
  async exportItems() {
    return downloadInventoryExport('/api/v1/inventory/items/export', 'inventory-items.xlsx');
  },

  /** Download inventory transactions journal (xlsx) */
  async exportTransactions(params?: { fromDate?: string; toDate?: string }) {
    return downloadInventoryExport('/api/v1/inventory/transactions/export', 'inventory-transactions.xlsx', params);
  },

  /** Conduct inventory revision with actual balances */
  async conductRevision(data: InventoryRevisionRequest) {
    const response = await api.post<ApiResponse<InventoryRevisionResultDto>>('/api/v1/inventory/revision', data);
    return response.data;
  },

  /** Get revision details by id */
  async getRevision(id: string) {
    const response = await api.get<ApiResponse<any>>(`/api/v1/inventory/revisions/${id}`);
    return response.data;
  },

  /** Complete (finalize) revision */
  async completeRevision(id: string) {
    const response = await api.post<ApiResponse<void>>(`/api/v1/inventory/revisions/${id}/complete`);
    return response.data;
  },
};
