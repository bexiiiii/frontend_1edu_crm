import { analyticsService } from '@/lib/api';
import { ATTENDANCE_STATUS_LABELS } from '@/constants/attendance';
import { STUDENT_STATUS_LABELS } from '@/constants/student';
import type { AttendanceStatus, StudentStatus } from '@/lib/api/types';
import {
  formatExcelDate,
  listMonthsInRange,
  mapWithConcurrency,
  type ExcelExportPeriod,
  type ExcelSheet,
} from '@/lib/excel-export';

/**
 * Excel builders for analytics pages. Each one calls the same analytics endpoint the
 * page uses (same axios instance → same auth / branch headers) for the chosen period
 * and lays out the figures/tables the page shows.
 */

type Range = { from: string; to: string };

const range = (period: ExcelExportPeriod): Range => ({ from: period.from, to: period.to });

/** For «весь период» drop leading months with no data so the sheet starts at real activity. */
function trimLeadingEmpty<T>(rows: T[], period: ExcelExportPeriod, isEmpty: (row: T) => boolean): T[] {
  if (!period.allTime) return rows;
  const firstIndex = rows.findIndex((row) => !isEmpty(row));
  return firstIndex === -1 ? [] : rows.slice(firstIndex);
}

// ─── Дашборд руководителя ───────────────────────────────────────

export async function buildDashboardSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data: d } = await analyticsService.getDashboard(range(period));

  const monthly = trimLeadingEmpty(d?.monthlyAttendance ?? [], period, (m) => !m.rate);

  return [
    {
      name: 'Сводка',
      tables: [
        {
          title: 'Ключевые метрики',
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }, { header: 'Ед.' }],
          rows: [
            ['Посещаемость', d?.attendanceRate, '%'],
            ['Загрузка групп', d?.groupLoadRate, '%'],
            ['Пробных записано', d?.trialScheduled, 'шт.'],
            ['Пробных пришло', d?.trialAttended, 'шт.'],
            ['Конверсия пробных', d?.trialConversionRate, '%'],
            ['Средний чек', d?.averageCheck, '₸'],
            ['ARPU', d?.arpu, '₸'],
            ['Проданные абонементы', d?.subscriptionsSold, 'шт.'],
            ['Изменение продаж абонементов', d?.subscriptionsDeltaPct, '%'],
          ],
        },
        {
          title: 'Финансы',
          columns: [{ header: 'Показатель' }, { header: 'Сумма, ₸', type: 'money' }],
          rows: [
            ['Доход', d?.revenue],
            ['Расход', d?.expenses],
            ['Прибыль', d?.profit],
          ],
        },
        {
          title: 'Динамика клиентов',
          columns: [{ header: 'Показатель' }, { header: 'Учеников', type: 'number' }, { header: 'Изменение, %', type: 'percent' }],
          rows: [
            ['На начало', d?.studentsAtStart, null],
            ['Пришло', d?.studentsJoined, d?.studentsJoinedDeltaPct],
            ['Ушло', d?.studentsLeft, d?.studentsLeftDeltaPct],
            ['На конец', d?.studentsAtEnd, null],
            ['Изменение', d?.studentsDelta, d?.studentsDeltaPct],
          ],
        },
        {
          title: 'Активные ученики по типу занятий',
          columns: [{ header: 'Тип занятий' }, { header: 'Учеников', type: 'number' }],
          rows: [
            ['Групповые', d?.activeGroupStudents],
            ['Индивидуальные', d?.activeIndividualStudents],
          ],
        },
        {
          title: 'Лиды и удержание',
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }, { header: 'Ед.' }],
          rows: [
            ['Лидов', d?.leadsTotal, 'шт.'],
            ['Договоров', d?.contractsTotal, 'шт.'],
            ['Конверсия лидов в договоры', d?.leadsToContractsConversion, '%'],
            ['Среднее удержание (M+1)', d?.retentionM1Rate, '%'],
            ['Изменение удержания (M+1)', d?.retentionM1Delta, '%'],
            ['Посещаемость текущего месяца', d?.currentMonthAttendance, '%'],
          ],
        },
        {
          title: 'Лучший сотрудник периода',
          columns: [
            { header: 'Сотрудник' },
            { header: 'Выручка, ₸', type: 'money' },
            { header: 'Изменение выручки, %', type: 'percent' },
            { header: 'Загрузка групп, %', type: 'percent' },
            { header: 'Активные ученики', type: 'number' },
            { header: 'Индекс', type: 'number' },
          ],
          rows: d?.topEmployee?.fullName
            ? [[
                d.topEmployee.fullName,
                d.topEmployee.revenue,
                d.topEmployee.revenueDeltaPct,
                d.topEmployee.groupLoadRate,
                d.topEmployee.activeStudents,
                d.topEmployee.index,
              ]]
            : [],
        },
      ],
    },
    {
      name: 'Посещаемость по месяцам',
      tables: [
        {
          columns: [{ header: 'Месяц' }, { header: 'Посещаемость, %', type: 'percent' }],
          rows: monthly.map((m) => [m.month, m.rate]),
        },
      ],
    },
    {
      name: 'Пришли и ушли',
      tables: [
        {
          title: `Пришли (${d?.joinedStudents?.length ?? 0})`,
          columns: [{ header: '№', type: 'number' }, { header: 'Ученик' }],
          rows: (d?.joinedStudents ?? []).map((s, i) => [i + 1, s.fullName]),
        },
        {
          title: `Ушли (${d?.leftStudents?.length ?? 0})`,
          columns: [{ header: '№', type: 'number' }, { header: 'Ученик' }],
          rows: (d?.leftStudents ?? []).map((s, i) => [i + 1, s.fullName]),
        },
      ],
    },
  ];
}

// ─── Финансовый отчет ───────────────────────────────────────────

export async function buildFinanceSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data: d } = await analyticsService.getFinanceReport(range(period));
  const r = d?.reconciliation;

  const monthly = trimLeadingEmpty(d?.monthly ?? [], period, (m) => !m.revenue && !m.expenses);
  const categoryColumns = [{ header: 'Статья' }, { header: 'Сумма, ₸', type: 'money' as const }];

  return [
    {
      name: 'Сводка',
      tables: [
        {
          title: 'Итоги',
          columns: [{ header: 'Показатель' }, { header: 'Сумма, ₸', type: 'money' }, { header: 'Изменение, %', type: 'percent' }],
          rows: [
            ['Доходы', d?.revenue, d?.revenueDeltaPct],
            ['Расходы', d?.expenses, d?.expensesDeltaPct],
            ['Чистая прибыль', d?.profit, d?.profitDeltaPct],
          ],
        },
        {
          title: 'Сверка с абонементами за период',
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }],
          rows: r
            ? [
                ['Сумма абонементов, ₸', r.totalSubscriptionAmount],
                ['Выручка по абонементам, ₸', r.revenueFromSubscriptions],
                ['Оплачено до периода, ₸', r.paidBeforePeriod],
                ['Долг по абонементам, ₸', r.debtFromSubscriptions],
                ['Покрытие оплатой, %', r.coverageRate],
                ['Оплачено после периода, ₸', r.paidAfterPeriod],
                ['Платежи до периода, шт.', r.paidBeforePeriodPayments],
                ['Выручка не по абонементам, ₸', r.revenueNotFromSubscriptions],
                ['Учеников без оплат', r.studentsWithoutPayments],
                ['Абонементов без оплат', r.subscriptionsWithoutPayments],
              ]
            : [],
        },
      ],
    },
    {
      name: 'Динамика по месяцам',
      tables: [
        {
          columns: [
            { header: 'Месяц' },
            { header: 'Доходы, ₸', type: 'money' },
            { header: 'Расходы, ₸', type: 'money' },
            { header: 'Прибыль, ₸', type: 'money' },
          ],
          rows: monthly.map((m) => [m.label || m.month, m.revenue ?? 0, m.expenses ?? 0, m.profit ?? 0]),
        },
      ],
    },
    {
      name: 'Доходы',
      tables: [
        {
          title: 'Доходы по статьям',
          columns: categoryColumns,
          rows: (d?.revenueByCategory ?? []).map((c) => [c.category, c.amount]),
        },
        {
          title: 'Доходы по источникам',
          columns: [{ header: 'Источник' }, { header: 'Сумма, ₸', type: 'money' }],
          rows: (d?.revenueBySource ?? []).map((c) => [c.category, c.amount]),
        },
        {
          title: 'Доходы по группам',
          columns: [{ header: 'Группа' }, { header: 'Сумма, ₸', type: 'money' }],
          rows: (d?.revenueByGroup ?? []).map((g) => [g.groupName, g.revenue]),
        },
      ],
    },
    {
      name: 'Расходы',
      tables: [
        {
          columns: categoryColumns,
          rows: (d?.expensesByCategory ?? []).map((c) => [c.category, c.amount]),
        },
      ],
    },
  ];
}

// ─── Абонементы ─────────────────────────────────────────────────

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  EXPIRED: 'Истек',
  CANCELLED: 'Отменен',
  FROZEN: 'Заморожен',
};

export async function buildSubscriptionsSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getSubscriptions(range(period));
  const rows = data?.rows ?? [];
  const totalAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  return [
    {
      name: 'Абонементы',
      tables: [
        {
          columns: [
            { header: 'Клиент' },
            { header: 'Услуга' },
            { header: 'Стоимость, ₸', type: 'money' },
            { header: 'Статус' },
            { header: 'Создан', type: 'date' },
            { header: 'Начало действия', type: 'date' },
            { header: 'Всего занятий', type: 'number' },
            { header: 'Осталось занятий', type: 'number' },
            { header: 'Посещений', type: 'number' },
          ],
          rows: rows.map((s) => [
            s.studentName || s.studentId || '—',
            s.serviceName || '—',
            s.amount ?? 0,
            SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status,
            s.createdDate,
            s.startDate,
            s.totalLessons,
            s.lessonsLeft,
            s.attendanceCount,
          ]),
        },
      ],
    },
    {
      name: 'Итого',
      tables: [
        {
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }],
          rows: [
            ['Итого, ₸', totalAmount],
            ['Количество абонементов', rows.length],
          ],
        },
      ],
    },
  ];
}

// ─── Преподаватели ──────────────────────────────────────────────

export async function buildTeachersSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getTeachers(range(period));
  const rows = data?.rows ?? [];
  const top = data?.topEmployee;

  return [
    {
      name: 'Преподаватели',
      tables: [
        {
          columns: [
            { header: 'Преподаватель' },
            { header: 'Активные уч-ки', type: 'number' },
            { header: 'Продано абонементов (период)', type: 'number' },
            { header: 'Уч-ки (период)', type: 'number' },
            { header: 'Выручка (период), ₸', type: 'money' },
            { header: 'Δ к пред. пер., %', type: 'percent' },
            { header: 'Уч-ки всего', type: 'number' },
            { header: 'Срок (ср., мес.)', type: 'number' },
            { header: 'Срок (сумм., мес.)', type: 'number' },
            { header: 'Загрузка групп, %', type: 'percent' },
            { header: 'Индекс', type: 'number' },
          ],
          rows: rows.map((r) => [
            r.fullName,
            r.activeStudents,
            r.subscriptionsSold,
            r.studentsInPeriod,
            r.revenue,
            r.revenueDeltaPct,
            r.totalStudents,
            r.avgTenureMonths,
            r.totalTenureMonths,
            r.groupLoadRate,
            r.index,
          ]),
        },
      ],
    },
    {
      name: 'Лучший сотрудник',
      tables: [
        {
          columns: [
            { header: 'Сотрудник' },
            { header: 'Выручка, ₸', type: 'money' },
            { header: 'Изменение выручки, %', type: 'percent' },
            { header: 'Загрузка групп, %', type: 'percent' },
            { header: 'Активные ученики', type: 'number' },
            { header: 'Индекс', type: 'number' },
          ],
          rows: top?.fullName
            ? [[top.fullName, top.revenue, top.revenueDeltaPct, top.groupLoadRate, top.activeStudents, top.index]]
            : [],
        },
      ],
    },
  ];
}

// ─── Удержание ──────────────────────────────────────────────────

export async function buildRetentionSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getRetention(range(period));
  const cohorts = trimLeadingEmpty(data?.cohorts ?? [], period, (c) => !c.size);

  return [
    {
      name: 'Когорты',
      tables: [
        {
          columns: [
            { header: 'Когорта' },
            { header: 'Размер', type: 'number' },
            ...Array.from({ length: 6 }, (_, i) => ({ header: `M+${i}, %`, type: 'percent' as const })),
          ],
          rows: cohorts.map((c) => [c.cohort, c.size, c.m0, c.m1, c.m2, c.m3, c.m4, c.m5]),
        },
      ],
    },
  ];
}

// ─── Загрузка групп ─────────────────────────────────────────────

const calcLoadPercent = (students: number, capacity: number) => {
  if (students <= 0) return 0;
  return Math.round((students / (capacity > 0 ? capacity : 1)) * 100);
};

export async function buildGroupLoadSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getGroupLoad(range(period));
  const rows = (data?.rows ?? []).map((r) => ({
    name: r.groupName,
    students: r.studentsCount,
    capacity: r.capacity,
    load: calcLoadPercent(r.studentsCount, r.capacity),
  }));
  const total = rows.length;
  const avgLoad = total > 0 ? Math.round(rows.reduce((acc, row) => acc + row.load, 0) / total) : 0;

  return [
    {
      name: 'Загрузка групп',
      tables: [
        {
          columns: [
            { header: 'Группа' },
            { header: 'Уч-ков в группе', type: 'number' },
            { header: 'Вместимость', type: 'number' },
            { header: 'Загрузка, %', type: 'percent' },
          ],
          rows: [...rows].sort((a, b) => b.load - a.load).map((r) => [r.name, r.students, r.capacity, r.load]),
        },
      ],
    },
    {
      name: 'Итоги',
      tables: [
        {
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }],
          rows: [
            ['Всего групп', total],
            ['Средняя загрузка, %', avgLoad],
            ['Перегружено (>100%)', rows.filter((row) => row.load > 100).length],
            ['Пустые группы', rows.filter((row) => row.students === 0).length],
          ],
        },
      ],
    },
  ];
}

// ─── Загрузка аудиторий ─────────────────────────────────────────

export async function buildRoomLoadSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  // Same as the page: the timeline is shown for the last day of the period.
  const { data } = await analyticsService.getRoomLoad({ ...range(period), timelineDate: period.to });
  const rows = data?.rows ?? [];
  const totalLessons = rows.reduce((acc, row) => acc + row.lessonsCount, 0);
  const avgLoad = rows.length > 0 ? Math.round(rows.reduce((acc, row) => acc + row.loadPct, 0) / rows.length) : 0;

  return [
    {
      name: 'Загрузка аудиторий',
      tables: [
        {
          columns: [
            { header: 'Аудитория' },
            { header: 'Занятий', type: 'number' },
            { header: 'Уч-ков', type: 'number' },
            { header: 'Вместимость', type: 'number' },
            { header: 'Загрузка, %', type: 'percent' },
          ],
          rows: rows.map((r) => [r.roomName, r.lessonsCount, r.totalStudents, r.totalCapacity, r.loadPct]),
        },
      ],
    },
    {
      name: 'Итоги и таймлайн',
      tables: [
        {
          title: 'Итоги',
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }],
          rows: [
            ['Занятий за период', totalLessons],
            ['Средняя загрузка аудиторий, %', avgLoad],
            ['Перегруженные аудитории', rows.filter((row) => row.loadPct > 100).length],
          ],
        },
        {
          title: `Загруженность за ${formatExcelDate(data?.timelineDate ?? period.to)}`,
          columns: [{ header: 'Аудитория' }, { header: 'Занятость дня, %', type: 'percent' }],
          rows: (data?.timeline ?? []).map((t) => [t.roomName, t.occupancyPct]),
        },
      ],
    },
  ];
}

// ─── Посещаемость групп ─────────────────────────────────────────

export async function buildGroupAttendanceSheets(
  period: ExcelExportPeriod,
  group: { id: string; name: string },
): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getGroupAttendance(group.id, range(period));
  const monthly = trimLeadingEmpty(data?.monthly ?? [], period, (m) => !m.rate);
  const values = monthly.map((m) => Math.round(m.rate * 100) / 100);
  const average = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;

  return [
    {
      name: 'Посещаемость',
      tables: [
        {
          title: `Группа: ${data?.groupName || group.name}`,
          columns: [{ header: 'Месяц' }, { header: 'Посещаемость, %', type: 'percent' }],
          rows: monthly.map((m, i) => [m.month, values[i]]),
        },
        {
          title: 'Итоги',
          columns: [{ header: 'Показатель' }, { header: 'Значение, %', type: 'percent' }],
          rows: [['Средняя посещаемость за период', average]],
        },
      ],
    },
  ];
}

// ─── Посещаемость курса преподавателя ───────────────────────────

const EXPORT_MONTH_CONCURRENCY = 4;

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const title = new Date(year, monthNumber - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function formatWeekday(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
}

/** The endpoint is month-based, so the period is loaded month by month. */
export async function buildTeacherCourseAttendanceSheets(
  period: ExcelExportPeriod,
  params: { teacherId: string; courseId: string },
): Promise<ExcelSheet[]> {
  const months = listMonthsInRange(period.from, period.to);
  const responses = await mapWithConcurrency(months, EXPORT_MONTH_CONCURRENCY, async (month) => {
    const response = await analyticsService.getTeacherCourseAttendance({ ...params, month });
    return { month, data: response.data };
  });

  const withLessons = responses.filter((item) => (item.data?.lessonDays?.length ?? 0) > 0);
  const first = responses.find((item) => item.data)?.data;

  const summaryRows = withLessons.flatMap(({ month, data }) =>
    (data?.students ?? []).map((s) => [
      formatMonthLabel(month),
      s.studentName,
      STUDENT_STATUS_LABELS[s.studentStatus as StudentStatus] ?? s.studentStatus,
      s.attendedCount,
      s.markedCount,
      s.totalLessons,
      Math.round(s.rhythmPercent),
    ]),
  );

  const markRows = withLessons.flatMap(({ data }) => {
    const lessonDays = [...(data?.lessonDays ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    return lessonDays
      .filter((day) => day.date >= period.from && day.date <= period.to)
      .flatMap((day, index) =>
        (data?.students ?? []).map((s) => {
          const cell = s.attendance.find((item) => item.lessonId === day.lessonId) ?? s.attendance[index];
          const status: AttendanceStatus = cell?.status || 'NOT_MARKED';
          return [day.date, formatWeekday(day.date), s.studentName, ATTENDANCE_STATUS_LABELS[status] ?? status];
        }),
      );
  });

  const header = [first?.teacherName, first?.courseName].filter(Boolean).join(' — ');

  return [
    {
      name: 'Сводка по месяцам',
      tables: [
        {
          title: header || undefined,
          columns: [
            { header: 'Месяц' },
            { header: 'Ученик' },
            { header: 'Статус ученика' },
            { header: 'Посетил', type: 'number' },
            { header: 'Отмечено', type: 'number' },
            { header: 'Всего занятий', type: 'number' },
            { header: 'Ритм, %', type: 'percent' },
          ],
          rows: summaryRows,
        },
      ],
    },
    {
      name: 'Отметки',
      tables: [
        {
          columns: [{ header: 'Дата', type: 'date' }, { header: 'День недели' }, { header: 'Ученик' }, { header: 'Отметка' }],
          rows: markRows,
        },
      ],
    },
  ];
}

// ─── Аналитика по филиалам ──────────────────────────────────────

export async function buildBranchSheets(period: ExcelExportPeriod): Promise<ExcelSheet[]> {
  const { data } = await analyticsService.getBranches(range(period));
  const branches = data?.branches ?? [];

  return [
    {
      name: 'Филиалы',
      tables: [
        {
          columns: [
            { header: '№', type: 'number' },
            { header: 'Филиал' },
            { header: 'Студенты', type: 'number' },
            { header: 'Лиды', type: 'number' },
            { header: 'Активные абонементы', type: 'number' },
            { header: 'Выручка, ₸', type: 'money' },
            { header: 'Расходы, ₸', type: 'money' },
            { header: 'Уроки', type: 'number' },
            { header: 'Посещаемость, %', type: 'percent' },
            { header: 'Загрузка групп, %', type: 'percent' },
            { header: 'Сотрудники', type: 'number' },
          ],
          rows: branches.map((b, i) => [
            i + 1,
            b.branchName,
            b.studentCount,
            b.leadCount,
            b.activeSubscriptions,
            b.revenue,
            b.expenses,
            b.lessonsCount,
            b.attendanceRate,
            b.groupLoad,
            b.staffCount,
          ]),
        },
      ],
    },
    {
      name: 'Итоги',
      tables: [
        {
          columns: [{ header: 'Показатель' }, { header: 'Значение', type: 'number' }],
          rows: [
            ['Филиалов', branches.length],
            ['Общая выручка, ₸', data?.totalRevenue ?? 0],
            ['Общие расходы, ₸', data?.totalExpenses ?? 0],
            ['Прибыль (выручка - расходы), ₸', (data?.totalRevenue ?? 0) - (data?.totalExpenses ?? 0)],
            ['Средняя посещаемость, %', data?.avgAttendance ?? 0],
            ['Всего студентов', data?.totalStudents ?? 0],
            ['Всего лидов', data?.totalLeads ?? 0],
          ],
        },
      ],
    },
  ];
}
