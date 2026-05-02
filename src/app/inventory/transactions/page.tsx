'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { inventoryService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import type { InventoryItemDto, InventoryTransactionDto } from '@/lib/api';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultWeeklyRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = toDateInputValue(now);
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  return { fromDate: toDateInputValue(from), toDate };
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('ru-RU')} ${currency || 'KZT'}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

function formatTransactionType(value: string): string {
  switch (value) {
    case 'RECEIVED':
      return 'Приход';
    case 'ISSUED':
      return 'Выдача';
    case 'RETURNED':
      return 'Возврат';
    case 'ADJUSTMENT':
      return 'Корректировка';
    case 'WRITE_OFF':
      return 'Списание';
    default:
      return value;
  }
}

function getTransactionTypeStyle(type: string): { bg: string; border: string; text: string } {
  switch (type) {
    case 'RECEIVED':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    case 'ISSUED':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
    case 'RETURNED':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    case 'ADJUSTMENT':
      return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
    case 'WRITE_OFF':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
  }
}

export default function InventoryTransactionsPage() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId') || '';
  const defaultRange = useMemo(() => getDefaultWeeklyRange(), []);
  const [page, setPage] = useState(0);
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const pageSize = 10;

  const {
    data: itemResponse,
    loading: itemLoading,
  } = useApi(
    () => (itemId ? inventoryService.getById(itemId) : Promise.resolve(null)),
    [itemId]
  );

  const {
    data: transactionsResponse,
    loading: transactionsLoading,
    error,
  } = useApi(
    () => {
      if (!itemId) {
        return Promise.resolve(null);
      }

      return inventoryService.getItemTransactions(itemId, {
        page,
        size: pageSize,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
    },
    [itemId, page, fromDate, toDate]
  );

  const item: InventoryItemDto | null = itemResponse ?? null;
  const transactionsPage = transactionsResponse ?? null;
  const transactions: InventoryTransactionDto[] = useMemo(() => transactionsPage?.content ?? [], [transactionsPage]);

  const loading = itemLoading || transactionsLoading;

  const openPage = (nextPage: number) => {
    setPage(nextPage);
  };

  const resetFilters = () => {
    setFromDate(defaultRange.fromDate);
    setToDate(defaultRange.toDate);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {item && (
        <div className="crm-surface p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-[#7f8794]">Товар</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">{item.name}</p>
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Остаток</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">
                {item.quantity} {item.unitAbbreviation || ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Статус</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">{item.status}</p>
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Стоимость</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">
                {formatMoney(item.totalValue, item.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="crm-surface p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">С даты</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
                className="crm-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">По дату</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
                className="crm-input"
              />
            </div>
            <Button variant="secondary" onClick={resetFilters}>
              Сбросить
            </Button>
          </div>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-[#4b5563]">
            Движений: <span className="font-semibold text-[#1f2530]">{transactionsPage?.totalElements ?? 0}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">Дата</th>
                  <th className="crm-table-th">Тип</th>
                  <th className="crm-table-th">Количество</th>
                  <th className="crm-table-th">До</th>
                  <th className="crm-table-th">После</th>
                  <th className="crm-table-th">Причина</th>
                  <th className="crm-table-th">Примечание</th>
                  <th className="crm-table-th">Провёл</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="crm-table-row">
                      <td className="crm-table-cell whitespace-nowrap text-sm text-[#273142]">
                        {formatDateTime(transaction.transactionDate || transaction.createdAt)}
                      </td>
                      <td className="crm-table-cell">
                        {(() => {
                          const style = getTransactionTypeStyle(transaction.transactionType);
                          return (
                            <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
                              {formatTransactionType(transaction.transactionType)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="crm-table-cell font-semibold text-[#1f2530]">{transaction.quantity}</td>
                      <td className="crm-table-cell">{transaction.quantityBefore ?? '—'}</td>
                      <td className="crm-table-cell">{transaction.quantityAfter ?? '—'}</td>
                      <td className="crm-table-cell">{transaction.reason || '—'}</td>
                      <td className="crm-table-cell max-w-xs truncate">{transaction.notes || '—'}</td>
                      <td className="crm-table-cell">{transaction.performedBy || transaction.approvedBy || 'Не указан'}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={8} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Движений пока нет.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {transactionsPage && transactionsPage.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e6ebf0] px-6 py-4 text-sm text-[#5f6a7a]">
            <span>
              Страница {transactionsPage.page + 1} из {transactionsPage.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openPage(Math.max(page - 1, 0))} disabled={page === 0}>
                Назад
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openPage(Math.min(page + 1, transactionsPage.totalPages - 1))}
                disabled={page >= transactionsPage.totalPages - 1}
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}