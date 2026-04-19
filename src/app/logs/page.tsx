'use client';

import { Eye, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/vercel-tabs';
import { auditService, type SystemAuditLog, type TenantAuditLog } from '@/lib/api';
import { usePaginatedApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';

const TABLE_PAGE_SIZE = 20;

type LogSource = 'tenant' | 'system';
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type AuditLogRow = TenantAuditLog | SystemAuditLog;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayDateInputValue(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function categoryToLevel(category: string, action: string): LogLevel {
  const source = `${category} ${action}`.toUpperCase();
  if (source.includes('ERROR') || source.includes('FAIL')) return 'ERROR';
  if (source.includes('WARN') || source.includes('SECURITY')) return 'WARN';
  if (source.includes('DEBUG') || source.includes('SYSTEM')) return 'DEBUG';
  return 'INFO';
}

function getLevelClass(level: LogLevel): string {
  return {
    INFO: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    WARN: 'border-amber-200 bg-amber-100 text-amber-700',
    ERROR: 'border-rose-200 bg-rose-100 text-rose-700',
    DEBUG: 'border-slate-200 bg-slate-100 text-slate-700',
  }[level];
}

function isTenantLog(log: AuditLogRow): log is TenantAuditLog {
  return 'tenantId' in log;
}

function stringifyDetails(details: Record<string, unknown>): string {
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return 'Не удалось сериализовать details';
  }
}

const UUID_LIKE_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatAuditIdentifier(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const normalized = value.trim();

  if (!normalized) {
    return '—';
  }

  if (UUID_LIKE_REGEXP.test(normalized)) {
    return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
  }

  if (normalized.length > 24) {
    return `${normalized.slice(0, 14)}...${normalized.slice(-6)}`;
  }

  return normalized;
}

export default function LogsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const [activeSource, setActiveSource] = useState<LogSource>('tenant');
  const [filters, setFilters] = useState(() => {
    const today = getTodayDateInputValue();

    return {
      search: '',
      category: '',
      action: '',
      actorId: '',
      targetId: '',
      from: today,
      to: today,
    };
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const {
    data: logs,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    setPage,
  } = usePaginatedApi(
    (pageNum, size) => {
      const commonParams = {
        page: pageNum,
        size,
        action: filters.action.trim() || undefined,
        actorId: filters.actorId.trim() || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
      };

      if (activeSource === 'system' && isSuperAdmin) {
        return auditService.getSystemLog({
          ...commonParams,
          targetId: filters.targetId.trim() || undefined,
        });
      }

      return auditService.getTenantLog({
        ...commonParams,
        category: filters.category.trim() || undefined,
      });
    },
    0,
    TABLE_PAGE_SIZE,
    [activeSource, filters.category, filters.action, filters.actorId, filters.targetId, filters.from, filters.to, isSuperAdmin]
  );

  const filteredLogs = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return logs.filter((log) => {
      if (!query) {
        return true;
      }

      const category = 'category' in log ? log.category : '';
      const actorName = 'actorName' in log ? log.actorName || '' : '';
      const targetType = 'targetType' in log ? log.targetType : '';
      const targetName = 'targetName' in log ? log.targetName || '' : '';

      return [
        category,
        log.action,
        log.actorId,
        actorName,
        targetType,
        log.targetId,
        targetName,
        stringifyDetails(log.details),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filters.search, logs]);

  const summary = useMemo(
    () => ({
      total: totalElements,
      errors: filteredLogs.filter((log) => categoryToLevel(('category' in log ? log.category : log.targetType), log.action) === 'ERROR').length,
      warnings: filteredLogs.filter((log) => categoryToLevel(('category' in log ? log.category : log.targetType), log.action) === 'WARN').length,
    }),
    [filteredLogs, totalElements]
  );

  const rangeStart = totalElements === 0 ? 0 : page * TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * TABLE_PAGE_SIZE, totalElements);

  return (
    <div className="space-y-6">
      <div className="crm-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202938]">Audit Logs</h2>
          </div>
          {isSuperAdmin ? (
            <Tabs
              tabs={[
                { id: 'tenant', label: 'Tenant Log' },
                { id: 'system', label: 'System Log' },
              ]}
              activeTab={activeSource}
              onTabChange={(tabId) => {
                setActiveSource(tabId as LogSource);
                setPage(0);
              }}
              className="w-fit"
              aria-label="Источники audit log"
            />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[#f4f8fb] p-4">
            <p className="text-sm text-[#7f8794]">Всего записей</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">{summary.total}</p>
          </div>
          <div className="rounded-xl bg-[#fff1f1] p-4">
            <p className="text-sm text-[#7f8794]">Ошибки на странице</p>
            <p className="mt-1 text-2xl font-bold text-[#c34c4c]">{summary.errors}</p>
          </div>
          <div className="rounded-xl bg-[#fff7e9] p-4">
            <p className="text-sm text-[#7f8794]">Предупреждения на странице</p>
            <p className="mt-1 text-2xl font-bold text-[#b17b2f]">{summary.warnings}</p>
          </div>
        </div>
      </div>

      <div className="crm-surface p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Быстрый поиск по строкам"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <input
            type="text"
            placeholder="Фильтр по action"
            value={filters.action}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, action: event.target.value }));
              setPage(0);
            }}
            className="crm-input"
          />

          <input
            type="text"
            placeholder="Фильтр по actorId"
            value={filters.actorId}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, actorId: event.target.value }));
              setPage(0);
            }}
            className="crm-input"
          />

          <input
            type="date"
            value={filters.from}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, from: event.target.value }));
              setPage(0);
            }}
            className="crm-select"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, to: event.target.value }));
              setPage(0);
            }}
            className="crm-select"
          />

          {activeSource === 'tenant' ? (
            <input
              type="text"
              placeholder="Фильтр по category"
              value={filters.category}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, category: event.target.value }));
                setPage(0);
              }}
              className="crm-input"
            />
          ) : null}

          {activeSource === 'system' && isSuperAdmin ? (
            <input
              type="text"
              placeholder="Фильтр по targetId"
              value={filters.targetId}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, targetId: event.target.value }));
                setPage(0);
              }}
              className="crm-input"
            />
          ) : null}
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-gray-700">
            Показано: <span className="font-semibold text-gray-900">{rangeStart}-{rangeEnd}</span> из{' '}
            <span className="font-semibold text-gray-900">{totalElements}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Страница: <span className="font-semibold text-gray-900">{page + 1}</span> /{' '}
            <span className="font-semibold text-gray-900">{Math.max(totalPages, 1)}</span>
          </p>
        </div>

        {error ? (
          <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-300 w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th px-4 py-2.5">#</th>
                  <th className="crm-table-th px-4 py-2.5">Время</th>
                  <th className="crm-table-th px-4 py-2.5">Уровень</th>
                  <th className="crm-table-th px-4 py-2.5">Category</th>
                  <th className="crm-table-th px-4 py-2.5">Action</th>
                  <th className="crm-table-th px-4 py-2.5">Actor</th>
                  <th className="crm-table-th px-4 py-2.5">Actor ID</th>
                  <th className="crm-table-th px-4 py-2.5">Target Type</th>
                  <th className="crm-table-th px-4 py-2.5">Target ID</th>
                  <th className="crm-table-th px-4 py-2.5">Details</th>
                  <th className="crm-table-th px-4 py-2.5">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => {
                    const category = 'category' in log ? log.category : log.targetType;
                    const actorName = 'actorName' in log ? log.actorName : null;
                    const targetName = 'targetName' in log ? log.targetName : null;
                    const targetType = 'targetType' in log ? log.targetType : '—';
                    const level = categoryToLevel(category, log.action);
                    const detailsPreview = stringifyDetails(log.details);
                    const actorLabel = actorName?.trim() || (log.actorId ? 'Система' : '—');
                    const targetLabel = targetName?.trim() || formatAuditIdentifier(log.targetId);
                    const targetLabelTitle = targetName?.trim() ? `${targetName} (${log.targetId || '—'})` : (log.targetId || '—');

                    return (
                      <tr key={log.id} className="crm-table-row">
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{page * TABLE_PAGE_SIZE + index + 1}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{formatDateTime(log.timestamp)}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${getLevelClass(level)}`}>
                            {level}
                          </span>
                        </td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{category || '—'}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{log.action}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{actorLabel}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">
                          <span className="inline-block max-w-32 truncate align-middle" title={log.actorId || '—'}>
                            {formatAuditIdentifier(log.actorId)}
                          </span>
                        </td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">{targetType || '—'}</td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">
                          <span className="inline-block max-w-40 truncate align-middle" title={targetLabelTitle}>
                            {targetLabel}
                          </span>
                        </td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">
                          <div className="max-w-56 truncate text-xs text-[#556070]">{detailsPreview}</div>
                        </td>
                        <td className="crm-table-cell px-4 py-2.5 leading-snug">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="rounded-lg p-1.5 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                            title="Открыть запись"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={11} className="crm-table-cell px-4 py-8 text-center text-xs text-[#8a93a3]">
                      Логи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6ebf0] px-6 py-4">
          <Button variant="outline" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
            Назад
          </Button>
          <span className="text-sm text-[#6f7786]">
            Страница {page + 1} из {Math.max(totalPages, 1)}
          </span>
          <Button variant="outline" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page + 1 >= totalPages}>
            Вперёд
          </Button>
        </div>
      </div>

      <Modal isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Детали audit log">
        {!selectedLog ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Время</label>
                <p className="text-base text-gray-900">{formatDateTime(selectedLog.timestamp)}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Уровень</label>
                <div>
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${getLevelClass(categoryToLevel('category' in selectedLog ? selectedLog.category : selectedLog.targetType, selectedLog.action))}`}>
                    {categoryToLevel('category' in selectedLog ? selectedLog.category : selectedLog.targetType, selectedLog.action)}
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
                <p className="text-base text-gray-900">{'category' in selectedLog ? selectedLog.category : selectedLog.targetType}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
                <p className="text-base text-gray-900">{selectedLog.action}</p>
              </div>
              {'targetType' in selectedLog ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Target Type</label>
                  <p className="text-base text-gray-900">{selectedLog.targetType}</p>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Actor ID</label>
                <p className="break-all text-base text-gray-900">{selectedLog.actorId || '—'}</p>
              </div>
              {'actorName' in selectedLog ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Actor</label>
                  <p className="break-all text-base text-gray-900">{selectedLog.actorName || '—'}</p>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Target ID</label>
                <p className="break-all text-base text-gray-900">{selectedLog.targetId || '—'}</p>
              </div>
              {isTenantLog(selectedLog) ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tenant ID</label>
                  <p className="break-all text-base text-gray-900">{selectedLog.tenantId}</p>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Details</label>
              <pre className="overflow-x-auto rounded-2xl border border-[#e6ebf0] bg-[#f8fafc] p-4 text-xs text-[#334155]">
                {stringifyDetails(selectedLog.details)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
