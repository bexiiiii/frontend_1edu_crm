'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  Loader2,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  CreateInventoryItemRequest,
  CreateInventoryTransactionRequest,
  InventoryCategoryDto,
  InventoryItemDto,
  InventoryStatsDto,
  UpdateInventoryItemRequest,
} from '@/lib/api';

const TRANSACTION_TYPES = [
  { value: 'RECEIVED', label: 'Приход' },
  { value: 'ISSUED', label: 'Выдача' },
  { value: 'RETURNED', label: 'Возврат' },
  { value: 'ADJUSTMENT', label: 'Корректировка' },
  { value: 'WRITE_OFF', label: 'Списание' },
] as const;

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('ru-RU')} ${currency || 'KZT'}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'IN_STOCK':
      return { label: 'В наличии', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'LOW_STOCK':
      return { label: 'Мало', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'OUT_OF_STOCK':
      return { label: 'Нет', color: 'bg-rose-100 text-rose-700 border-rose-200' };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function getStockLevelInfo(item: InventoryItemDto) {
  const qty = item.quantity || 0;
  const min = item.minQuantity || 0;

  if (qty === 0) {
    return { level: 'empty' as const, percent: 0, color: 'bg-rose-500', textColor: 'text-rose-600' };
  }

  if (min > 0) {
    const percent = Math.min((qty / (item.maxQuantity || min * 3)) * 100, 100);
    if (qty <= min) {
      return { level: 'critical' as const, percent, color: 'bg-rose-500', textColor: 'text-rose-600' };
    }
    if (qty <= min * 1.5) {
      return { level: 'warning' as const, percent, color: 'bg-amber-500', textColor: 'text-amber-600' };
    }
    return { level: 'good' as const, percent, color: 'bg-emerald-500', textColor: 'text-emerald-600' };
  }

  return { level: 'good' as const, percent: 100, color: 'bg-emerald-500', textColor: 'text-emerald-600' };
}

type TransactionForm = {
  transactionType: string;
  quantity: string;
  notes: string;
  reason: string;
  performedBy: string;
};

const emptyTransactionForm: TransactionForm = {
  transactionType: 'RECEIVED',
  quantity: '',
  notes: '',
  reason: '',
  performedBy: '',
};

export default function WarehousePage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [transactionItem, setTransactionItem] = useState<InventoryItemDto | null>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionForm>(emptyTransactionForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDto | null>(null);
  const [form, setForm] = useState<{
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
  }>({
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
  });

  const createMutation = useMutation((data: CreateInventoryItemRequest) => inventoryService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateInventoryItemRequest }) =>
    inventoryService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => inventoryService.delete(id));

  const {
    data: itemsPage,
    loading,
    error,
    refetch,
  } = useApi(
    () => inventoryService.getAll({ search: search.trim() || undefined }),
    [search]
  );

  const items = useMemo(() => itemsPage?.content ?? [], [itemsPage]);

  const { data: inventoryStats } = useApi<InventoryStatsDto>(() => inventoryService.getStats(), []);
  const { data: units } = useApi(() => inventoryService.getUnits(), []);
  const { data: categoryOptions } = useApi<InventoryCategoryDto[]>(() => inventoryService.getCategories(), []);

  const transactionMutation = useMutation(
    ({ itemId, data }: { itemId: string; data: CreateInventoryTransactionRequest }) =>
      inventoryService.createTransaction(itemId, data)
  );

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

    if (categoryFilter !== 'all') {
      result = result.filter((item) => (item.categoryName || 'Без категории') === categoryFilter);
    }

    if (stockLevelFilter !== 'all') {
      result = result.filter((item) => item.status === stockLevelFilter);
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortBy) {
        case 'name':
          aVal = a.name; bVal = b.name; break;
        case 'quantity':
          aVal = a.quantity || 0; bVal = b.quantity || 0; break;
        case 'totalValue':
          aVal = a.totalValue || 0; bVal = b.totalValue || 0; break;
        case 'pricePerUnit':
          aVal = a.pricePerUnit || 0; bVal = b.pricePerUnit || 0; break;
        case 'updatedAt':
          aVal = a.updatedAt || ''; bVal = b.updatedAt || ''; break;
        default:
          aVal = a.createdAt || ''; bVal = b.createdAt || '';
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
    if (inventoryStats) {
      const total = inventoryStats.totalItems || 0;
      const lowStock = inventoryStats.lowStockCount || 0;
      const outOfStock = inventoryStats.outOfStockCount || 0;
      const totalValue = inventoryStats.totalInventoryValue || 0;
      const inStock = Math.max(total - lowStock - outOfStock, 0);
      return { total, totalItems: total, totalValue, lowStock, outOfStock, tracked: inStock };
    }

    const total = items.length;
    const totalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const lowStock = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const tracked = items.filter((i) => i.isTracked).length;
    return { total, totalItems, totalValue, lowStock, outOfStock, tracked };
  }, [inventoryStats, items]);

  const handleExportItems = async () => {
    const { blob, filename } = await inventoryService.exportItems();
    downloadBlob(blob, filename);
  };

  const handleExportTransactions = async () => {
    const { blob, filename } = await inventoryService.exportTransactions();
    downloadBlob(blob, filename);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
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
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItemDto) => {
    setEditingItem(item);
    setForm({
      categoryId: item.categoryId || '',
      unitId: item.unitId || '',
      name: item.name || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      description: item.description || '',
      brand: item.brand || '',
      model: item.model || '',
      quantity: String(item.quantity || 0),
      minQuantity: item.minQuantity != null ? String(item.minQuantity) : '',
      maxQuantity: item.maxQuantity != null ? String(item.maxQuantity) : '',
      pricePerUnit: item.pricePerUnit != null ? String(item.pricePerUnit) : '',
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : '',
      currency: item.currency || 'KZT',
      location: item.location || '',
      supplier: item.supplier || '',
      supplierContact: item.supplierContact || '',
      isTracked: item.isTracked ?? true,
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (!editingItem && !form.unitId) {
      alert('Выберите единицу измерения');
      return;
    }

    const quantity = Number(form.quantity);
    if (quantity < 0) return;

    if (editingItem) {
      const data: UpdateInventoryItemRequest = {
        categoryId: form.categoryId || undefined,
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        quantity,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : undefined,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
        location: form.location.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        supplierContact: form.supplierContact.trim() || undefined,
        isTracked: form.isTracked,
        notes: form.notes.trim() || undefined,
      };
      await updateMutation.mutate({ id: editingItem.id, data });
    } else {
      const data: CreateInventoryItemRequest = {
        categoryId: form.categoryId || undefined,
        unitId: form.unitId,
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        description: form.description.trim() || undefined,
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        quantity,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : undefined,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
        currency: form.currency || 'KZT',
        location: form.location.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        supplierContact: form.supplierContact.trim() || undefined,
        isTracked: form.isTracked,
        notes: form.notes.trim() || undefined,
      };
      await createMutation.mutate(data);
    }

    setIsModalOpen(false);
    await refetch();
  };

  const handleDeleteItem = async (item: InventoryItemDto) => {
    if (item.quantity > 0) {
      alert('Нельзя удалить позицию с остатком больше 0. Сначала спишите остатки.');
      return;
    }
    if (!confirm(`Удалить позицию "${item.name}"?`)) return;

    await deleteMutation.mutate(item.id);
    await refetch();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const openTransactionModal = (item: InventoryItemDto) => {
    setTransactionItem(item);
    setTransactionForm(emptyTransactionForm);
  };

  const handleSaveTransaction = async () => {
    if (!transactionItem || !transactionForm.quantity) return;
    const qty = Number(transactionForm.quantity);
    if (qty <= 0) return;

    await transactionMutation.mutate({
      itemId: transactionItem.id,
      data: {
        transactionType: transactionForm.transactionType,
        quantity: qty,
        notes: transactionForm.notes.trim() || undefined,
        reason: transactionForm.reason.trim() || undefined,
        performedBy: transactionForm.performedBy.trim() || undefined,
      },
    });

    setTransactionItem(null);
    await refetch();
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <BarChart3 className="ml-1 h-3 w-3 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-[#467aff]" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-[#467aff]" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" icon={Download} onClick={() => void handleExportItems()}>
          Экспорт товаров
        </Button>
        <Button variant="secondary" icon={Download} onClick={() => void handleExportTransactions()}>
          Экспорт движений
        </Button>
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить позицию
        </Button>
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
                      {renderSortIcon('name')}
                    </span>
                  </th>
                  <th className="crm-table-th">Артикул</th>
                  <th className="crm-table-th">Категория</th>
                  <th className="crm-table-th">Местоположение</th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('quantity')}>
                    <span className="flex items-center">
                      Остаток
                      {renderSortIcon('quantity')}
                    </span>
                  </th>
                  <th className="crm-table-th">Уровень</th>
                  <th className="crm-table-th">Статус</th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('pricePerUnit')}>
                    <span className="flex items-center">
                      Цена за ед.
                      {renderSortIcon('pricePerUnit')}
                    </span>
                  </th>
                  <th className="crm-table-th cursor-pointer" onClick={() => handleSort('totalValue')}>
                    <span className="flex items-center">
                      Общая стоимость
                      {renderSortIcon('totalValue')}
                    </span>
                  </th>
                  <th className="crm-table-th">Поставщик</th>
                  <th className="crm-table-th">Движение</th>
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
                        <td className="crm-table-cell">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openTransactionModal(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff]"
                              title="Записать движение"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff]"
                              title="Редактировать"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#c34c4c] transition-colors hover:bg-[#fff1f1]"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={12} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      {loading ? 'Загрузка...' : 'Остатки не найдены'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <Modal
        isOpen={Boolean(transactionItem)}
        onClose={() => setTransactionItem(null)}
        title="Записать движение товара"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransactionItem(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleSaveTransaction()}
              disabled={transactionMutation.loading || !transactionForm.quantity || Number(transactionForm.quantity) <= 0}
            >
              {transactionMutation.loading ? 'Сохраняем...' : 'Записать'}
            </Button>
          </>
        }
      >
        {transactionItem && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#e6ebf0] bg-[#f8fafc] px-4 py-3">
              <p className="text-sm font-semibold text-[#1f2530]">{transactionItem.name}</p>
              <p className="mt-0.5 text-xs text-[#7f8794]">
                Текущий остаток: {transactionItem.quantity} {transactionItem.unitAbbreviation || ''}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                Тип операции <span className="text-rose-500">*</span>
              </label>
              <select
                value={transactionForm.transactionType}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, transactionType: e.target.value }))}
                className="crm-select"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                Количество <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={transactionForm.quantity}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, quantity: e.target.value }))}
                className="crm-input"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Причина</label>
              <input
                type="text"
                value={transactionForm.reason}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="crm-input"
                placeholder="Причина операции"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Кто провёл</label>
              <input
                type="text"
                value={transactionForm.performedBy}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, performedBy: e.target.value }))}
                className="crm-input"
                placeholder="ФИО или должность (напр. Иван Петров)"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Примечание</label>
              <textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="crm-textarea resize-none"
                placeholder="Дополнительные заметки"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Редактировать позицию' : 'Добавить позицию'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={
                (createMutation.loading || updateMutation.loading) ||
                !form.name ||
                Number(form.quantity) < 0
              }
            >
              {createMutation.loading || updateMutation.loading ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#e6ebf0] bg-[#fafbfd] p-4">
            <h3 className="text-sm font-semibold text-[#273142]">Основная информация</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                  Название <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="crm-input"
                  placeholder="Введите название позиции"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5d6676]">Категория</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="crm-select"
                  >
                    <option value="">Без категории</option>
                    {(categoryOptions || []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                    Единица измерения {!editingItem && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
                    className="crm-select"
                    disabled={Boolean(editingItem)}
                  >
                    <option value="">Выберите единицу</option>
                    {(units || []).map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="crm-textarea resize-none"
                  placeholder="Описание позиции"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6ebf0] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#273142]">Остатки и цены</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">
                  Количество <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="crm-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Мин. остаток</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.minQuantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, minQuantity: e.target.value }))}
                  className="crm-input"
                  placeholder="Порог пополнения"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Макс. остаток</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.maxQuantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxQuantity: e.target.value }))}
                  className="crm-input"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Цена за единицу</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePerUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, pricePerUnit: e.target.value }))}
                  className="crm-input"
                  placeholder="Закупочная цена"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Цена продажи</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                  className="crm-input"
                  placeholder="Розничная цена"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Валюта</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="crm-select"
                >
                  <option value="KZT">KZT (Тенге)</option>
                  <option value="UZS">UZS (Сум)</option>
                  <option value="USD">USD (Доллар)</option>
                  <option value="EUR">EUR (Евро)</option>
                  <option value="RUB">RUB (Рубль)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6ebf0] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#273142]">Логистика и поставщик</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Местоположение</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="crm-input"
                  placeholder="Склад / Полка / Ячейка"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d6676]">Отслеживание</label>
                <div className="flex h-11 items-center rounded-xl border border-[#dbe2e8] bg-[#f8fafc] px-3">
                  <input
                    type="checkbox"
                    id="isTracked"
                    checked={form.isTracked}
                    onChange={(e) => setForm((prev) => ({ ...prev, isTracked: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-[#467aff] focus:ring-[#467aff]"
                  />
                  <label htmlFor="isTracked" className="ml-2 text-sm text-[#5d6676]">
                    Отслеживать остатки
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6ebf0] bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметки</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="crm-textarea resize-none"
              placeholder="Дополнительные заметки"
            />
          </section>
        </div>
      </Modal>
    </div>
  );
}
