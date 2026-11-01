'use client';

import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDefaultAuthenticatedPath } from '@/lib/rbac';

export default function LoginPage() {
  const { isAuthenticated, loading, error, login, register, hydrate, clearError, roles } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getDefaultAuthenticatedPath(roles));
    }
  }, [isAuthenticated, roles, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <FullScreenSignup
      loading={loading}
      serverError={error}
      onLogin={async ({ username, password }) => {
        clearError();
        try {
          await login(username, password);
          router.replace(getDefaultAuthenticatedPath(useAuthStore.getState().roles));
        } catch {
          // Error is stored in the auth store
        }
      }}
      onRegister={async ({ firstName, lastName, centerName, subdomain, email, phone, password, confirmPassword }) => {
        clearError();
        try {
          await register({
            firstName,
            lastName,
            centerName,
            subdomain,
            email,
            phone,
            password,
            confirmPassword,
          });
          router.replace(getDefaultAuthenticatedPath(useAuthStore.getState().roles));
        } catch {
          // Error is stored in the auth store
        }
      }}
    />
  );
}
