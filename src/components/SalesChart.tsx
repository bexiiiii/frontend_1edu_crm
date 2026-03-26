'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MoreVertical } from 'lucide-react';

const data = [
  { day: 'Mon', value: 15000 },
  { day: 'Tue', value: 20000 },
  { day: 'Wed', value: 18000 },
  { day: 'Thu', value: 22000 },
  { day: 'Fri', value: 19000 },
  { day: 'Sat', value: 24500, highlight: true },
  { day: 'Sun', value: 21000 },
];

export default function SalesChart() {
  return (
    <div className="crm-surface flex h-[335px] flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#1f2530]">Total Sales</h3>
        <button className="text-gray-300 hover:text-gray-500">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl">
                    <p className="text-xs font-medium mb-1">{payload[0].payload.day === 'Sat' ? '27 January' : payload[0].payload.day}</p>
                    <p className="text-sm font-bold">{(payload[0].value as number / 1000).toFixed(1)}K</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
            barSize={40}
          >
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={entry.highlight ? '#14b8a6' : '#ccfbf1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
