'use client';

import { Eye, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { notificationsService, type NotificationDto } from '@/lib/api';
import { useApi, usePaginatedApi } from '@/hooks/useApi';
import { getErrorMessage } from '@/lib/error-message';
import { pushToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';

const TABLE_PAGE_SIZE = 20;

type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
type NotificationType = 'EMAIL' | 'SMS';

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: 'border-amber-200 bg-amber-100 text-amber-700',
    SENT: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    FAILED: 'border-rose-200 bg-rose-100 text-rose-700',
  };
  const labels: Record<string, string> = {
    PENDING: 'В очереди',
    SENT: 'Отправлено',
    FAILED: 'Ошибка',
  };

  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${styles[status] ?? 'border-[#dbe2e8] bg-[#f8fafc] text-[#556070]'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function NotificationsPage() {
  const { roles } = useAuthStore();
  const [filters, setFilters] = useState<{
    search: string;
    type: NotificationType | 'all';
    status: NotificationStatus | 'all';
  }>({
    search: '',
    type: 'all',
    status: 'all',
  });
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    body: '',
    alsoEmail: true,
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const canBroadcastToAllUsers = useMemo(
    () => roles.includes('TENANT_ADMIN') || roles.includes('SUPER_ADMIN'),
    [roles]
  );

  const {
    data: notifications,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    setPage,
    refetch,
  } = usePaginatedApi(
    (pageNum, size) =>
      notificationsService.getAll({
        page: pageNum,
        size,
        type: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
      }),
    0,
    TABLE_PAGE_SIZE,
    [filters.type, filters.status]
  );

  const handleBroadcast = async () => {
    const subject = broadcastForm.subject.trim();
    const body = broadcastForm.body.trim();

    if (!subject) {
      pushToast({ message: 'Укажите тему уведомления.', tone: 'warning' });
      return;
    }

    if (!body) {
      pushToast({ message: 'Введите текст уведомления.', tone: 'warning' });
      return;
    }

    setBroadcastLoading(true);
    try {
      const response = await notificationsService.broadcast({
        subject,
        body,
        alsoEmail: broadcastForm.alsoEmail,
      });

      pushToast({
        tone: 'success',
        message: `Уведомление отправлено. Получателей: ${response.data.recipients}.`,
      });

      setBroadcastForm({ subject: '', body: '', alsoEmail: true });
      setIsBroadcastModalOpen(false);
      await refetch();
    } catch (error: unknown) {
      pushToast({
        tone: 'error',
        message: getErrorMessage(error, 'Не удалось отправить уведомление всем пользователям.'),
      });
    } finally {
      setBroadcastLoading(false);
    }
  };

  const {
    data: selectedNotification,
    loading: notificationDetailLoading,
    error: notificationDetailError,
  } = useApi(
    () =>
      selectedNotificationId
        ? notificationsService.getById(selectedNotificationId)
        : Promise.resolve({ data: null as NotificationDto | null }),
    [selectedNotificationId]
  );

  const filteredNotifications = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (!query) {
        return true;
      }

      return [
        notification.subject,
        notification.body,
        notification.recipientEmail,
        notification.recipientPhone,
        notification.eventType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filters.search, notifications]);

  const rangeStart = totalElements === 0 ? 0 : page * TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * TABLE_PAGE_SIZE, totalElements);

  return (
    <div className="space-y-6">
      <div className="crm-surface p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202938]">Журнал уведомлений</h2>
          </div>
          {canBroadcastToAllUsers ? (
            <Button onClick={() => setIsBroadcastModalOpen(true)}>
              Отправить всем
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по теме, телу, получателю"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={filters.type}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, type: event.target.value as NotificationType | 'all' }));
              setPage(0);
            }}
            className="crm-select"
          >
            <option value="all">Все типы</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>

          <select
            value={filters.status}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, status: event.target.value as NotificationStatus | 'all' }));
              setPage(0);
            }}
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            <option value="PENDING">В очереди</option>
            <option value="SENT">Отправлено</option>
            <option value="FAILED">Ошибка</option>
          </select>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-gray-700">
            Показано: <span className="font-semibold text-gray-900">{rangeStart}-{rangeEnd}</span> из{' '}
            <span className="font-semibold text-gray-900">{totalElements}</span>
          </p>
          <p className="text-sm font-medium text-gray-700">
            Страниц: <span className="font-semibold text-gray-900">{Math.max(totalPages, 1)}</span>
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
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Тип</th>
                  <th className="crm-table-th">Событие</th>
                  <th className="crm-table-th">Получатель</th>
                  <th className="crm-table-th">Тема / текст</th>
                  <th className="crm-table-th">Создано</th>
                  <th className="crm-table-th">Отправлено</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification, index) => (
                    <tr key={notification.id} className="crm-table-row">
                      <td className="crm-table-cell">{page * TABLE_PAGE_SIZE + index + 1}</td>
                      <td className="crm-table-cell">{notification.type}</td>
                      <td className="crm-table-cell">{notification.eventType || '—'}</td>
                      <td className="crm-table-cell">
                        {notification.recipientEmail || notification.recipientPhone || '—'}
                      </td>
                      <td className="crm-table-cell">
                        <div>
                          <div className="text-sm font-semibold text-[#202938]">{notification.subject || 'Без темы'}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-[#8690a0]">{notification.body}</div>
                        </div>
                      </td>
                      <td className="crm-table-cell">{formatDateTime(notification.createdAt)}</td>
                      <td className="crm-table-cell">{formatDateTime(notification.sentAt)}</td>
                      <td className="crm-table-cell">{getStatusBadge(notification.status)}</td>
                      <td className="crm-table-cell">
                        <button
                          type="button"
                          onClick={() => setSelectedNotificationId(notification.id)}
                          className="rounded-lg p-2 text-[#3b82f6] transition-colors hover:bg-[#eef5ff]"
                          title="Открыть уведомление"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={9} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Уведомления не найдены
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

      <Modal
        isOpen={Boolean(selectedNotificationId)}
        onClose={() => setSelectedNotificationId(null)}
        title="Детали уведомления"
      >
        {notificationDetailLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : notificationDetailError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notificationDetailError}
          </div>
        ) : !selectedNotification ? (
          <p className="text-sm text-[#8a93a3]">Уведомление не найдено</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Тип</label>
                <p className="text-base text-gray-900">{selectedNotification.type}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Статус</label>
                <div>{getStatusBadge(selectedNotification.status)}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Событие</label>
                <p className="text-base text-gray-900">{selectedNotification.eventType || '—'}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Tenant ID</label>
                <p className="break-all text-base text-gray-900">{selectedNotification.tenantId}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                <p className="text-base text-gray-900">{selectedNotification.recipientEmail || '—'}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Телефон</label>
                <p className="text-base text-gray-900">{selectedNotification.recipientPhone || '—'}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Создано</label>
                <p className="text-base text-gray-900">{formatDateTime(selectedNotification.createdAt)}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Отправлено</label>
                <p className="text-base text-gray-900">{formatDateTime(selectedNotification.sentAt)}</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Тема</label>
              <p className="whitespace-pre-wrap text-base text-gray-900">{selectedNotification.subject || '—'}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Текст</label>
              <p className="whitespace-pre-wrap text-base text-gray-900">{selectedNotification.body}</p>
            </div>

            {selectedNotification.errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <label className="mb-1 block text-xs font-medium text-red-500">Ошибка</label>
                <p className="whitespace-pre-wrap text-sm text-red-700">{selectedNotification.errorMessage}</p>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={canBroadcastToAllUsers && isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Отправка всем пользователям"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setIsBroadcastModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleBroadcast()} disabled={broadcastLoading}>
              {broadcastLoading ? 'Отправляем...' : 'Отправить всем'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-[#7f8794]">
          Отправьте общее уведомление сотрудникам вашего учебного центра.
        </p>
        <input
          type="text"
          value={broadcastForm.subject}
          onChange={(event) => setBroadcastForm((prev) => ({ ...prev, subject: event.target.value }))}
          placeholder="Тема уведомления"
          className="crm-input"
          maxLength={255}
        />

        <textarea
          value={broadcastForm.body}
          onChange={(event) => setBroadcastForm((prev) => ({ ...prev, body: event.target.value }))}
          placeholder="Текст уведомления"
          className="crm-textarea min-h-30"
          maxLength={2000}
        />

        <label className="inline-flex items-center gap-2 text-sm text-[#556070]">
          <input
            type="checkbox"
            checked={broadcastForm.alsoEmail}
            onChange={(event) => setBroadcastForm((prev) => ({ ...prev, alsoEmail: event.target.checked }))}
            className="h-4 w-4 rounded border-[#c9d3e0] text-[#467aff]"
          />
          Также отправить по email
        </label>
      </Modal>
    </div>
  );
}
