'use client';

import clsx from 'clsx';
import {
  LayoutDashboard,
  KanbanSquare,
  CalendarDays,
  UserCheck,
  ClipboardList,
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
  ChevronsUpDown,
  LogOut,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ANALYTICS_SUBMENU_ITEMS } from '@/constants/analytics';
import { useAuthStore } from '@/store/authStore';

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

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Главная', href: '/' },
  { icon: KanbanSquare, label: 'Канбан', href: '/kanban' },
  { icon: CalendarDays, label: 'Расписание', href: '/schedule' },
  { icon: UserCheck, label: 'Посещения', href: '/attendance' },
  { icon: ClipboardList, label: 'Записи', href: '/enrollments' },
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
    submenu: ANALYTICS_SUBMENU_ITEMS,
  },
  { icon: Bell, label: 'Уведомления', href: '/notifications' },
  { icon: ScrollText, label: 'Logs', href: '/logs' },
  { icon: Settings2, label: 'Настройки', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, userEmail } = useAuthStore();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    return (
      navItems.find((item) => item.submenu?.some((subItem) => pathname === subItem.href))?.href ?? null
    );
  });

  return (
    <aside className="w-full border-b border-[#e8eaee] bg-[#fbfcfd] md:sticky md:top-0 md:h-screen md:w-[300px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e8eaee] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#36d9cd] to-[#1db8ad] shadow-[0_8px_20px_rgba(29,184,173,0.22)]">
              <div className="h-3 w-3 rotate-45 rounded-[4px] border-2 border-white" />
            </div>
            <span className="flex-1 text-2xl font-extrabold tracking-tight text-[#17181b]">
              EduCRM
            </span>
            <ChevronsUpDown className="h-4 w-4 text-[#9aa1ab]" />
          </div>
        </div>

        <div className="border-b border-[#e8eaee] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#c6efff] to-[#8cbce5]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-[#2a2e35] leading-none">
                {user?.firstName || userEmail?.split('@')[0] || 'Пользователь'}
              </p>
              <p className="truncate pt-1 text-xs text-[#8e97a5]">{userEmail || 'email@example.com'}</p>
            </div>
            <button
              type="button"
              className="text-[#ef6d67] transition-colors hover:text-[#dd4f48]"
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {navItems.map((item) => {
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
                        ? 'border-[#44cec3] bg-[#f5fffd] text-[#11a59a]'
                        : 'border-transparent text-[#8f97a4] hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-[#2f3640]',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
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
                                ? 'bg-[#effcf9] text-[#0f9d92]'
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
                    ? 'border-[#44cec3] bg-[#f5fffd] text-[#11a59a]'
                    : 'border-transparent text-[#8f97a4] hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-[#2f3640]',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e8eaee] pt-3">
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-[#8f97a4] transition-colors hover:border-[#e8eaee] hover:bg-[#f7f9fb] hover:text-red-500"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="text-sm font-semibold">Выйти</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
