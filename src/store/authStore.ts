import { create } from 'zustand';
import {
  loginWithCredentials,
  registerTenant,
  getProfile,
  decodeJwt,
  type UserDto,
  type RegisterTenantRequest,
} from '@/lib/api';
import { pushToast } from '@/lib/toast';

type AuthState = {
  isAuthenticated: boolean;
  userEmail: string | null;
  user: UserDto | null;
  roles: string[];
  tenantId: string | null;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterTenantRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
};

function extractTenantId(claims: Record<string, unknown>): string | null {
  const tenantId = claims.tenant_id;
  return typeof tenantId === 'string' && tenantId.trim() ? tenantId : null;
}

function extractRoles(claims: Record<string, unknown>): string[] {
  const directRoles = claims.roles;
  if (Array.isArray(directRoles)) {
    return directRoles.filter((role): role is string => typeof role === 'string');
  }

  const realmRoles = (claims.realm_access as { roles?: unknown })?.roles;
  if (Array.isArray(realmRoles)) {
    return realmRoles.filter((role): role is string => typeof role === 'string');
  }

  return [];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userEmail: null,
  user: null,
  roles: [],
  tenantId: null,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    const loginValue = username.trim();

    set({ loading: true, error: null });
    try {
      const tokenData = await loginWithCredentials(loginValue, password);

      // Store tokens
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);

      // Decode JWT to get claims
      const claims = decodeJwt(tokenData.access_token);
      const tenantId = extractTenantId(claims);
      const roles = extractRoles(claims);

      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }

      // Persist auth info
      localStorage.setItem(
        'edu_crm_auth',
        JSON.stringify({
          email: loginValue,
          tenantId,
          roles,
        })
      );

      set({
        isAuthenticated: true,
        userEmail: loginValue,
        roles,
        tenantId,
        loading: false,
        error: null,
      });

      // Fetch full profile in background
      try {
        await get().fetchProfile();
      } catch {
        // Profile fetch is optional, login already succeeded
      }
    } catch (err: unknown) {
      let message = 'Ошибка авторизации. Проверьте логин и пароль.';

      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number; data?: { error_description?: string } } }).response;
        if (response?.status === 401) {
          message = 'Неверный логин или пароль.';
        } else if (response?.data?.error_description) {
          message = response.data.error_description;
        }
      }

      set({ loading: false, error: message });
      pushToast({ message, tone: 'error' });
      throw new Error(message);
    }
  },

  register: async (data: RegisterTenantRequest) => {
    set({ loading: true, error: null });
    try {
      const normalizedData: RegisterTenantRequest = {
        ...data,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        centerName: data.centerName.trim(),
        subdomain: data.subdomain.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
      };

      const response = await registerTenant(normalizedData);

      if (!response.success) {
        throw new Error(response.message || 'Ошибка регистрации');
      }

      set({ loading: false, error: null });

      // After registration, auto-login with backend-provided username.
      const loginUsername = response.data?.adminUsername || normalizedData.email;
      await get().login(loginUsername, normalizedData.password);
    } catch (err: unknown) {
      let message = 'Ошибка регистрации. Попробуйте позже.';

      if (err instanceof Error) {
        message = err.message;
      }

      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string; errorCode?: string } } }).response;
        if (response?.data?.message) {
          message = response.data.message;
        }
        if (response?.data?.errorCode === 'USER_CREATION_FAILED') {
          message = 'Регистрация не завершена: бэкенд не смог создать админ-аккаунт в Keycloak.';
        }
      }

      set({ loading: false, error: message });
      pushToast({ message, tone: 'error' });
      throw new Error(message);
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('edu_crm_auth');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('tenant_id');
    }
    set({
      isAuthenticated: false,
      userEmail: null,
      user: null,
      roles: [],
      tenantId: null,
      error: null,
    });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const stored = localStorage.getItem('edu_crm_auth');

      if (token && stored) {
        try {
          const { email, tenantId: storedTenantId, roles: storedRoles } = JSON.parse(stored);

          // Check if token is expired
          const claims = decodeJwt(token);
          const exp = claims.exp as number;
          if (exp && Date.now() / 1000 > exp) {
            // Token expired — try to refresh or logout
            get().logout();
            return;
          }

          const tenantId = extractTenantId(claims) || storedTenantId || null;
          const roles = extractRoles(claims);

          if (tenantId) {
            localStorage.setItem('tenant_id', tenantId);
          }

          localStorage.setItem(
            'edu_crm_auth',
            JSON.stringify({
              email,
              tenantId,
              roles: roles.length > 0 ? roles : storedRoles || [],
            })
          );

          set({
            isAuthenticated: true,
            userEmail: email,
            tenantId,
            roles: roles.length > 0 ? roles : storedRoles || [],
          });
        } catch {
          get().logout();
        }
      } else {
        set({ isAuthenticated: false, userEmail: null });
      }
    }
  },

  fetchProfile: async () => {
    try {
      const response = await getProfile();
      if (response.success && response.data) {
        set({
          user: response.data,
          userEmail: response.data.email,
          roles: response.data.roles,
        });
      }
    } catch {
      // Silently fail — user is still authenticated
    }
  },

  clearError: () => set({ error: null }),
}));
