'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface SalesChartPoint {
  label: string;
  value: number;
}

interface SalesChartProps {
  data: SalesChartPoint[];
  loading?: boolean;
}

function formatCompactMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }

  return value.toLocaleString('ru-RU');
}

export default function SalesChart({ data, loading = false }: SalesChartProps) {
  return (
    <div className="crm-surface flex h-[335px] flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#1f2530]">Продажи по месяцам</h3>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#dbe2e8] bg-[#f8fbfd] px-4 text-center text-sm text-[#7f8794]">
            Нет данных по продажам за выбранный период.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => formatCompactMoney(Number(value))}
              />
              <Tooltip
                cursor={{ fill: 'rgba(70, 122, 255, 0.08)' }}
                formatter={(value) => [`${Number(value).toLocaleString('ru-RU')} ₸`, 'Выручка']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.label}-${index}`}
                    fill={index === data.length - 1 ? '#467aff' : '#dbe7ff'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
