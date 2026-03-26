'use client';

import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated, loading, error, login, register, hydrate, clearError } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

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
          router.replace('/');
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
          router.replace('/');
        } catch {
          // Error is stored in the auth store
        }
      }}
    />
  );
}
