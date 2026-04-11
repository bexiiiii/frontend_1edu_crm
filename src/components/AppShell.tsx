'use client';

import { useAuthStore } from '@/store/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/Toaster';
import TrialExpiredBlockingModal from '@/components/TrialExpiredBlockingModal';
import { tenantsService, type TenantDto } from '@/lib/api';
import { canAccessPath } from '@/lib/rbac';

function isSubscriptionExpired(tenant: TenantDto | null): boolean {
  if (!tenant?.status) {
    return false;
  }

  const tenantStatus = tenant.status.toUpperCase();
  return tenantStatus === 'INACTIVE' || tenantStatus === 'SUSPENDED';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate, tenantId, roles, permissions } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [tenantData, setTenantData] = useState<TenantDto | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/login';
  const hasRouteAccess = canAccessPath(pathname, roles, permissions);
  const subscriptionExpired = isSubscriptionExpired(tenantData);
  const shouldShowBlockingModal = subscriptionExpired;

  useEffect(() => {
    hydrate();

    const frameId = window.requestAnimationFrame(() => {
      setHydrated(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || isLoginPage || !isAuthenticated) {
      return;
    }

    if (!hasRouteAccess) {
      router.replace('/system/403');
    }
  }, [hasRouteAccess, hydrated, isAuthenticated, isLoginPage, router]);

  useEffect(() => {
    if (!isAuthenticated || !tenantId || isLoginPage) {
      setTenantData(null);
      return;
    }

    let canceled = false;

    const loadTenant = async () => {
      try {
        const response = await tenantsService.getById(tenantId);
        if (!canceled) {
          setTenantData(response.data);
        }
      } catch {
        if (!canceled) {
          setTenantData(null);
        }
      }
    };

    void loadTenant();

    return () => {
      canceled = true;
    };
  }, [isAuthenticated, tenantId, isLoginPage]);

  useEffect(() => {
    if (!shouldShowBlockingModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldShowBlockingModal]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const openSupportWhatsapp = (message: string) => {
    const phone = '77064267143';
    const text = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleChooseTariff = () => {
    openSupportWhatsapp('Здравствуйте! Хочу выбрать и подключить тариф для 1edu crm.');
  };

  const handleContactSupport = () => {
    openSupportWhatsapp('Здравствуйте! Нужна помощь техподдержки: подписка истекла и доступ ограничен.');
  };

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

  if (!hasRouteAccess && pathname !== '/system/403') {
    return null;
  }

  // Authenticated — render full app shell
  return (
    <div className="min-h-screen bg-[#f3f5f7] md:flex">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:p-4 md:p-6">{children}</main>
      </div>
      <TrialExpiredBlockingModal
        isOpen={shouldShowBlockingModal}
        trialEndsAt={tenantData?.trialEndsAt ?? null}
        onChooseTariff={handleChooseTariff}
        onContactSupport={handleContactSupport}
      />
      <Toaster />
    </div>
  );
}
