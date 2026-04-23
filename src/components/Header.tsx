'use client';

import { Bell, Building2, Check, ChevronDown, Menu, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ANALYTICS_REPORTS } from '@/constants/analytics';
import { SYSTEM_PAGES_BY_SLUG } from '@/constants/system-pages';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { settingsService, type BranchDto } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-message';
import { pushToast } from '@/lib/toast';
import { useApi, useMutation } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';

type SearchItem = {
  label: string;
  href: string;
  keywords: string[];
  description?: string;
};

function toLowerSafe(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.toLowerCase();
}

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
  '/inventory': 'Инвентаризация',
  '/warehouse': 'Склад',
  '/integrations/kpay': 'KPAY инвойсы',
  '/integrations/apipay': 'ApiPay инвойсы',
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

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  { label: 'Главная', href: '/', keywords: ['dashboard', 'главная', 'home'] },
  { label: 'Канбан', href: '/kanban', keywords: ['канбан', 'лиды', 'sales'] },
  { label: 'Расписание', href: '/schedule', keywords: ['расписание', 'schedule'] },
  { label: 'Посещения', href: '/attendance', keywords: ['посещения', 'attendance'] },
  { label: 'Сотрудники', href: '/staff', keywords: ['сотрудники', 'staff', 'employees'] },
  { label: 'Ученики', href: '/students', keywords: ['ученики', 'students'] },
  { label: 'Занятия', href: '/classes', keywords: ['занятия', 'classes'] },
  { label: 'Финансы', href: '/finance', keywords: ['финансы', 'finance'] },
  { label: 'Платежи студентов', href: '/finance/student-payments', keywords: ['платежи', 'students payments'] },
  { label: 'Зарплаты', href: '/finance/salary', keywords: ['зарплаты', 'salary'] },
  { label: 'Инвентаризация', href: '/inventory', keywords: ['инвентаризация', 'inventory', 'пересчет', 'остатки'] },
  { label: 'Склад', href: '/warehouse', keywords: ['склад', 'warehouse', 'товары', 'остатки'] },
  { label: 'KPAY инвойсы', href: '/integrations/kpay', keywords: ['kpay', 'инвойсы', 'счета', 'оплата'] },
  { label: 'ApiPay инвойсы', href: '/integrations/apipay', keywords: ['apipay', 'инвойсы', 'счета', 'оплата'] },
  { label: 'Аналитика', href: '/analytics', keywords: ['аналитика', 'reports'] },
  { label: 'Уведомления', href: '/notifications', keywords: ['уведомления', 'notifications', 'bell'] },
  { label: 'Logs', href: '/logs', keywords: ['логи', 'logs'] },
  { label: 'Настройки', href: '/settings', keywords: ['настройки', 'settings'] },
  { label: 'Системные страницы', href: '/system', keywords: ['system', 'ошибки', 'status'] },
];

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = toLowerSafe(target.tagName);
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

export default function Header({
  onOpenMobileSidebar,
}: {
  onOpenMobileSidebar?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [searchHotkeyLabel, setSearchHotkeyLabel] = useState('Ctrl+K');
  const [notificationHotkeyLabel, setNotificationHotkeyLabel] = useState('Ctrl+Shift+N');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

  // Sync with zustand auth store branchId
  const storeBranchId = useAuthStore((s) => s.branchId);
  useEffect(() => {
    if (storeBranchId && storeBranchId !== selectedBranchId) {
      setSelectedBranchId(storeBranchId);
    }
  }, [storeBranchId]);
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    active: true,
    isDefault: false,
  });
  const [branchFormError, setBranchFormError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  let title = pageTitles[pathname] ?? '1edu crm';

  const { data: branchesData, loading: branchesLoading, refetch: refetchBranches } = useApi<BranchDto[]>(
    () => settingsService.getBranches(),
    []
  );
  const createBranchMutation = useMutation((payload: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    active?: boolean;
    isDefault?: boolean;
  }) => settingsService.createBranch(payload));

  const branches = useMemo(() => {
    return (branchesData || []).filter((branch): branch is BranchDto =>
      Boolean(branch?.id && branch?.name)
    );
  }, [branchesData]);

  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) {
      return branches[0] || null;
    }

    return branches.find((branch) => branch.id === selectedBranchId) || branches[0] || null;
  }, [branches, selectedBranchId]);

  const searchableItems = useMemo<SearchItem[]>(() => {
    const analyticsItems: SearchItem[] = ANALYTICS_REPORTS.map((report) => ({
      label: `Аналитика: ${report.label}`,
      href: `/analytics/${report.slug}`,
      description: report.description,
      keywords: ['аналитика', 'analytics', report.slug, toLowerSafe(report.label)],
    }));

    const systemItems: SearchItem[] = Object.values(SYSTEM_PAGES_BY_SLUG).map((page) => ({
      label: page.title,
      href: `/system/${page.slug}`,
      description: page.badge,
      keywords: ['система', 'ошибка', 'system', page.slug, toLowerSafe(page.title), toLowerSafe(page.badge)],
    }));

    return [...STATIC_SEARCH_ITEMS, ...analyticsItems, ...systemItems];
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return searchableItems.slice(0, 8);
    }

    const startsWithMatches = searchableItems.filter((item) => toLowerSafe(item.label).startsWith(normalizedQuery));
    const containsMatches = searchableItems.filter((item) => {
      const label = toLowerSafe(item.label);

      if (label.includes(normalizedQuery)) {
        return !label.startsWith(normalizedQuery);
      }

      return item.keywords.some((keyword) => keyword.includes(normalizedQuery));
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 10);
  }, [query, searchableItems]);

  const isNotificationsPage = pathname === '/notifications' || pathname.startsWith('/notifications/');

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

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    const isMacPlatform = /mac|iphone|ipad|ipod/i.test(navigator.platform);
    setSearchHotkeyLabel(isMacPlatform ? '⌘K' : 'Ctrl+K');
    setNotificationHotkeyLabel(isMacPlatform ? '⌘⇧N' : 'Ctrl+Shift+N');
  }, []);

  useEffect(() => {
    setActiveResultIndex(0);
  }, [query, isSearchOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const key = toLowerSafe(event.key);
      const hasCommandModifier = event.metaKey || event.ctrlKey;

      if (hasCommandModifier && key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (hasCommandModifier && event.shiftKey && key === 'n') {
        event.preventDefault();
        router.push('/notifications');
        return;
      }

      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !isEditableElement(event.target)
      ) {
        event.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [router]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }

      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
        setIsBranchMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedBranchId = localStorage.getItem('branch_id') || '';
    if (storedBranchId) {
      setSelectedBranchId(storedBranchId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || branches.length === 0) {
      return;
    }

    const hasSelected = selectedBranchId && branches.some((branch) => branch.id === selectedBranchId);
    if (hasSelected) {
      return;
    }

    const storedBranchId = localStorage.getItem('branch_id');
    const nextBranchId = storedBranchId && branches.some((branch) => branch.id === storedBranchId)
      ? storedBranchId
      : branches[0]?.id;

    if (!nextBranchId) {
      return;
    }

    setSelectedBranchId(nextBranchId);
    localStorage.setItem('branch_id', nextBranchId);
  }, [branches, selectedBranchId]);

  const persistBranchSelection = (branchId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem('branch_id', branchId);

    const authRaw = localStorage.getItem('edu_crm_auth');
    if (!authRaw) {
      return;
    }

    try {
      const parsed = JSON.parse(authRaw) as Record<string, unknown>;
      const currentBranchIds = Array.isArray(parsed.branchIds)
        ? parsed.branchIds.filter((item): item is string => typeof item === 'string' && item.trim())
        : [];

      const nextBranchIds = currentBranchIds.includes(branchId)
        ? currentBranchIds
        : [branchId, ...currentBranchIds];

      localStorage.setItem('edu_crm_auth', JSON.stringify({
        ...parsed,
        branchId,
        branchIds: nextBranchIds,
      }));
      localStorage.setItem('branch_ids', JSON.stringify(nextBranchIds));
    } catch {
      // Ignore local storage parsing errors.
    }
  };

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranchId(branchId);
    setIsBranchMenuOpen(false);
    persistBranchSelection(branchId);
    useAuthStore.getState().setBranchId(branchId);
    pushToast({ message: 'Филиал переключен.', tone: 'success' });
  };

  const handleOpenCreateBranch = () => {
    setBranchForm({ name: '', code: '', address: '', phone: '', active: true, isDefault: false });
    setBranchFormError(null);
    setIsBranchMenuOpen(false);
    setIsCreateBranchModalOpen(true);
  };

  const handleCreateBranch = async () => {
    setBranchFormError(null);

    if (!branchForm.name.trim()) {
      setBranchFormError('Название филиала обязательно.');
      return;
    }

    try {
      const created = await createBranchMutation.mutate({
        name: branchForm.name.trim(),
        code: branchForm.code.trim() || undefined,
        address: branchForm.address.trim() || undefined,
        phone: branchForm.phone.trim() || undefined,
        active: branchForm.active,
        isDefault: branchForm.isDefault,
      });

      await refetchBranches();
      setIsCreateBranchModalOpen(false);
      pushToast({ message: 'Филиал успешно добавлен.', tone: 'success' });

      if (created?.id) {
        setSelectedBranchId(created.id);
        persistBranchSelection(created.id);
        useAuthStore.getState().setBranchId(created.id);
      }
    } catch (error) {
      setBranchFormError(getErrorMessage(error, 'Не удалось создать филиал.'));
    }
  };

  const handleOpenResult = (item: SearchItem) => {
    setIsSearchOpen(false);
    setQuery('');
    router.push(item.href);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((prev) => Math.min(prev + 1, Math.max(filteredItems.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (filteredItems.length === 0) {
        return;
      }

      event.preventDefault();
      handleOpenResult(filteredItems[activeResultIndex] ?? filteredItems[0]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <>
    <header className="border-b border-[#e8eaee] bg-[#fbfcfd]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e0e3e8] bg-white text-[#4b5565] transition-colors hover:bg-[#f4f6f8] md:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 shrink-0 truncate text-xl font-bold tracking-tight text-[#1a1d22] lg:min-w-36 lg:text-[28px]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 lg:flex-1">
          <div ref={searchContainerRef} className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f96a3]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск по разделам..."
              value={query}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="h-10 w-full rounded-xl border border-[#e0e3e8] bg-[#f6f7f8] pl-11 pr-24 text-sm text-[#2e3440] placeholder:text-[#9aa2ad] focus:border-[#35cfc4] focus:bg-white focus:outline-none"
            />

            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#d4d8de] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6b7482]">
              {searchHotkeyLabel}
            </div>

            {isSearchOpen && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[#dfe5ec] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#ebeff4] px-3 py-2 text-[11px] text-[#6f7a88]">
                  <span className="font-semibold">Горячие клавиши:</span>
                  <span className="rounded bg-[#f2f5f8] px-1.5 py-0.5">{searchHotkeyLabel}</span>
                  <span>поиск</span>
                  <span className="rounded bg-[#f2f5f8] px-1.5 py-0.5">↑ ↓</span>
                  <span>навигация</span>
                  <span className="rounded bg-[#f2f5f8] px-1.5 py-0.5">Enter</span>
                  <span>открыть</span>
                  <span className="rounded bg-[#f2f5f8] px-1.5 py-0.5">Esc</span>
                  <span>закрыть</span>
                </div>

                <div className="max-h-80 overflow-y-auto p-1.5">
                  {filteredItems.length === 0 ? (
                    <div className="rounded-lg px-3 py-3 text-sm text-[#6f7a88]">
                      Ничего не найдено. Попробуйте другое название раздела.
                    </div>
                  ) : (
                    filteredItems.map((item, index) => {
                      const isActive = index === activeResultIndex;

                      return (
                        <button
                          key={`${item.href}-${index}`}
                          type="button"
                          onMouseEnter={() => setActiveResultIndex(index)}
                          onClick={() => handleOpenResult(item)}
                          className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'bg-[#ecf6ff] text-[#1d4ed8]'
                              : 'text-[#2d3645] hover:bg-[#f4f7fa]'
                          }`}
                        >
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-[#7d8795]">{item.description || item.href}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push('/notifications')}
            title={`Уведомления (${notificationHotkeyLabel})`}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              isNotificationsPage
                ? 'border-[#9bc7ff] bg-[#ecf6ff] text-[#1d4ed8]'
                : 'border-[#e0e3e8] bg-white text-[#5e6673] hover:bg-[#f4f6f8]'
            }`}
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
            {!isNotificationsPage ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef4444]" />
            ) : null}
          </button>

          <div ref={branchMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsBranchMenuOpen((prev) => !prev)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e0e3e8] bg-white px-3 text-sm font-medium text-[#4b5565] transition-colors hover:bg-[#f4f6f8]"
              aria-label="Выбор филиала"
            >
              <Building2 className="h-4 w-4 text-[#6f7a88]" />
              <span className="max-w-44 truncate">{selectedBranch?.name || 'Филиал'}</span>
              <ChevronDown className={`h-4 w-4 text-[#6f7a88] transition-transform ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBranchMenuOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-[#dfe5ec] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]">
                <div className="border-b border-[#ebeff4] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#6f7a88]">
                  Филиалы
                </div>

                <div className="max-h-72 overflow-y-auto p-1.5">
                  {branchesLoading ? (
                    <div className="rounded-lg px-3 py-3 text-sm text-[#6f7a88]">Загружаем филиалы...</div>
                  ) : branches.length === 0 ? (
                    <div className="rounded-lg px-3 py-3 text-sm text-[#6f7a88]">Пока нет филиалов</div>
                  ) : (
                    branches.map((branch) => {
                      const isActive = branch.id === (selectedBranch?.id || selectedBranchId);

                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => handleBranchSelect(branch.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                            isActive ? 'bg-[#ecf6ff] text-[#1d4ed8]' : 'text-[#2d3645] hover:bg-[#f4f7fa]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{branch.name}</p>
                            <p className="truncate text-xs text-[#7d8795]">{branch.address || branch.code || 'Адрес не указан'}</p>
                          </div>
                          {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[#ebeff4] p-1.5">
                  <button
                    type="button"
                    onClick={handleOpenCreateBranch}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#2563eb] transition-colors hover:bg-[#eff6ff]"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить филиал
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>

    <Modal
      isOpen={isCreateBranchModalOpen}
      onClose={() => setIsCreateBranchModalOpen(false)}
      title="Добавить филиал"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => setIsCreateBranchModalOpen(false)}
            disabled={createBranchMutation.loading}
          >
            Отмена
          </Button>
          <Button onClick={() => void handleCreateBranch()} disabled={createBranchMutation.loading}>
            {createBranchMutation.loading ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {branchFormError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{branchFormError}</div>
        ) : null}

        <Input
          label="Название филиала"
          value={branchForm.name}
          onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Например: Филиал на Абая"
        />
        <Input
          label="Код филиала"
          value={branchForm.code}
          onChange={(event) => setBranchForm((prev) => ({ ...prev, code: event.target.value }))}
          placeholder="MAIN / CHIL-01"
        />
        <Input
          label="Адрес"
          value={branchForm.address}
          onChange={(event) => setBranchForm((prev) => ({ ...prev, address: event.target.value }))}
          placeholder="ул. Абая, 25"
        />
        <Input
          label="Телефон"
          value={branchForm.phone}
          onChange={(event) => setBranchForm((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="+7 777 000 00 00"
        />
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={branchForm.active}
            onChange={(event) => setBranchForm((prev) => ({ ...prev, active: event.target.checked }))}
            className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
          />
          <span className="text-sm font-medium text-[#4b5565]">Филиал активен</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={branchForm.isDefault}
            onChange={(event) => setBranchForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
          />
          <span className="text-sm font-medium text-[#4b5565]">Сделать филиал по умолчанию</span>
        </label>
      </div>
    </Modal>
    </>
  );
}
