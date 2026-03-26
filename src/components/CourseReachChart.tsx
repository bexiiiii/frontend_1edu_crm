'use client';

import { MoreVertical } from 'lucide-react';

const platforms = ['Telegram', 'Instagram', 'Facebook', 'WhatsApp', 'YouTube'];
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Генерируем случайные данные для тепловой карты
const generateHeatmapData = () => {
  return platforms.map(() => 
    days.map(() => Math.floor(Math.random() * 4))
  );
};

const heatmapData = generateHeatmapData();

const getColor = (value: number) => {
  const colors = ['#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6'];
  return colors[value] || colors[0];
};

const getLegendLabel = (value: number) => {
  if (value === 0) return '0-5k';
  if (value === 1) return '5k-10k';
  if (value === 2) return '10k-50k';
  if (value === 3) return '50k+';
  return '50k+';
};

export default function CourseReachChart() {
  return (
    <div className="crm-surface flex h-[335px] flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#1f2530]">Product Reach</h3>
        <button className="text-gray-300 hover:text-gray-500">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {platforms.map((platform, platformIndex) => (
          <div key={platform} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-20 text-right">{platform}</span>
            <div className="flex gap-1.5 flex-1">
              {days.map((day, dayIndex) => (
                <div
                  key={`${platform}-${day}`}
                  className="flex-1 h-12 rounded-md transition-all hover:opacity-80 cursor-pointer"
                  style={{ backgroundColor: getColor(heatmapData[platformIndex][dayIndex]) }}
                  title={`${platform} - ${day}: ${getLegendLabel(heatmapData[platformIndex][dayIndex])}`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Days labels */}
        <div className="flex items-center gap-3 pt-2">
          <span className="w-20"></span>
          <div className="flex gap-1.5 flex-1">
            {days.map((day) => (
              <div key={day} className="flex-1 text-center text-xs text-gray-500">
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">Просмотры:</span>
          {[0, 1, 2, 3].map((value) => (
            <div key={value} className="flex items-center gap-1.5">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: getColor(value) }}
              />
              <span className="text-xs text-gray-600">{getLegendLabel(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
