'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MoreVertical } from 'lucide-react';

const data = [
  { name: 'Shipped', value: 3250, color: '#fbbf24' },
  { name: 'Delivered', value: 1680, color: '#14b8a6' },
  { name: 'Return', value: 500, color: '#ef4444' },
];

export default function OrdersChart() {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="crm-surface flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#1f2530]">Order Information</h3>
        <button className="text-gray-300 hover:text-gray-500">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
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
            <p className="text-4xl font-bold text-gray-900">{total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 text-center mt-1">Total Order<br />on this weeks</p>
          </div>
        </div>
      </div>

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
