'use client';

import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ANALYTICS_REPORTS } from '@/constants/analytics';
import { SYSTEM_PAGES_BY_SLUG } from '@/constants/system-pages';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/kanban': 'Канбан',
  '/schedule': 'Расписание',
  '/attendance': 'Посещения',
  '/enrollments': 'Записи',
  '/staff': 'Сотрудники',
  '/tasks': 'Задачи',
  '/students': 'Ученики',
  '/classes': 'Занятия',
  '/finance': 'Финансы',
  '/finance/student-payments': 'Платежи студентов',
  '/finance/salary': 'Зарплаты',
  '/analytics': 'Аналитика',
  '/notifications': 'Уведомления',
  '/logs': 'Logs',
  '/settings': 'Настройки',
  '/system': 'Системные страницы',
  '/errors': 'Системные страницы',
  '/under-development': 'Страница в разработке',
  '/high-load': 'Высокая нагрузка',
  '/maintenance': 'Техобслуживание',
  '/service-unavailable': 'Сервис недоступен',
};

export default function Header() {
  const pathname = usePathname();
  let title = pageTitles[pathname] ?? 'EduCRM';

  if (pathname.startsWith('/attendance/')) {
    title = 'Посещение занятия';
  } else if (pathname.startsWith('/classes/')) {
    title = 'Настройка курса';
  } else if (pathname.startsWith('/system/')) {
    const systemSlug = pathname.replace('/system/', '');
    const systemPageTitle = SYSTEM_PAGES_BY_SLUG[systemSlug]?.title;
    title = systemPageTitle ?? 'Системные страницы';
  } else if (pathname.startsWith('/analytics/')) {
    const reportTitle = ANALYTICS_REPORTS.find((report) => pathname === `/analytics/${report.slug}`)?.label;
    title = reportTitle ? `Аналитика: ${reportTitle}` : 'Аналитика';
  }

  return (
    <header className="border-b border-[#e8eaee] bg-[#fbfcfd]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4">
        <h1 className="shrink-0 text-xl font-bold tracking-tight text-[#1a1d22] lg:min-w-36 lg:text-[28px]">
          {title}
        </h1>

        <div className="flex items-center gap-3 lg:flex-1">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f96a3]" />
            <input
              type="text"
              placeholder="Search anything here..."
              className="h-10 w-full rounded-xl border border-[#e0e3e8] bg-[#f6f7f8] pl-11 pr-4 text-sm text-[#2e3440] placeholder:text-[#9aa2ad] focus:border-[#35cfc4] focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e0e3e8] bg-white text-[#5e6673] transition-colors hover:bg-[#f4f6f8]"
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
