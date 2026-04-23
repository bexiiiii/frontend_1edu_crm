'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  Edit2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { inventoryService } from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type {
  CreateInventoryItemRequest,
  InventoryItemDto,
  UpdateInventoryItemRequest,
} from '@/lib/api';

type InventoryItemForm = {
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
        icon: CheckCircle,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDto | null>(null);
  const [form, setForm] = useState<InventoryItemForm>(emptyForm);

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

  const createMutation = useMutation((data: CreateInventoryItemRequest) =>
    inventoryService.create(data)
  );
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdateInventoryItemRequest }) =>
      inventoryService.update(id, data)
  );
  const deleteMutation = useMutation((id: string) => inventoryService.delete(id));

  const items = useMemo(() => itemsPage?.content ?? [], [itemsPage]);

  const stats = useMemo(() => {
    const total = items.length;
    const inStock = items.filter((i) => i.status === 'IN_STOCK').length;
    const lowStock = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    return { total, inStock, lowStock, outOfStock, totalValue };
  }, [items]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItemDto) => {
    setEditingItem(item);
    setForm({
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

    const quantity = Number(form.quantity);
    if (quantity < 0) return;

    const data: CreateInventoryItemRequest | UpdateInventoryItemRequest = {
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

    if (editingItem) {
      await updateMutation.mutate({ id: editingItem.id, data: data as UpdateInventoryItemRequest });
    } else {
      // Для create нужен unitId - временно используем заглушку
      // В реальном сценарии нужно выбрать единицу измерения из справочника
      await createMutation.mutate({
        ...data,
        unitId: '00000000-0000-0000-0000-000000000000', // placeholder
      } as CreateInventoryItemRequest);
    }

    setIsModalOpen(false);
    await refetch();
  };

  const handleDelete = async (item: InventoryItemDto) => {
    if (item.quantity > 0) {
      alert('Нельзя удалить позицию с остатком больше 0. Сначала спишите остатки.');
      return;
    }
    if (!confirm(`Удалить позицию "${item.name}"?`)) return;

    await deleteMutation.mutate(item.id);
    await refetch();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const hasDirtyFilters = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/')}>
          На главную
        </Button>
        <Button icon={Plus} onClick={openCreateModal}>
          Добавить позицию
        </Button>
      </div>

      <div className="crm-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1f2530]">Инвентаризация</h1>
          </div>

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
                              onClick={() => openEditModal(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#467aff] transition-colors hover:bg-[#eef3ff]"
                              title="Редактировать"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
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
        <div className="space-y-4">
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
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Артикул (SKU)</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                className="crm-input"
                placeholder="Уникальный артикул"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Штрихкод</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                className="crm-input"
                placeholder="Штрихкод товара"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Бренд</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                className="crm-input"
                placeholder="Производитель"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Модель</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                className="crm-input"
                placeholder="Модель"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTracked"
                  checked={form.isTracked}
                  onChange={(e) => setForm((prev) => ({ ...prev, isTracked: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-[#467aff] focus:ring-[#467aff]"
                />
                <label htmlFor="isTracked" className="text-sm text-[#5d6676]">
                  Отслеживать остатки
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Поставщик</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                className="crm-input"
                placeholder="Название поставщика"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Контакт поставщика</label>
              <input
                type="text"
                value={form.supplierContact}
                onChange={(e) => setForm((prev) => ({ ...prev, supplierContact: e.target.value }))}
                className="crm-input"
                placeholder="Телефон / Email"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Заметки</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="crm-textarea resize-none"
              placeholder="Дополнительные заметки"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
