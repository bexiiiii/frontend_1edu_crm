import axios from 'axios';
import { getErrorMessage } from './error-message';
import { pushToast } from './toast';

// In dev, use relative URLs so requests go through Next.js rewrites (avoids CORS).
// In production, point directly at the backend.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || '/auth';
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'ondeedu';
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || '1edu-web-app';

// Main API client (goes through gateway)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function extractTenantIdFromClaims(claims: Record<string, unknown>): string | null {
  const tenantId = claims.tenant_id;
  return typeof tenantId === 'string' && tenantId.trim() ? tenantId : null;
}

// Request interceptor — attach access token.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    let tenantId = localStorage.getItem('tenant_id');

    if (!tenantId && token) {
      tenantId = extractTenantIdFromClaims(decodeJwt(token));
      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }
    }

    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const tokenData = await refreshAccessToken(refreshToken);
          const nextTenantId = extractTenantIdFromClaims(decodeJwt(tokenData.access_token));
          localStorage.setItem('access_token', tokenData.access_token);
          localStorage.setItem('refresh_token', tokenData.refresh_token);
          if (nextTenantId) {
            localStorage.setItem('tenant_id', nextTenantId);
          }
          originalRequest.headers.Authorization = `Bearer ${tokenData.access_token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('edu_crm_auth');
        window.location.href = '/login';
      }
    }

    if (error?.code !== 'ERR_CANCELED') {
      pushToast({
        message: getErrorMessage(error, 'Не удалось выполнить запрос.'),
        tone: 'error',
      });
    }

    return Promise.reject(error);
  }
);

// ─── Keycloak Token Endpoints ───────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
}

/** Login via Keycloak Resource Owner Password Credentials */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<TokenResponse> {
  const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', KEYCLOAK_CLIENT_ID);
  params.append('username', username);
  params.append('password', password);

  const response = await axios.post<TokenResponse>(url, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

/** Refresh access token */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', KEYCLOAK_CLIENT_ID);
  params.append('refresh_token', refreshToken);

  const response = await axios.post<TokenResponse>(url, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

/** Decode JWT payload without verification (for reading claims) */
export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};

    // JWT payload is base64url encoded, normalize before decoding.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

// ─── Auth Service API ───────────────────────────────────────────

export interface UserDto {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions?: string[];
  enabled: boolean;
  photoUrl: string | null;
  language: string | null;
}

export interface TenantDto {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  timezone: string;
  maxStudents: number | null;
  maxStaff: number | null;
  contactPerson: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
  plan?: string;
  timezone?: string;
  maxStudents?: number | null;
  maxStaff?: number | null;
  trialEndsAt?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
  timestamp: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
}

/** Create a user (register staff) */
export async function createUser(data: CreateUserRequest): Promise<ApiResponse<UserDto>> {
  const response = await api.post<ApiResponse<UserDto>>('/api/v1/auth/users', data);
  return response.data;
}

// ─── Public Registration (no auth required) ─────────────────────

export interface RegisterTenantRequest {
  firstName: string;
  lastName: string;
  centerName: string;
  subdomain: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterTenantResponse {
  tenantId: string;
  subdomain: string;
  adminUsername: string;
}

/** Register a new learning center — public endpoint (POST /api/v1/register), no JWT required */
export async function registerTenant(data: RegisterTenantRequest): Promise<ApiResponse<RegisterTenantResponse>> {
  const response = await axios.post<ApiResponse<RegisterTenantResponse>>(
    `${API_BASE_URL}/api/v1/register`,
    data,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}

/** Get current user profile */
export async function getProfile(): Promise<ApiResponse<UserDto>> {
  const response = await api.get<ApiResponse<UserDto>>('/api/v1/auth/profile');
  return response.data;
}

/** Update current user profile */
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  language?: string;
}): Promise<ApiResponse<UserDto>> {
  const response = await api.put<ApiResponse<UserDto>>('/api/v1/auth/profile', data);
  return response.data;
}

/** Change own password */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResponse<void>> {
  const response = await api.post<ApiResponse<void>>('/api/v1/auth/profile/change-password', data);
  return response.data;
}

/** Get tenant by ID */
export async function getTenantById(id: string): Promise<ApiResponse<TenantDto>> {
  const response = await api.get<ApiResponse<TenantDto>>(`/api/v1/tenants/${id}`);
  return response.data;
}

/** Update tenant by ID */
export async function updateTenant(id: string, data: UpdateTenantRequest): Promise<ApiResponse<TenantDto>> {
  const response = await api.put<ApiResponse<TenantDto>>(`/api/v1/tenants/${id}`, data);
  return response.data;
}

export const tenantsService = {
  getById: getTenantById,
  update: updateTenant,
};

// ─── Auth Users Management ──────────────────────────────────────

/** Get all users */
export async function getUsers(params?: { search?: string; page?: number; size?: number }): Promise<ApiResponse<UserDto[]>> {
  const response = await api.get<ApiResponse<UserDto[]>>('/api/v1/auth/users', { params });
  return response.data;
}

/** Get user by ID */
export async function getUserById(id: string): Promise<ApiResponse<UserDto>> {
  const response = await api.get<ApiResponse<UserDto>>(`/api/v1/auth/users/${id}`);
  return response.data;
}

/** Update user */
export async function updateUser(id: string, data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
}): Promise<ApiResponse<UserDto>> {
  const response = await api.put<ApiResponse<UserDto>>(`/api/v1/auth/users/${id}`, data);
  return response.data;
}

/** Deactivate user (soft delete) */
export async function deleteUser(id: string): Promise<ApiResponse<void>> {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/auth/users/${id}`);
  return response.data;
}

/** Reset user password */
export async function resetUserPassword(id: string, newPassword: string): Promise<ApiResponse<void>> {
  const response = await api.post<ApiResponse<void>>(`/api/v1/auth/users/${id}/reset-password`, { newPassword });
  return response.data;
}

/** Update user permissions */
export async function updateUserPermissions(id: string, permissions: string[]): Promise<ApiResponse<UserDto>> {
  const response = await api.put<ApiResponse<UserDto>>(`/api/v1/auth/users/${id}/permissions`, permissions);
  return response.data;
}

export default api;

// Re-export all service modules from the api directory
export { analyticsService } from './api/analytics';
export { reportsService } from './api/reports';
export { studentsService } from './api/students';
export { staffService } from './api/staff';
export { coursesService } from './api/courses';
export { schedulesService } from './api/schedules';
export { lessonsService } from './api/lessons';
export { attendanceService } from './api/attendance';
export { leadsService } from './api/leads';
export { tasksService } from './api/tasks';
export { financeService, studentPaymentsService, salaryService } from './api/finance';
export { filesService } from './api/files';
export { subscriptionsService, priceListService } from './api/subscriptions';
export { notificationsService } from './api/notifications';
export { settingsService } from './api/settings';
export { auditService } from './api/audit';
export { roomsService } from './api/rooms';
export * from './api/types';
