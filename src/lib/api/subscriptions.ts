import api from '../api';
import type { ApiResponse, PageResponse, PaginationParams, SubscriptionDto, PriceListDto, SubscriptionStatus } from './types';

// ─── Subscriptions Service ──────────────────────────────────────

export const subscriptionsService = {
  /** Get all subscriptions */
  async getAll(params?: PaginationParams & { status?: SubscriptionStatus; courseId?: string }) {
    const response = await api.get<ApiResponse<PageResponse<SubscriptionDto>>>('/api/v1/subscriptions', { params });
    return response.data;
  },

  /** Get subscription by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<SubscriptionDto>>(`/api/v1/subscriptions/${id}`);
    return response.data;
  },

  /** Get subscriptions by student */
  async getByStudent(studentId: string, params?: PaginationParams & { status?: SubscriptionStatus }) {
    const response = await api.get<ApiResponse<PageResponse<SubscriptionDto>>>(
      `/api/v1/subscriptions/student/${studentId}`, { params }
    );
    return response.data;
  },

  /** Create subscription */
  async create(data: {
    studentId: string;
    courseId?: string;
    groupId?: string;
    priceListId?: string;
    totalLessons: number;
    startDate: string;
    endDate?: string;
    amount: number;
    currency?: string;
    notes?: string;
  }) {
    const response = await api.post<ApiResponse<SubscriptionDto>>('/api/v1/subscriptions', data);
    return response.data;
  },

  /** Update subscription */
  async update(id: string, data: Partial<{
    lessonsLeft: number;
    endDate: string;
    amount: number;
    currency: string;
    notes: string;
    status: SubscriptionStatus;
  }>) {
    const response = await api.put<ApiResponse<SubscriptionDto>>(`/api/v1/subscriptions/${id}`, data);
    return response.data;
  },

  /** Cancel subscription */
  async cancel(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/subscriptions/${id}/cancel`);
    return response.data;
  },
};

// ─── PriceList Service ──────────────────────────────────────────

export const priceListService = {
  /** Get all price lists */
  async getAll(params?: PaginationParams & { active?: boolean }) {
    const response = await api.get<ApiResponse<PageResponse<PriceListDto>>>('/api/v1/price-lists', { params });
    return response.data;
  },

  /** Get price list by ID */
  async getById(id: string) {
    const response = await api.get<ApiResponse<PriceListDto>>(`/api/v1/price-lists/${id}`);
    return response.data;
  },

  /** Get price lists by course */
  async getByCourse(courseId: string, params?: PaginationParams) {
    const response = await api.get<ApiResponse<PageResponse<PriceListDto>>>(
      `/api/v1/price-lists/course/${courseId}`, { params }
    );
    return response.data;
  },

  /** Create price list */
  async create(data: {
    name: string;
    courseId?: string;
    price: number;
    lessonsCount: number;
    validityDays: number;
    isActive?: boolean;
    description?: string;
  }) {
    const response = await api.post<ApiResponse<PriceListDto>>('/api/v1/price-lists', data);
    return response.data;
  },

  /** Update price list */
  async update(id: string, data: Partial<{
    name: string;
    price: number;
    lessonsCount: number;
    validityDays: number;
    isActive: boolean;
    description: string;
  }>) {
    const response = await api.put<ApiResponse<PriceListDto>>(`/api/v1/price-lists/${id}`, data);
    return response.data;
  },

  /** Delete price list */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/price-lists/${id}`);
    return response.data;
  },
};
