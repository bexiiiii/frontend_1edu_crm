import { LucideIcon, MoreVertical, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  isPositive,
  icon: Icon,
  iconBgColor,
  iconColor,
  subtitle = 'From last weeks'
}: MetricCardProps) {
  return (
    <div className="crm-surface flex flex-col justify-between p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${iconBgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <button className="text-gray-300 hover:text-gray-500">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-[#1f2530]">{value}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{subtitle}</p>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-semibold">{change}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
