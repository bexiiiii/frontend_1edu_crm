'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { inventoryService } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function RevisionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    inventoryService
      .getRevision(id)
      .then((res) => setRevision(res?.data ?? res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <div>Неверный идентификатор ревизии</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#1f2530]">Проведение ревизии</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/inventory')}>
            Назад
          </Button>
        </div>
      </div>

      <div className="crm-surface p-5">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#467aff]" /> Загрузка...
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#7f8794]">ID ревизии: <span className="font-mono">{id}</span></p>
            <p className="mt-2 text-sm text-[#1f2530]">Статус: {revision?.status || '—'}</p>
            <p className="mt-2 text-sm text-[#7f8794]">Создано: {revision?.createdAt || '—'}</p>

            {(revision?.lines?.length > 0 || revision?.items?.length > 0) && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead className="crm-table-head">
                    <tr>
                      <th className="crm-table-th">#</th>
                      <th className="crm-table-th">Название</th>
                      <th className="crm-table-th">Текущий остаток</th>
                      <th className="crm-table-th">Фактический</th>
                      <th className="crm-table-th">Разница</th>
                    </tr>
                  </thead>
                  <tbody className="crm-table-body">
                    {(revision.lines || revision.items || []).map((it: any, idx: number) => (
                      <tr key={it.itemId} className="crm-table-row">
                        <td className="crm-table-cell">{idx + 1}</td>
                        <td className="crm-table-cell">{it.itemName || it.name}</td>
                        <td className="crm-table-cell">{it.systemQuantity ?? it.quantityBefore}</td>
                        <td className="crm-table-cell">{it.actualQuantity ?? it.quantityActual ?? '—'}</td>
                        <td className="crm-table-cell">{it.difference ?? ((it.actualQuantity ?? it.quantityActual) != null ? (it.actualQuantity ?? it.quantityActual) - (it.quantityBefore || 0) : '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
