'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface OrdersChartItem {
  name: string;
  value: number;
  color: string;
}

interface OrdersChartProps {
  data: OrdersChartItem[];
  total: number;
  loading?: boolean;
}

export default function OrdersChart({ data, total, loading = false }: OrdersChartProps) {
  const resolvedTotal = total || data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="crm-surface flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#1f2530]">Статусы абонементов</h3>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#dbe2e8] bg-[#f8fbfd] px-4 text-center text-sm text-[#7f8794]">
          Нет данных по абонементам за выбранный период.
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-gray-900">{resolvedTotal.toLocaleString('ru-RU')}</p>
              <p className="mt-1 text-center text-xs text-gray-500">
                Всего
                <br />
                абонементов
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-6">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
