'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { inventoryService } from '@/lib/api';
import type { InventoryItemDto, InventoryRevisionItemRequest } from '@/lib/api';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return '0';
  return String(value);
}

export default function InventoryRevisionCreatePage() {
  const router = useRouter();
  const today = useMemo(() => toDateInputValue(new Date()), []);

  const [revisionDate, setRevisionDate] = useState(today);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState(today);
  const [notes, setNotes] = useState('');
  const [actualByItem, setActualByItem] = useState<Record<string, string>>({});
  const [lineNotesByItem, setLineNotesByItem] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: itemsPage,
    loading,
    error,
  } = useApi(() => inventoryService.getAll({ page: 0, size: 200 }), []);

  const items: InventoryItemDto[] = useMemo(() => itemsPage?.content ?? [], [itemsPage]);

  const getActualValue = (item: InventoryItemDto): string => {
    const typedValue = actualByItem[item.id];
    if (typedValue !== undefined) {
      return typedValue;
    }
    return formatQty(item.quantity);
  };

  const hasInvalidValues = items.some((item) => {
    const value = getActualValue(item).trim();
    if (!value) return true;
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed < 0;
  });

  const handleSubmit = async () => {
    if (!revisionDate || hasInvalidValues) {
      alert('Проверьте дату ревизии и фактические остатки.');
      return;
    }

    const payloadItems: InventoryRevisionItemRequest[] = items.map((item) => ({
      itemId: item.id,
      actualQuantity: Number(getActualValue(item)),
      notes: lineNotesByItem[item.id]?.trim() || undefined,
    }));

    try {
      setSaving(true);
      const result = await inventoryService.conductRevision({
        revisionDate,
        periodFrom: periodFrom || undefined,
        periodTo: periodTo || undefined,
        notes: notes.trim() || undefined,
        items: payloadItems,
      });

      const revisionId = result?.data?.revisionId;
      if (revisionId) {
        router.push(`/inventory/revision/${revisionId}`);
        return;
      }

      alert('Ревизия проведена, но ID не вернулся.');
      router.push('/inventory');
    } catch (err) {
      console.error('conduct revision error', err);
      alert('Не удалось провести ревизию');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#1f2530]">Проведение ревизии</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/inventory')}>
            Отмена
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || loading || items.length === 0 || hasInvalidValues}>
            {saving ? 'Сохраняем...' : 'Провести ревизию'}
          </Button>
        </div>
      </div>

      <div className="crm-surface p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Дата ревизии</label>
            <input
              type="date"
              value={revisionDate}
              onChange={(e) => setRevisionDate(e.target.value)}
              className="crm-input"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Период с (опционально)</label>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="crm-input"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Период по (опционально)</label>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="crm-input"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Комментарий</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="crm-input"
              placeholder="Плановая ревизия"
            />
          </div>
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
            Позиции для ревизии: <span className="font-semibold text-[#1f2530]">{items.length}</span>
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
                  <th className="crm-table-th">Товар</th>
                  <th className="crm-table-th">Ед.</th>
                  <th className="crm-table-th">Системный остаток</th>
                  <th className="crm-table-th">Фактический остаток</th>
                  <th className="crm-table-th">Комментарий</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {items.map((item) => (
                  <tr key={item.id} className="crm-table-row">
                    <td className="crm-table-cell">
                      <div className="font-medium text-[#1f2530]">{item.name}</div>
                      {item.sku && <div className="text-xs text-[#7f8794]">SKU: {item.sku}</div>}
                    </td>
                    <td className="crm-table-cell">{item.unitAbbreviation || '—'}</td>
                    <td className="crm-table-cell">{item.quantity}</td>
                    <td className="crm-table-cell">
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={getActualValue(item)}
                        onChange={(e) =>
                          setActualByItem((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="crm-input"
                      />
                    </td>
                    <td className="crm-table-cell">
                      <input
                        type="text"
                        value={lineNotesByItem[item.id] || ''}
                        onChange={(e) =>
                          setLineNotesByItem((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="crm-input"
                        placeholder="Причина расхождения"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
