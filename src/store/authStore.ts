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
  permissions: string[];
  tenantId: string | null;
  branchId: string | null;
  branchIds: string[];
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterTenantRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setBranchId: (branchId: string) => void;
};

function extractTenantId(claims: Record<string, unknown>): string | null {
  const tenantId = claims.tenant_id;
  return typeof tenantId === 'string' && tenantId.trim() ? tenantId : null;
}

function extractBranchIds(claims: Record<string, unknown>): string[] {
  const directBranchIds = claims.branch_ids;
  if (Array.isArray(directBranchIds)) {
    return directBranchIds.filter((branchId): branchId is string => typeof branchId === 'string' && branchId.trim());
  }

  const directBranchId = claims.branch_id;
  if (typeof directBranchId === 'string' && directBranchId.trim()) {
    return [directBranchId];
  }

  return [];
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

function extractPermissions(claims: Record<string, unknown>): string[] {
  const directPermissions = claims.permissions;
  if (Array.isArray(directPermissions)) {
    return directPermissions.filter((permission): permission is string => typeof permission === 'string');
  }

  return [];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userEmail: null,
  user: null,
  roles: [],
  permissions: [],
  tenantId: null,
  branchId: null,
  branchIds: [],
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
      const branchIds = extractBranchIds(claims);
      const branchId = branchIds[0] || null;
      const roles = extractRoles(claims);
      const permissions = extractPermissions(claims);

      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }
      if (branchId) {
        localStorage.setItem('branch_id', branchId);
      }
      localStorage.setItem('branch_ids', JSON.stringify(branchIds));

      // Persist auth info
      localStorage.setItem(
        'edu_crm_auth',
        JSON.stringify({
          email: loginValue,
          tenantId,
          branchId,
          branchIds,
          roles,
          permissions,
        })
      );

      set({
        isAuthenticated: true,
        userEmail: loginValue,
        roles,
        permissions,
        tenantId,
        branchId,
        branchIds,
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
      localStorage.removeItem('branch_id');
      localStorage.removeItem('branch_ids');
    }
    set({
      isAuthenticated: false,
      userEmail: null,
      user: null,
      roles: [],
      permissions: [],
      tenantId: null,
      branchId: null,
      branchIds: [],
      error: null,
    });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const stored = localStorage.getItem('edu_crm_auth');

      if (token && stored) {
        try {
          const {
            email,
            tenantId: storedTenantId,
            branchId: storedBranchId,
            branchIds: storedBranchIds,
            roles: storedRoles,
            permissions: storedPermissions,
          } = JSON.parse(stored);

          // Check if token is expired
          const claims = decodeJwt(token);
          const exp = claims.exp as number;
          if (exp && Date.now() / 1000 > exp) {
            // Token expired — try to refresh or logout
            get().logout();
            return;
          }

          const tenantId = extractTenantId(claims) || storedTenantId || null;
          const tokenBranchIds = extractBranchIds(claims);
          const branchIds = tokenBranchIds.length > 0
            ? tokenBranchIds
            : Array.isArray(storedBranchIds)
              ? storedBranchIds.filter((item): item is string => typeof item === 'string' && item.trim())
              : [];

          // Respect user-selected branchId if it's still in the allowed branch_ids list.
          // If not, fall back to the first branch from claims.
          let branchId: string | null = null;
          if (storedBranchId && branchIds.includes(storedBranchId)) {
            branchId = storedBranchId;
          } else {
            branchId = branchIds[0] || storedBranchId || null;
          }
          const roles = extractRoles(claims);
          const permissions = extractPermissions(claims);

          if (tenantId) {
            localStorage.setItem('tenant_id', tenantId);
          }
          // Only sync branch_id in localStorage if it changed.
          const currentStoredBranchId = localStorage.getItem('branch_id');
          if (branchId && branchId !== currentStoredBranchId) {
            localStorage.setItem('branch_id', branchId);
          }
          localStorage.setItem('branch_ids', JSON.stringify(branchIds));

          localStorage.setItem(
            'edu_crm_auth',
            JSON.stringify({
              email,
              tenantId,
              branchId,
              branchIds,
              roles: roles.length > 0 ? roles : storedRoles || [],
              permissions: permissions.length > 0 ? permissions : storedPermissions || [],
            })
          );

          set({
            isAuthenticated: true,
            userEmail: email,
            tenantId,
            branchId,
            branchIds,
            roles: roles.length > 0 ? roles : storedRoles || [],
            permissions: permissions.length > 0 ? permissions : storedPermissions || [],
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
        const profilePermissions = response.data.permissions ?? get().permissions;
        const newBranchIds = response.data.branchIds ?? get().branchIds;

        // Preserve user-selected branchId if it's still in the returned branchIds list.
        const currentBranchId = get().branchId;
        const resolvedBranchId = currentBranchId && newBranchIds.includes(currentBranchId)
          ? currentBranchId
          : (newBranchIds[0] ?? currentBranchId ?? null);

        set({
          user: response.data,
          userEmail: response.data.email,
          roles: response.data.roles,
          branchIds: newBranchIds,
          branchId: resolvedBranchId,
          permissions: profilePermissions,
        });
      }
    } catch {
      // Silently fail — user is still authenticated
    }
  },

  clearError: () => set({ error: null }),

  setBranchId: (branchId: string) => {
    // Validate that the branch is in the user's allowed branchIds.
    const currentBranchIds = get().branchIds;
    if (currentBranchIds.length > 0 && !currentBranchIds.includes(branchId)) {
      return; // branch not in user's scope
    }

    localStorage.setItem('branch_id', branchId);

    // Sync edu_crm_auth
    const authRaw = localStorage.getItem('edu_crm_auth');
    if (authRaw) {
      try {
        const parsed = JSON.parse(authRaw) as Record<string, unknown>;
        const existingBranchIds = Array.isArray(parsed.branchIds)
          ? parsed.branchIds.filter((item): item is string => typeof item === 'string' && item.trim())
          : [];
        const nextBranchIds = existingBranchIds.includes(branchId)
          ? existingBranchIds
          : [branchId, ...existingBranchIds];
        localStorage.setItem('edu_crm_auth', JSON.stringify({
          ...parsed,
          branchId,
          branchIds: nextBranchIds,
        }));
        localStorage.setItem('branch_ids', JSON.stringify(nextBranchIds));
      } catch {
        // Ignore parse errors
      }
    }

    set({ branchId });
  },
}));
