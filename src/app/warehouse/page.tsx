'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Loader2,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import type { InventoryItemDto } from '@/lib/api';

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('ru-RU')} ${currency || 'KZT'}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'IN_STOCK':
      return {
        label: 'В наличии',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'LOW_STOCK':
      return {
        label: 'Мало',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'OUT_OF_STOCK':
      return {
        label: 'Нет',
        color: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
}

function getStockLevelInfo(item: InventoryItemDto) {
  const qty = item.quantity || 0;
  const min = item.minQuantity || 0;

  if (qty === 0) {
    return {
      level: 'empty' as const,
      percent: 0,
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
    };
  }

  if (min > 0) {
    const percent = Math.min((qty / (item.maxQuantity || min * 3)) * 100, 100);
    if (qty <= min) {
      return {
        level: 'critical' as const,
        percent,
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
      };
    }
    if (qty <= min * 1.5) {
      return {
        level: 'warning' as const,
        percent,
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
      };
    }
    return {
      level: 'good' as const,
      percent,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    };
  }

  return {
    level: 'good' as const,
    percent: 100,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
  };
}

export default function WarehousePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: itemsPage,
    loading,
    error,
  } = useApi(
    () =>
      inventoryService.getAll({
        search: search.trim() || undefined,
      }),
    [search]
  );

  const items = useMemo(() => itemsPage?.content ?? [], [itemsPage]);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    items.forEach((item) => {
      const cat = item.categoryName || 'Без категории';
      cats.set(cat, (cats.get(cat) || 0) + 1);
    });
    return Array.from(cats.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.sku && item.sku.toLowerCase().includes(query)) ||
          (item.brand && item.brand.toLowerCase().includes(query)) ||
          (item.supplier && item.supplier.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((item) => (item.categoryName || 'Без категории') === categoryFilter);
    }

    // Stock level filter
    if (stockLevelFilter !== 'all') {
      result = result.filter((item) => item.status === stockLevelFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'quantity':
          aVal = a.quantity || 0;
          bVal = b.quantity || 0;
          break;
        case 'totalValue':
          aVal = a.totalValue || 0;
          bVal = b.totalValue || 0;
          break;
        case 'pricePerUnit':
          aVal = a.pricePerUnit || 0;
          bVal = b.pricePerUnit || 0;
          break;
        case 'updatedAt':
          aVal = a.updatedAt || '';
          bVal = b.updatedAt || '';
          break;
        default:
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [items, search, categoryFilter, stockLevelFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = items.length;
    const totalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const lowStock = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const tracked = items.filter((i) => i.isTracked).length;

    return { total, totalItems, totalValue, lowStock, outOfStock, tracked };
  }, [items]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <BarChart3 className="ml-1 h-3 w-3 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-[#467aff]" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-[#467aff]" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1f2530]">Склад</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eef5ff] p-2.5">
              <Package className="h-5 w-5 text-[#467aff]" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Позиций на складе</p>
              <p className="text-2xl font-bold text-[#1f2530]">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Общее количество</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Требуют внимания</p>
              <p className="text-2xl font-bold text-amber-700">
                {stats.lowStock + stats.outOfStock}
              </p>
              <p className="text-xs text-[#8a93a3]">
                {stats.lowStock} мало · {stats.outOfStock} нет
              </p>
            </div>
          </div>
        </div>

        <div className="crm-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f8fafc] p-2.5">
              <BarChart3 className="h-5 w-5 text-[#467aff]" />
            </div>
            <div>
              <p className="text-sm text-[#7f8794]">Общая стоимость</p>
              <p className="text-2xl font-bold text-[#1f2530]">
                {stats.totalValue.toLocaleString('ru-RU')} ₸
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="crm-surface p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, артикулу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-input crm-input-with-icon"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="crm-select"
          >
            <option value="all">Все категории</option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>

          <select
            value={stockLevelFilter}
            onChange={(e) => setStockLevelFilter(e.target.value)}
            className="crm-select"
          >
            <option value="all">Все уровни</option>
            <option value="IN_STOCK">В наличии</option>
            <option value="LOW_STOCK">Мало</option>
            <option value="OUT_OF_STOCK">Нет в наличии</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="crm-select"
          >
            <option value="createdAt-desc">Сначала новые</option>
            <option value="createdAt-asc">Сначала старые</option>
            <option value="name-asc">По названию (А-Я)</option>
            <option value="name-desc">По названию (Я-А)</option>
            <option value="quantity-desc">По количеству (убыв.)</option>
            <option value="quantity-asc">По количеству (возр.)</option>
            <option value="totalValue-desc">По стоимости (убыв.)</option>
            <option value="totalValue-asc">По стоимости (возр.)</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Inventory Table */}
      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-[#4b5563]">
            Остатки на складе:{' '}
            <span className="font-semibold text-[#1f2530]">{filteredItems.length}</span>
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
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('name')}>
                    <span className="flex items-center">
                      Название
                      <SortIcon field="name" />
                    </span>
                  </th>
                  <th className="crm-table-th">Артикул</th>
                  <th className="crm-table-th">Категория</th>
                  <th className="crm-table-th">Местоположение</th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('quantity')}>
                    <span className="flex items-center">
                      Остаток
                      <SortIcon field="quantity" />
                    </span>
                  </th>
                  <th className="crm-table-th">Уровень</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('pricePerUnit')}>
                    <span className="flex items-center">
                      Цена за ед.
                      <SortIcon field="pricePerUnit" />
                    </span>
                  </th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('totalValue')}>
                    <span className="flex items-center">
                      Общая стоимость
                      <SortIcon field="totalValue" />
                    </span>
                  </th>
                  <th className="crm-table-th">Поставщик</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => {
                    const statusMeta = getStatusBadge(item.status);
                    const stockInfo = getStockLevelInfo(item);

                    return (
                      <tr key={item.id} className="crm-table-row">
                        <td className="crm-table-cell">{index + 1}</td>
                        <td className="crm-table-cell">
                          <div className="text-sm font-semibold text-[#202938]">{item.name}</div>
                          {item.brand && (
                            <div className="text-xs text-[#8690a0]">{item.brand}</div>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          {item.sku ? (
                            <span className="rounded-lg border border-[#dbe2e8] bg-white px-2 py-0.5 text-xs font-mono text-[#5a6576]">
                              {item.sku}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <span className="rounded-lg border border-[#dbe2e8] bg-white px-2.5 py-1 text-xs text-[#5a6576]">
                            {item.categoryName || '—'}
                          </span>
                        </td>
                        <td className="crm-table-cell text-sm text-[#5a6576]">
                          {item.location || '—'}
                        </td>
                        <td className="crm-table-cell">
                          <span className={`text-lg font-semibold ${stockInfo.textColor}`}>
                            {item.quantity}
                          </span>
                          {item.unitAbbreviation && (
                            <span className="ml-1 text-xs text-[#8a93a3]">{item.unitAbbreviation}</span>
                          )}
                          {item.minQuantity != null && (
                            <div className="text-[10px] text-[#8a93a3]">мин: {item.minQuantity}</div>
                          )}
                        </td>
                        <td className="crm-table-cell">
                          <div className="w-24">
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full ${stockInfo.color}`}
                                style={{ width: `${Math.min(stockInfo.percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="crm-table-cell">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusMeta.color}`}
                          >
                            {statusMeta.label}
                          </span>
                          {item.requiresReorder && (
                            <div className="mt-1 text-[10px] text-amber-600">Требуется пополнение</div>
                          )}
                        </td>
                        <td className="crm-table-cell text-sm">
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
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={11} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      {loading ? 'Загрузка...' : 'Остатки не найдены'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Categories Summary */}
      {categories.length > 0 && (
        <div className="crm-surface p-5">
          <h3 className="text-base font-bold text-[#1f2530]">Категории</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setCategoryFilter(cat.name)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  categoryFilter === cat.name
                    ? 'border-[#467aff] bg-[#eef5ff]'
                    : 'border-[#e6ebf0] bg-white hover:border-[#cad8ff]'
                }`}
              >
                <p className="text-sm font-semibold text-[#1f2530]">{cat.name}</p>
                <p className="mt-1 text-xs text-[#7f8794]">{cat.count} позиций</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
