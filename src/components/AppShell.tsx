'use client';

import { useAuthStore } from '@/store/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/Toaster';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    hydrate();

    const frameId = window.requestAnimationFrame(() => {
      setHydrated(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hydrate]);

  // Don't render anything until auth state is hydrated (prevents flash)
  if (!hydrated) {
    return null;
  }

  // If on login page, just render children (no sidebar/header)
  if (isLoginPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  // If not authenticated and not on login page, redirect
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // Authenticated — render full app shell
  return (
    <div className="min-h-screen bg-[#f3f5f7] md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
