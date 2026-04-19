'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  Crown,
  Download,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { analyticsService } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { downloadBlob } from '@/lib/download';
import { pushToast } from '@/lib/toast';
import {
  getAnalyticsPeriodOptions,
  getAnalyticsPeriodPresets,
  normalizeAnalyticsDateRange,
  type AnalyticsPeriodPreset,
} from '@/lib/analytics-periods';

type PresetState = AnalyticsPeriodPreset | 'custom';
type ClassTypeFilter = 'all' | 'group' | 'individual';

const classTypeOptions: { id: ClassTypeFilter; label: string }[] = [
  { id: 'all', label: 'Все типы' },
  { id: 'group', label: 'Групповые' },
  { id: 'individual', label: 'Индивидуальные' },
];

const toClassButtonClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-[#467aff] text-white' : 'bg-[#eef3f7] text-[#5f6a7a] hover:bg-[#e2eaf1]'
  }`;

const flowToneClass: Record<string, string> = {
  neutral: 'bg-[#edf2f5] text-[#5f6a7a]',
  up: 'bg-[#e9faf7] text-[#138f86]',
  down: 'bg-[#fff1f1] text-[#c34c4c]',
  accent: 'bg-[#ecf4ff] text-[#2a6cc8]',
};

const toMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₸`;

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const periodOptions = useMemo(() => getAnalyticsPeriodOptions(), []);
  const periodPresets = useMemo(() => getAnalyticsPeriodPresets(), []);
  const defaultRange = periodPresets.month;
  const [periodPreset, setPeriodPreset] = useState<PresetState>('month');
  const [classType, setClassType] = useState<ClassTypeFilter>('all');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [classFilter, setClassFilter] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: execData, loading } = useApi(
    () => analyticsService.getDashboard({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const d = execData;

  const studentTypeData = useMemo(() => [
    { name: 'Групповые', value: d?.activeGroupStudents ?? 0, color: '#467aff' },
    { name: 'Индивидуальные', value: d?.activeIndividualStudents ?? 0, color: '#4f9cff' },
  ], [d]);

  const filteredStudentTypeData = useMemo(() => {
    if (classType === 'group') return studentTypeData.filter((item) => item.name === 'Групповые');
    if (classType === 'individual') return studentTypeData.filter((item) => item.name === 'Индивидуальные');
    return studentTypeData;
  }, [classType, studentTypeData]);

  const kpiCards = useMemo(() => [
    { title: 'Посещаемость', value: `${d?.attendanceRate ?? 0}%`, sub: 'доля присутствий за период' },
    { title: 'Загрузка групп', value: `${d?.groupLoadRate ?? 0}%`, sub: 'ученики / вместимость' },
    { title: 'Конверсия пробных', value: `${d?.trialConversionRate ?? 0}%`, sub: `записано ${d?.trialScheduled ?? 0}, пришло ${d?.trialAttended ?? 0}` },
    { title: 'Средний чек', value: `${(d?.averageCheck ?? 0).toLocaleString('ru-RU')} KZT`, sub: `ARPU: ${(d?.arpu ?? 0).toLocaleString('ru-RU')} KZT` },
    { title: 'Проданные абонементы', value: String(d?.subscriptionsSold ?? 0), sub: `за выбранный период · Δ ${d?.subscriptionsDeltaPct ?? 0}%` },
  ], [d]);

  const flowCards = useMemo(() => [
    { icon: Users, title: 'На начало', value: String(d?.studentsAtStart ?? 0), delta: '', tone: 'neutral' },
    { icon: TrendingUp, title: 'Пришло', value: String(d?.studentsJoined ?? 0), delta: `${d?.studentsJoinedDeltaPct ?? 0}%`, tone: 'up' },
    { icon: TrendingDown, title: 'Ушло', value: String(d?.studentsLeft ?? 0), delta: `${d?.studentsLeftDeltaPct ?? 0}%`, tone: 'down' },
    { icon: CheckCircle2, title: 'На конец', value: String(d?.studentsAtEnd ?? 0), delta: '', tone: 'accent' },
    { icon: Activity, title: 'Изменение', value: String(d?.studentsDelta ?? 0), delta: `${d?.studentsDeltaPct ?? 0}%`, tone: 'up' },
  ] as { icon: LucideIcon; title: string; value: string; delta: string; tone: string }[], [d]);

  const leadContractData = useMemo(() => [
    { name: 'Лидов', value: d?.leadsTotal ?? 0 },
    { name: 'Договоров', value: d?.contractsTotal ?? 0 },
  ], [d]);

  const financeTriplet = useMemo(() => [
    { label: 'Доход', value: toMoney(d?.revenue ?? 0), icon: TrendingUp, toneClass: 'text-[#148f85]' },
    { label: 'Расход', value: toMoney(d?.expenses ?? 0), icon: TrendingDown, toneClass: 'text-[#c34c4c]' },
    { label: 'Прибыль', value: toMoney(d?.profit ?? 0), icon: DollarSign, toneClass: 'text-[#2a6cc8]' },
  ] as { label: string; value: string; icon: LucideIcon; toneClass: string }[], [d]);

  const attendanceByMonthData = useMemo(() => {
    if (!d?.monthlyAttendance) return [];
    return d.monthlyAttendance.map((m: { month: string; rate: number }) => ({ month: m.month, attendance: Math.round(m.rate) }));
  }, [d]);

  const joinedStudents = useMemo(() => {
    if (!d?.joinedStudents) return [];
    return d.joinedStudents;
  }, [d]);

  const leftStudents = useMemo(() => {
    if (!d?.leftStudents) return [];
    return d.leftStudents;
  }, [d]);

  const openStudentProfile = (studentId: string) => {
    if (!studentId) return;
    router.push(`/students/${studentId}`);
  };

  const applyPreset = (preset: AnalyticsPeriodPreset) => {
    const range = periodPresets[preset];
    setPeriodPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleFromDateChange = (nextFrom: string) => {
    const normalized = normalizeAnalyticsDateRange(nextFrom, toDate);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleToDateChange = (nextTo: string) => {
    const normalized = normalizeAnalyticsDateRange(fromDate, nextTo);
    setPeriodPreset('custom');
    setFromDate(normalized.from);
    setToDate(normalized.to);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);

    try {
      const { blob, filename } = await analyticsService.exportDashboard({
        from: fromDate,
        to: toDate,
        lessonType: 'ALL',
      });

      downloadBlob(blob, filename);
      pushToast({ message: 'Отчёт скачивается.', tone: 'success' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#202938]">Дашборд руководителя</h2>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading}
          >
            {isDownloading ? 'Скачиваем...' : 'Скачать отчёт'}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className={toClassButtonClass(periodPreset === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="crm-select"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="crm-select"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="crm-select"
          >
            <option value="all">Все занятия</option>
            <option value="english">Английский</option>
            <option value="math">Математика</option>
            <option value="programming">Программирование</option>
          </select>
          <div className="flex flex-wrap gap-2">
            {classTypeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setClassType(option.id)}
                className={toClassButtonClass(classType === option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
        </div>
      ) : (
      <>
      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Сводка по ключевым метрикам</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <div key={card.title} className="crm-surface-soft rounded-xl p-4">
              <p className="text-sm text-[#7f8794]">{card.title}</p>
              <p className="mt-2 text-xl font-bold text-[#1f2530]">{card.value}</p>
              <p className="mt-1 text-xs text-[#8a93a3]">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {flowCards.map((card) => {
          const Icon = card.icon;
          return (
          <div key={card.title} className="crm-surface p-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${flowToneClass[card.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm text-[#7f8794]">{card.title}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1f2530]">{card.value}</p>
            {card.delta ? (
              <p
                className={`mt-1 text-xs font-semibold ${
                  card.tone === 'down' ? 'text-[#c34c4c]' : 'text-[#14a094]'
                }`}
              >
                {card.delta}
              </p>
            ) : null}
          </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Активные ученики по типу занятий</h3>
          <div className="mt-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredStudentTypeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {filteredStudentTypeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Динамика клиентов</h3>
          <div className="mt-4 flex h-[250px] items-center justify-center rounded-lg border border-dashed border-[#d5dee8] text-sm text-[#8a93a3]">
            Данные по динамике клиентов недоступны
          </div>
        </div>

        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Лучший сотрудник периода</h3>
          <div className="mt-4 rounded-xl bg-[#f7fafc] p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff7df] text-[#b8891f]">
              <Crown className="h-4 w-4" />
            </span>
            <p className="mt-1 text-lg font-bold text-[#1f2530]">{d?.topEmployee?.fullName ?? '—'}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#7f8794]">Выручка</span>
                <span className="font-semibold text-[#1f2530]">{toMoney(d?.topEmployee?.revenue ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7f8794]">Активные уч-ки</span>
                <span className="font-semibold text-[#1f2530]">{d?.topEmployee?.activeStudents ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {financeTriplet.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.label} className="rounded-lg bg-[#f4f8fb] p-2 text-center">
                <p className={`inline-flex items-center gap-1 text-xs ${item.toneClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1f2530]">{item.value}</p>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Лиды → Договоры</h3>
          <p className="mt-2 text-sm text-[#7f8794]">Лидов {d?.leadsTotal ?? 0} · Δ {d?.leadsDeltaPct ?? 0}% к пр. периоду</p>
          <p className="mt-1 text-sm text-[#7f8794]">Договоров {d?.contractsTotal ?? 0} · Конверсия {d?.leadsToContractsConversion ?? 0}%</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadContractData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill="#467aff" />
                  <Cell fill="#4f9cff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Среднее удержание (M+1)</h3>
          <p className="mt-2 text-2xl font-bold text-[#1f2530]">{d?.retentionM1Rate ?? 0}%</p>
          <p className="mt-1 text-sm text-[#14a094]">Δ {(d?.retentionM1Delta ?? 0) >= 0 ? '+' : ''}{d?.retentionM1Delta ?? 0}%</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceByMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#7dd3fc" fill="#e0f2fe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="crm-surface p-5">
          <h3 className="text-base font-semibold text-[#202938]">Посещаемость по месяцам</h3>
          <p className="mt-2 text-sm text-[#7f8794]">Текущий месяц</p>
          <p className="text-2xl font-bold text-[#1f2530]">{d?.currentMonthAttendance ?? 0}%</p>
          <p className="mt-1 text-sm font-semibold text-[#14a094]">Δ {(d?.currentMonthAttendanceDelta ?? 0) >= 0 ? '+' : ''}{d?.currentMonthAttendanceDelta ?? 0}%</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceByMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis domain={[85, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Посещаемость']} />
                <Line type="monotone" dataKey="attendance" stroke="#467aff" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Списки: пришли и ушли</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="crm-surface-soft rounded-xl p-4">
            <p className="text-sm font-semibold text-[#202938]">Пришли ({joinedStudents.length})</p>
            <div className="mt-3 space-y-2">
              {joinedStudents.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-[#d5dee8] bg-white text-sm text-[#8a93a3]">
                  Нет данных
                </div>
              ) : joinedStudents.map((student) => (
                <div
                  key={student.studentId || student.fullName}
                  className="flex items-center justify-between rounded-lg border border-[#e2e8ee] bg-white px-3 py-2"
                >
                  <span className="text-sm text-[#273142]">{student.fullName}</span>
                  <button
                    type="button"
                    onClick={() => openStudentProfile(student.studentId)}
                    disabled={!student.studentId}
                    className="rounded-md bg-[#eef3f7] px-2 py-1 text-xs font-semibold text-[#566273] transition-colors hover:bg-[#dde7f0]"
                  >
                    Открыть
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="crm-surface-soft rounded-xl p-4">
            <p className="text-sm font-semibold text-[#202938]">Ушли ({leftStudents.length})</p>
            <div className="mt-3 space-y-2">
              {leftStudents.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-[#d5dee8] bg-white text-sm text-[#8a93a3]">
                  Нет данных
                </div>
              ) : leftStudents.map((student) => (
                <div
                  key={student.studentId || student.fullName}
                  className="flex items-center justify-between rounded-lg border border-[#e2e8ee] bg-white px-3 py-2"
                >
                  <span className="text-sm text-[#273142]">{student.fullName}</span>
                  <button
                    type="button"
                    onClick={() => openStudentProfile(student.studentId)}
                    disabled={!student.studentId}
                    className="rounded-md bg-[#eef3f7] px-2 py-1 text-xs font-semibold text-[#566273] transition-colors hover:bg-[#dde7f0]"
                  >
                    Открыть
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
