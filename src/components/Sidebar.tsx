'use client';

import clsx from 'clsx';
import {
  LayoutDashboard,
  KanbanSquare,
  CalendarDays,
  UserCheck,
  Users,
  CheckSquare,
  GraduationCap,
  BookOpen,
  Wallet,
  BarChart2,
  Bell,
  ScrollText,
  Settings2,
  ChevronDown,
  ChevronUp,
  X,
  LogOut,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ANALYTICS_SUBMENU_ITEMS } from '@/constants/analytics';
import { useApi } from '@/hooks/useApi';
import { notificationsService } from '@/lib/api';
import { canAccessPath } from '@/lib/rbac';
import { useAuthStore } from '@/store/authStore';

const SEEN_NOTIFICATION_IDS_STORAGE_KEY = '1edu_crm_seen_notification_ids';

type NavSubItem = {
  label: string;
  href: string;
};

type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  submenu?: NavSubItem[];
};

const HIDDEN_ANALYTICS_SUBMENU_HREFS = new Set([
  '/analytics/sales-funnel',
  '/analytics/lead-conversions',
  '/analytics/managers',
  '/analytics/payment-reconciliation',
  '/analytics/ai-dialog-analysis',
]);

const VISIBLE_ANALYTICS_SUBMENU_ITEMS = ANALYTICS_SUBMENU_ITEMS.filter(
  (item) => !HIDDEN_ANALYTICS_SUBMENU_HREFS.has(item.href)
);

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Главная', href: '/' },
  { icon: KanbanSquare, label: 'Канбан', href: '/kanban' },
  { icon: CalendarDays, label: 'Расписание', href: '/schedule' },
  { icon: UserCheck, label: 'Посещения', href: '/attendance' },
  { icon: Users, label: 'Сотрудники', href: '/staff' },
  { icon: CheckSquare, label: 'Задачи', href: '/tasks' },
  { icon: GraduationCap, label: 'Ученики', href: '/students' },
  { icon: BookOpen, label: 'Занятия', href: '/classes' },
  {
    icon: Wallet,
    label: 'Финансы',
    href: '/finance',
    submenu: [
      { label: 'Доходы и расходы', href: '/finance' },
      { label: 'Платежи студентов', href: '/finance/student-payments' },
      { label: 'Зарплаты', href: '/finance/salary' },
    ],
  },
  {
    icon: BarChart2,
    label: 'Аналитика',
    href: '/analytics',
    submenu: VISIBLE_ANALYTICS_SUBMENU_ITEMS,
  },
  { icon: Bell, label: 'Уведомления', href: '/notifications' },
  { icon: ScrollText, label: 'Logs', href: '/logs' },
  { icon: Settings2, label: 'Настройки', href: '/settings' },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, userEmail, roles, permissions } = useAuthStore();
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());
  const isNotificationsPage = pathname === '/notifications' || pathname.startsWith('/notifications/');

  const { data: notificationsPageData, refetch: refetchNotifications } = useApi(
    () => notificationsService.getAll({ page: 0, size: 50 }),
    []
  );

  const latestNotifications = notificationsPageData?.content || [];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rawValue = window.localStorage.getItem(SEEN_NOTIFICATION_IDS_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        setSeenNotificationIds(new Set(parsed.filter((item): item is string => typeof item === 'string')));
      }
    } catch {
      setSeenNotificationIds(new Set());
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refetchNotifications();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refetchNotifications]);

  useEffect(() => {
    if (!isNotificationsPage || latestNotifications.length === 0 || typeof window === 'undefined') {
      return;
    }

    setSeenNotificationIds((prev) => {
      const next = new Set(prev);
      latestNotifications.forEach((notification) => {
        next.add(notification.id);
      });

      window.localStorage.setItem(SEEN_NOTIFICATION_IDS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [isNotificationsPage, latestNotifications]);

  const unreadNotificationsCount = useMemo(() => {
    if (latestNotifications.length === 0) {
      return 0;
    }

    return latestNotifications.reduce((count, notification) => {
      if (!seenNotificationIds.has(notification.id)) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [latestNotifications, seenNotificationIds]);

  const hasUnreadNotifications = unreadNotificationsCount > 0;

  const visibleNavItems = useMemo(() => {
    return navItems
      .map((item) => {
        const canOpenItem = canAccessPath(item.href, roles, permissions);

        if (!item.submenu) {
          return canOpenItem ? item : null;
        }

        const visibleSubmenu = item.submenu.filter((subItem) => canAccessPath(subItem.href, roles, permissions));

        if (!canOpenItem && visibleSubmenu.length === 0) {
          return null;
        }

        return {
          ...item,
          submenu: visibleSubmenu,
        };
      })
      .filter((item): item is NavItem => item !== null);
  }, [permissions, roles]);

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    return (
      navItems.find((item) => item.submenu?.some((subItem) => pathname === subItem.href))?.href ?? null
    );
  });

  const handleOpenProfile = () => {
    router.push('/settings');
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <>
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="Закрыть меню"
        className={clsx(
          'fixed inset-0 z-40 bg-[#0f172a]/35 transition-opacity md:hidden',
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 h-screen w-[86vw] max-w-80 border-r border-[#e8eaee] bg-[#fbfcfd] transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-75 md:shrink-0 md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e8eaee] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative h-11 w-full max-w-44 overflow-hidden">
              <Image
                src="/logo/1edu-logo-final-cropped.png"
                alt="1edu crm"
                fill
                sizes="320px"
                className="object-contain object-left"
                priority
              />
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dbe2e8] bg-white text-[#5f6b7b] transition-colors hover:bg-[#f4f7f9] md:hidden"
              aria-label="Закрыть меню"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#e8eaee] px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              title="Открыть профиль"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-[#c6efff] to-[#8cbce5]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#2a2e35] leading-none">
                  {user?.firstName || userEmail?.split('@')[0] || 'Пользователь'}
                </p>
                <p className="truncate pt-1 text-xs text-[#8e97a5]">{userEmail || 'email@example.com'}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[#ef6d67] transition-colors hover:text-[#dd4f48]"
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const itemPathMatch =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isSubmenuActive =
              item.submenu?.some((subItem) => pathname === subItem.href) ?? false;
            const isActive = itemPathMatch || isSubmenuActive;

            if (item.submenu) {
              const isOpen = openSubmenu === item.href;

              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => setOpenSubmenu(isOpen ? null : item.href)}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'border-[#9bc7ff] bg-[#edf3ff] text-[#315fd0]'
                        : 'border-transparent text-[#8f97a4] hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-[#2f3640]',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="flex-1 text-sm font-semibold">{item.label}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 opacity-80" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isCurrentSubItem = pathname === subItem.href;

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={clsx(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                              isCurrentSubItem
                                ? 'bg-[#edf3ff] text-[#315fd0]'
                                : 'text-[#9aa2ae] hover:bg-[#f5f7f9] hover:text-[#2f3640]',
                            )}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                  isActive
                    ? 'border-[#9bc7ff] bg-[#edf3ff] text-[#315fd0]'
                    : 'border-transparent text-[#8f97a4] hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-[#2f3640]',
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex flex-1 items-center gap-2 text-sm font-semibold">
                  {item.label}
                  {item.href === '/notifications' && hasUnreadNotifications ? (
                    <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#ef4444]" aria-hidden="true" />
                  ) : null}
                </span>
                {item.href === '/notifications' && hasUnreadNotifications ? (
                  <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e8eaee] pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-[#8f97a4] transition-colors hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-red-500"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span className="text-sm font-semibold">Выйти</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
