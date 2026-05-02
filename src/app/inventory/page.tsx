'use client';

import { useMemo, useState } from 'react';
import { Download, ArrowRightLeft, Loader2, RotateCcw, Search, AlertTriangle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { inventoryService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import type {
  CreateInventoryItemRequest,
  InventoryItemDto,
  InventoryStatsDto,
  UpdateInventoryItemRequest,
} from '@/lib/api';

type InventoryItemForm = {
  categoryId: string;
  unitId: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  brand: string;
  model: string;
  quantity: string;
  minQuantity: string;
  maxQuantity: string;
  pricePerUnit: string;
  sellingPrice: string;
  currency: string;
  location: string;
  supplier: string;
  supplierContact: string;
  isTracked: boolean;
  notes: string;
};

const emptyForm: InventoryItemForm = {
  categoryId: '',
  unitId: '',
  name: '',
  sku: '',
  barcode: '',
  description: '',
  brand: '',
  model: '',
  quantity: '0',
  minQuantity: '',
  maxQuantity: '',
  pricePerUnit: '',
  sellingPrice: '',
  currency: 'KZT',
  location: '',
  supplier: '',
  supplierContact: '',
  isTracked: true,
  notes: '',
};

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('ru-RU')} ${currency || 'KZT'}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'IN_STOCK':
      return {
        label: 'В наличии',
        icon: null,
        color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'LOW_STOCK':
      return {
        label: 'Мало',
        icon: AlertTriangle,
        color: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'OUT_OF_STOCK':
      return {
        label: 'Нет в наличии',
        icon: XCircle,
        color: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    default:
      return {
        label: status,
        icon: null,
        color: 'border-gray-200 bg-gray-50 text-gray-700',
      };
  }
}

export default function InventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isStartingRevision, setIsStartingRevision] = useState(false);

  const {
    data: itemsPage,
    loading,
    error,
    refetch,
  } = useApi(
    () =>
      inventoryService.getAll({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    [search, statusFilter]
  );

  // revision starter flag handled locally

  const { data: categories } = useApi(() => inventoryService.getCategories(), []);
  const { data: units } = useApi(() => inventoryService.getUnits(), []);
  const { data: inventoryStats } = useApi<InventoryStatsDto>(() => inventoryService.getStats(), []);

  const items = useMemo(() => itemsPage?.content ?? [], [itemsPage]);

  const stats = useMemo(() => {
    if (inventoryStats) {
      const total = inventoryStats.totalItems || 0;
      const lowStock = inventoryStats.lowStockCount || 0;
      const outOfStock = inventoryStats.outOfStockCount || 0;
      const inStock = Math.max(total - lowStock - outOfStock, 0);
      const totalValue = inventoryStats.totalInventoryValue || 0;
      return { total, inStock, lowStock, outOfStock, totalValue };
    }

    const total = items.length;
    const inStock = items.filter((i) => i.status === 'IN_STOCK').length;
    const lowStock = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    return { total, inStock, lowStock, outOfStock, totalValue };
  }, [inventoryStats, items]);

  const handleStartRevision = async () => {
    try {
      setIsStartingRevision(true);
      router.push('/inventory/revision');
    } catch (err) {
      console.error('start revision error', err);
      alert('Не удалось начать ревизию');
    } finally {
      setIsStartingRevision(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const handleExportInventoryReport = async () => {
    const { blob, filename } = await inventoryService.exportReport();
    downloadBlob(blob, filename);
  };

  const hasDirtyFilters = search.trim().length > 0 || statusFilter !== 'all';

  const openTransactionsPage = (itemId: string) => {
    router.push(`/inventory/transactions?itemId=${itemId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Download} onClick={() => void handleExportInventoryReport()}>
            Экспорт отчета
          </Button>
          <Button onClick={() => void handleStartRevision()} disabled={isStartingRevision}>
            {isStartingRevision ? 'Запускаем...' : 'Провести инвентаризацию'}
          </Button>
        </div>
      </div>

      <div className="crm-surface p-5">
        <div className="flex items-start justify-between">
         

          {hasDirtyFilters && (
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={resetFilters}>
              Сбросить
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-[#dbe2e8] bg-[#f8fafc] p-4">
            <p className="text-sm text-[#7f8794]">Всего позиций</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-600">В наличии</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.inStock}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-600">Мало</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.lowStock}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-600">Нет в наличии</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{stats.outOfStock}</p>
          </div>
          <div className="rounded-2xl border border-[#dbe2e8] bg-white p-4">
            <p className="text-sm text-[#7f8794]">Общая стоимость</p>
            <p className="mt-1 text-2xl font-bold text-[#1f2530]">
              {stats.totalValue.toLocaleString('ru-RU')} ₸
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="crm-select"
          >
            <option value="all">Все статусы</option>
            <option value="IN_STOCK">В наличии</option>
            <option value="LOW_STOCK">Мало</option>
            <option value="OUT_OF_STOCK">Нет в наличии</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-[#4b5563]">
            Позиции инвентаря: <span className="font-semibold text-[#1f2530]">{items.length}</span>
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
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Название</th>
                  <th className="crm-table-th">Артикул</th>
                  <th className="crm-table-th">Бренд / Модель</th>
                  <th className="crm-table-th">Кол-во</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th">Цена за ед.</th>
                  <th className="crm-table-th">Общая стоимость</th>
                  <th className="crm-table-th">Поставщик</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {items.length > 0 ? (
                  items.map((item, index) => {
                    const statusMeta = getStatusBadge(item.status);
                    const StatusIcon = statusMeta.icon;

                    return (
                      <tr key={item.id} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">
                          <div className="text-sm font-semibold text-[#202938]">{item.name}</div>
                          {item.description && (
                            <div className="mt-0.5 max-w-xs truncate text-xs text-[#8690a0]">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          {item.sku ? (
                            <span className="rounded-lg border border-[#dbe2e8] bg-white px-2.5 py-1 text-xs font-medium text-[#5a6576]">
                              {item.sku}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="crm-table-cell">
                          {item.brand || item.model ? (
                            <div>
                              {item.brand && <div className="text-sm text-[#273142]">{item.brand}</div>}
                              {item.model && (
                                <div className="text-xs text-[#8a93a3]">{item.model}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <span
                            className={`text-lg font-semibold ${
                              item.status === 'OUT_OF_STOCK'
                                ? 'text-rose-600'
                                : item.status === 'LOW_STOCK'
                                  ? 'text-amber-600'
                                  : 'text-[#1f2530]'
                            }`}
                          >
                            {item.quantity}
                          </span>
                          {item.unitAbbreviation && (
                            <span className="ml-1 text-xs text-[#8a93a3]">{item.unitAbbreviation}</span>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${statusMeta.color}`}
                          >
                            {StatusIcon && <StatusIcon className="h-3 w-3" />}
                            {statusMeta.label}
                          </span>
                          {item.requiresReorder && (
                            <div className="mt-1 text-[10px] text-amber-600">Требуется пополнение</div>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          {formatMoney(item.pricePerUnit, item.currency)}
                        </td>
                        <td className="crm-table-cell font-semibold text-[#1f2530]">
                          {formatMoney(item.totalValue, item.currency)}
                        </td>
                        <td className="crm-table-cell">
                          {item.supplier ? (
                            <div>
                              <div className="text-sm text-[#273142]">{item.supplier}</div>
                              {item.supplierContact && (
                                <div className="text-xs text-[#8a93a3]">{item.supplierContact}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openTransactionsPage(item.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
                              title="Движение товара"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={10} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      {loading ? 'Загрузка...' : 'Позиции инвентаря не найдены'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </div>
  );
}
