'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { MOCK_CLASSES, CLASS_TYPES, CLASS_STATUSES, CLASS_FORMATS } from '@/constants/class';
import { MOCK_STUDENTS } from '@/constants/student';

type ClassTabId = 'subscriptions' | 'participants' | 'completed' | 'schedule';

type ParticipantRow = {
  id: string;
  name: string;
  phone: string;
  customer: string;
  visits: number;
  balance: number;
};

const classTabs: { id: ClassTabId; label: string }[] = [
  { id: 'subscriptions', label: 'Абонементы' },
  { id: 'participants', label: 'Участники' },
  { id: 'completed', label: 'Проведенные занятия' },
  { id: 'schedule', label: 'Расписание' },
];

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classIdParam = params.classId;
  const classId = Array.isArray(classIdParam) ? classIdParam[0] : classIdParam;
  const [activeTab, setActiveTab] = useState<ClassTabId>('subscriptions');

  const classItem = useMemo(() => {
    if (!classId) return null;
    return MOCK_CLASSES.find((item) => item.id === classId) ?? null;
  }, [classId]);

  const participantRows = useMemo<ParticipantRow[]>(() => {
    if (!classItem || classItem.students <= 0) {
      return [];
    }

    return Array.from({ length: classItem.students }, (_, index) => {
      const base = MOCK_STUDENTS[index % MOCK_STUDENTS.length];
      const primaryPhone = base.phones.find((phone) => phone.isPrimary)?.number ?? base.phones[0]?.number ?? '—';
      const displayName =
        index < MOCK_STUDENTS.length ? base.fullName : `${base.fullName} ${index + 1}`;

      return {
        id: `${classItem.id}-participant-${index + 1}`,
        name: displayName,
        phone: primaryPhone,
        customer: base.customer ?? '—',
        visits: 6 + (index % 8),
        balance: base.balance,
      };
    });
  }, [classItem]);

  const typeLabel = classItem ? CLASS_TYPES.find((item) => item.value === classItem.type)?.label ?? '—' : '—';
  const statusConfig = classItem
    ? CLASS_STATUSES.find((item) => item.value === classItem.status)
    : undefined;
  const formatLabel = classItem
    ? CLASS_FORMATS.find((item) => item.value === classItem.format)?.label ?? '—'
    : '—';

  const subscriptionRows = useMemo(() => {
    return participantRows.map((participant, index) => {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30 + index * 3);

      return {
        id: `subscription-${participant.id}`,
        student: participant.name,
        plan: classItem?.type === 'group' ? 'Стандарт 12 занятий' : 'Индивидуальный 8 занятий',
        remaining: Math.max(1, 12 - (index % 7)),
        validUntil: formatDate(validUntil),
        status: index % 4 === 0 ? 'Заканчивается' : 'Активен',
      };
    });
  }, [participantRows, classItem]);

  const completedLessonRows = useMemo(() => {
    if (!classItem) return [];

    return Array.from({ length: 8 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index * 2 - 1);
      const teacher = classItem.teachers[index % classItem.teachers.length] ?? '—';
      const presentCount = Math.max(0, classItem.students - (index % 3));

      return {
        id: `completed-${classItem.id}-${index + 1}`,
        date: formatDate(date),
        time: classItem.type === 'group' ? '15:00 - 16:30' : '17:00 - 18:00',
        topic: `${classItem.name}: Урок ${index + 1}`,
        teacher,
        attendance: `${presentCount}/${classItem.students}`,
      };
    });
  }, [classItem]);

  const scheduleRows = useMemo(() => {
    if (!classItem) return [];

    const groupDays = ['Пн', 'Ср', 'Пт'];
    const individualDays = ['Вт', 'Чт'];
    const days = classItem.type === 'group' ? groupDays : individualDays;

    return days.map((day, index) => ({
      id: `schedule-${classItem.id}-${day}`,
      day,
      time: classItem.type === 'group' ? '15:00 - 16:30' : '17:00 - 18:00',
      room: classItem.room ?? 'Онлайн',
      teacher: classItem.teachers[index % classItem.teachers.length] ?? '—',
      format: formatLabel,
    }));
  }, [classItem, formatLabel]);

  if (!classItem) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/classes')}>
          Назад к занятиям
        </Button>
        <div className="crm-surface p-6 text-sm text-[#7f8794]">Курс не найден</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => router.push('/classes')}>
        Назад к занятиям
      </Button>

      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: classItem.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-[#1f2530]">{classItem.name}</h2>
              <p className="mt-1 truncate text-sm text-[#7f8794]">{classItem.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#eaf5ff] px-3 py-1 text-xs font-semibold text-[#2a6cc8]">
              {typeLabel}
            </span>
            <span
              className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                statusConfig?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {statusConfig?.label ?? '—'}
            </span>
            <span className="rounded-lg bg-[#e9faf7] px-3 py-1 text-xs font-semibold text-[#138f86]">
              Учеников: {classItem.students}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e6ebf0] pt-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Преподаватели</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{classItem.teachers.join(', ')}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Кабинет</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{classItem.room ?? 'Онлайн'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Формат</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">{formatLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Базовая цена</p>
            <p className="mt-1 text-sm font-semibold text-[#273142]">
              {classItem.basePrice.toLocaleString('ru-RU')} ₸
            </p>
          </div>
        </div>
      </div>

      <div className="crm-surface p-4">
        <Tabs
          tabs={classTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as ClassTabId)}
          className="w-fit"
          aria-label="Вкладки курса"
        />
      </div>

      {activeTab === 'subscriptions' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              Абонементов: <span className="font-semibold text-gray-900">{subscriptionRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Ученик</th>
                  <th className="crm-table-th">Абонемент</th>
                  <th className="crm-table-th">Осталось</th>
                  <th className="crm-table-th">Действует до</th>
                  <th className="crm-table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {subscriptionRows.length > 0 ? (
                  subscriptionRows.map((row, index) => (
                    <tr key={row.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell font-medium text-[#273142]">{row.student}</td>
                      <td className="crm-table-cell">{row.plan}</td>
                      <td className="crm-table-cell">{row.remaining}</td>
                      <td className="crm-table-cell">{row.validUntil}</td>
                      <td className="crm-table-cell">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            row.status === 'Активен'
                              ? 'border-green-200 bg-green-100 text-green-700'
                              : 'border-amber-200 bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Нет абонементов для этого курса
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              Участников: <span className="font-semibold text-gray-900">{participantRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Ученик</th>
                  <th className="crm-table-th">Телефон</th>
                  <th className="crm-table-th">Заказчик</th>
                  <th className="crm-table-th">Посещений</th>
                  <th className="crm-table-th">Баланс</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {participantRows.length > 0 ? (
                  participantRows.map((row, index) => (
                    <tr key={row.id} className="crm-table-row">
                      <td className="crm-table-cell">{index + 1}</td>
                      <td className="crm-table-cell font-medium text-[#273142]">{row.name}</td>
                      <td className="crm-table-cell">{row.phone}</td>
                      <td className="crm-table-cell">{row.customer}</td>
                      <td className="crm-table-cell">{row.visits}</td>
                      <td className="crm-table-cell">
                        <span className={row.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {row.balance.toLocaleString('ru-RU')} ₸
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={6} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Участников пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              Проведено занятий: <span className="font-semibold text-gray-900">{completedLessonRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Дата</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Тема</th>
                  <th className="crm-table-th">Преподаватель</th>
                  <th className="crm-table-th">Посещаемость</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {completedLessonRows.map((row, index) => (
                  <tr key={row.id} className="crm-table-row">
                    <td className="crm-table-cell">{index + 1}</td>
                    <td className="crm-table-cell">{row.date}</td>
                    <td className="crm-table-cell">{row.time}</td>
                    <td className="crm-table-cell font-medium text-[#273142]">{row.topic}</td>
                    <td className="crm-table-cell">{row.teacher}</td>
                    <td className="crm-table-cell">{row.attendance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="border-b border-[#e6ebf0] px-6 py-4">
            <p className="text-sm font-medium text-gray-700">
              Дней в расписании: <span className="font-semibold text-gray-900">{scheduleRows.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">День</th>
                  <th className="crm-table-th">Время</th>
                  <th className="crm-table-th">Кабинет</th>
                  <th className="crm-table-th">Преподаватель</th>
                  <th className="crm-table-th">Формат</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {scheduleRows.map((row, index) => (
                  <tr key={row.id} className="crm-table-row">
                    <td className="crm-table-cell">{index + 1}</td>
                    <td className="crm-table-cell">{row.day}</td>
                    <td className="crm-table-cell">{row.time}</td>
                    <td className="crm-table-cell">{row.room}</td>
                    <td className="crm-table-cell">{row.teacher}</td>
                    <td className="crm-table-cell">{row.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
