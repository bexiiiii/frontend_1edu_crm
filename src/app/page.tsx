'use client';

import { useMemo } from 'react';
import { ReceiptText, ShoppingCart, Users, Package } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import SalesChart from '@/components/SalesChart';
import OrdersChart from '@/components/OrdersChart';
import CourseReachChart from '@/components/CourseReachChart';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

export default function Dashboard() {
  const { from, to } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: start.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    };
  }, []);

  const { data: dashboard, loading } = useApi(() => analyticsService.getDashboard({ from, to }), [from, to]);
  const { data: today } = useApi(() => analyticsService.getToday(), []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:col-span-2">
          <MetricCard
            title="Общий доход"
            value={loading ? '...' : `${(dashboard?.revenue ?? 0).toLocaleString('ru-RU')} ₸`}
            change={`${dashboard?.revenueDeltaPct ?? 0}%`}
            isPositive={(dashboard?.revenueDeltaPct ?? 0) >= 0}
            icon={ReceiptText}
            iconBgColor="bg-teal-50"
            iconColor="text-teal-600"
          />
          <MetricCard
            title="Средний чек"
            value={loading ? '...' : `${(dashboard?.averageCheck ?? 0).toLocaleString('ru-RU')} ₸`}
            change={`${dashboard?.subscriptionsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.subscriptionsDeltaPct ?? 0) >= 0}
            icon={ShoppingCart}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <MetricCard
            title="Всего учеников"
            value={loading ? '...' : String(dashboard?.studentsAtEnd ?? 0)}
            change={`${dashboard?.studentsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.studentsDeltaPct ?? 0) >= 0}
            icon={Users}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <MetricCard
            title="Активные ученики (группы)"
            value={loading ? '...' : String(dashboard?.activeGroupStudents ?? 0)}
            change={`${dashboard?.leadsDeltaPct ?? 0}%`}
            isPositive={(dashboard?.leadsDeltaPct ?? 0) >= 0}
            icon={Package}
            iconBgColor="bg-pink-50"
            iconColor="text-pink-600"
          />
        </div>

        <div className="xl:col-span-1">
          <OrdersChart />
        </div>
      </div>

      {today && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Уроков сегодня</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.conductedLessons ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Присутствовало</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.attendedStudents ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Новые записи</p>
            <p className="text-2xl font-bold text-[#1f2530]">{today.newEnrollments ?? 0}</p>
          </div>
          <div className="crm-surface p-4">
            <p className="text-sm text-gray-500">Доход сегодня</p>
            <p className="text-2xl font-bold text-[#1f2530]">{(today.todayRevenue ?? 0).toLocaleString('ru-RU')} ₸</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>
        <div className="xl:col-span-1">
          <CourseReachChart />
        </div>
      </div>
    </div>
  );
}
