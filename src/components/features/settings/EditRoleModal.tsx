'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  CreditCard,
  DoorOpen,
  Eye,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Kanban,
  Layers,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { pushToast } from '@/lib/toast';
import type { Role } from '@/types/settings';

const ROLE_LABELS_RU: Record<string, string> = {
  TENANT_ADMIN: 'Администратор тенанта',
  MANAGER: 'Руководитель',
  RECEPTIONIST: 'Администратор ресепшена',
  TEACHER: 'Преподаватель',
  ACCOUNTANT: 'Бухгалтер',
};

export interface PermissionDefinition {
  code: string;
  label: string;
  description: string;
}

export interface SubTableDefinition {
  id: string;
  title: string;
  description?: string;
  viewCode?: string;
  viewLabel?: string;
  createCode?: string;
  createLabel?: string;
  editCode?: string;
  editLabel?: string;
  deleteCode?: string;
  deleteLabel?: string;
  specialActions?: Array<{
    code: string;
    label: string;
    description: string;
  }>;
}

export interface TabModuleDefinition {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  tables: SubTableDefinition[];
}

export const TAB_MODULES: TabModuleDefinition[] = [
  {
    id: 'students',
    title: 'Ученики и студенты',
    shortTitle: 'Ученики',
    icon: GraduationCap,
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
    tables: [
      {
        id: 'students_main',
        title: 'Таблица учеников',
        description: 'Основной реестр и личные профили учащихся',
        viewCode: 'STUDENTS_VIEW',
        viewLabel: 'Просмотр списка и карточек',
        createCode: 'STUDENTS_CREATE',
        createLabel: 'Регистрация учеников',
        editCode: 'STUDENTS_EDIT',
        editLabel: 'Редактирование профилей',
        deleteCode: 'STUDENTS_DELETE',
        deleteLabel: 'Удаление и архивация',
        specialActions: [
          {
            code: 'STUDENTS_EXPORT',
            label: 'Экспорт в Excel',
            description: 'Выгрузка списка учеников центра в формат Excel / CSV',
          },
        ],
      },
      {
        id: 'students_financials',
        title: 'Баланс, скидки и коммуникации',
        description: 'Специальные вкладки в карточке ученика',
        specialActions: [
          {
            code: 'STUDENTS_BALANCE',
            label: 'Управление балансом и скидками',
            description: 'Просмотр баланса, начислений, скидок и ручная корректировка счёта',
          },
          {
            code: 'STUDENTS_CALL_LOGS',
            label: 'Журнал звонков телефонии',
            description: 'Просмотр истории входящих/исходящих звонков и прослушивание аудиозаписей',
          },
          {
            code: 'STUDENTS_DOCUMENTS',
            label: 'Документы и договоры',
            description: 'Генерация, загрузка файлов и печать типовых договоров ученика',
          },
        ],
      },
    ],
  },
  {
    id: 'courses_groups',
    title: 'Курсы и группы',
    shortTitle: 'Курсы и группы',
    icon: Users,
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    tables: [
      {
        id: 'courses_table',
        title: 'Обучающие курсы и уровни',
        description: 'Каталог учебных направлений и предметов',
        viewCode: 'COURSES_VIEW',
        viewLabel: 'Просмотр курсов',
        createCode: 'COURSES_CREATE',
        createLabel: 'Создание курсов',
        editCode: 'COURSES_EDIT',
        editLabel: 'Редактирование курсов',
        deleteCode: 'COURSES_DELETE',
        deleteLabel: 'Удаление курсов',
      },
      {
        id: 'groups_table',
        title: 'Учебные группы',
        description: 'Группы учащихся, расписание и преподаватели',
        viewCode: 'GROUPS_VIEW',
        viewLabel: 'Просмотр групп',
        createCode: 'GROUPS_CREATE',
        createLabel: 'Создание групп',
        editCode: 'GROUPS_EDIT',
        editLabel: 'Редактирование групп',
        deleteCode: 'GROUPS_DELETE',
        deleteLabel: 'Удаление групп',
        specialActions: [
          {
            code: 'GROUPS_STUDENTS_MANAGE',
            label: 'Состав группы (зачисление/перевод)',
            description: 'Добавление учеников в группу, исключение и перевод между группами',
          },
          {
            code: 'GROUPS_TEACHER_ASSIGN',
            label: 'Назначение преподавателей',
            description: 'Привязка основного и заменяющего преподавателя на группу',
          },
        ],
      },
    ],
  },
  {
    id: 'schedule_lessons',
    title: 'Расписание и посещаемость',
    shortTitle: 'Расписание',
    icon: CalendarDays,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    tables: [
      {
        id: 'lessons_table',
        title: 'Сетка занятий и календарь',
        description: 'Календарное расписание уроков по дням и аудиториям',
        viewCode: 'LESSONS_VIEW',
        viewLabel: 'Просмотр сетки уроков',
        createCode: 'LESSONS_CREATE',
        createLabel: 'Добавление занятий',
        editCode: 'LESSONS_EDIT',
        editLabel: 'Перенос и замена',
        deleteCode: 'LESSONS_DELETE',
        deleteLabel: 'Отмена и удаление',
        specialActions: [
          {
            code: 'SCHEDULE_MANAGE',
            label: 'Управление шаблонами расписания',
            description: 'Настройка постоянной сетки расписания и пакетная генерация занятий',
          },
        ],
      },
      {
        id: 'attendance_table',
        title: 'Журнал посещаемости',
        description: 'Отметка присутствия учеников на уроках',
        specialActions: [
          {
            code: 'LESSONS_MARK_ATTENDANCE',
            label: 'Отметка посещаемости',
            description: 'Выставление статусов (присутствовал, пропуск, уважительная) на сегодняшних уроках',
          },
          {
            code: 'ATTENDANCE_EDIT_PAST',
            label: 'Ретро-отметка (за прошлые дни)',
            description: 'Корректировка отметок посещаемости за прошедшие даты и закрытые периоды',
          },
        ],
      },
    ],
  },
  {
    id: 'rooms',
    title: 'Аудитории и кабинеты',
    shortTitle: 'Кабинеты',
    icon: DoorOpen,
    tone: 'border-teal-200 bg-teal-50 text-teal-700',
    tables: [
      {
        id: 'rooms_table',
        title: 'Кабинеты филиала',
        description: 'Учебные аудитории филиала и их вместимость',
        viewCode: 'ROOMS_VIEW',
        viewLabel: 'Просмотр кабинетов',
        createCode: 'ROOMS_CREATE',
        createLabel: 'Добавление кабинетов',
        editCode: 'ROOMS_EDIT',
        editLabel: 'Редактирование параметров',
        deleteCode: 'ROOMS_DELETE',
        deleteLabel: 'Удаление кабинетов',
      },
    ],
  },
  {
    id: 'leads',
    title: 'Лиды и Канбан воронка',
    shortTitle: 'Лиды / Канбан',
    icon: Kanban,
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    tables: [
      {
        id: 'leads_table',
        title: 'Реестр обращений и доска лидов',
        description: 'Потенциальные клиенты, заявки с сайта и звонки',
        viewCode: 'LEADS_VIEW',
        viewLabel: 'Просмотр доски канбан',
        createCode: 'LEADS_CREATE',
        createLabel: 'Создание лидов',
        editCode: 'LEADS_EDIT',
        editLabel: 'Редактирование карточек',
        deleteCode: 'LEADS_DELETE',
        deleteLabel: 'Удаление лидов',
      },
      {
        id: 'leads_workflow',
        title: 'Движение по воронке и управление этапами',
        description: 'Процесс конверсии и архитектура колонок',
        specialActions: [
          {
            code: 'LEADS_STAGE_MOVE',
            label: 'Перемещение карточек по этапам',
            description: 'Смена статусов и перетаскивание лидов по стадиям воронки продаж',
          },
          {
            code: 'LEADS_CONVERT',
            label: 'Конвертация лида в ученика',
            description: 'Успешное закрытие сделки и регистрация постоянного ученика',
          },
          {
            code: 'LEADS_MANAGE_COLUMNS',
            label: 'Управление колонками канбана',
            description: 'Создание, переименование, удаление и скрытие этапов воронки (только для админов)',
          },
        ],
      },
    ],
  },
  {
    id: 'finance',
    title: 'Финансы и транзакции',
    shortTitle: 'Финансы',
    icon: Wallet,
    tone: 'border-purple-200 bg-purple-50 text-purple-700',
    tables: [
      {
        id: 'finance_table',
        title: 'Журнал финансовых операций',
        description: 'Реестр приходов, расходов и ручных проводок',
        viewCode: 'FINANCE_VIEW',
        viewLabel: 'Просмотр реестра операций',
        createCode: 'FINANCE_CREATE',
        createLabel: 'Внесение финопераций',
        editCode: 'FINANCE_EDIT',
        editLabel: 'Редактирование операций',
        deleteCode: 'FINANCE_DELETE',
        deleteLabel: 'Удаление операций',
        specialActions: [
          {
            code: 'FINANCE_EXPORT',
            label: 'Экспорт финотчета в Excel',
            description: 'Выгрузка книги доходов и расходов в формате XLSX',
          },
        ],
      },
      {
        id: 'finance_debtors',
        title: 'Должники и прием платежей за курсы',
        description: 'Взаиморасчеты с учащимися',
        specialActions: [
          {
            code: 'PAYMENTS_DEBTORS_VIEW',
            label: 'Реестр должников',
            description: 'Доступ к реестру должников и неоплаченных уроков',
          },
          {
            code: 'PAYMENTS_ACCEPT',
            label: 'Прием платежей за обучение',
            description: 'Фиксация поступивших средств за курсы и абонементы',
          },
        ],
      },
    ],
  },
  {
    id: 'cashier',
    title: 'Касса и кассовые смены',
    shortTitle: 'Касса',
    icon: Receipt,
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
    tables: [
      {
        id: 'cashier_shifts',
        title: 'Кассовые смены и баланс',
        description: 'Управление операционной кассой филиала',
        viewCode: 'CASHIER_VIEW',
        viewLabel: 'Просмотр баланса кассы',
        specialActions: [
          {
            code: 'CASHIER_SHIFT',
            label: 'Открытие и закрытие смен',
            description: 'Фиксация утренних и вечерних остатков наличных денег в кассе',
          },
        ],
      },
      {
        id: 'cashier_operations',
        title: 'Кассовые операции',
        description: 'Движение наличных и эквайринг',
        specialActions: [
          {
            code: 'CASHIER_PAYMENT',
            label: 'Прием оплат через кассу',
            description: 'Прием платежей от клиентов через кассу (наличные, POS, Kaspi QR)',
          },
          {
            code: 'CASHIER_EXPENSE',
            label: 'Кассовые расходы',
            description: 'Выдача наличных денег из кассы на хозяйственные расходы центра',
          },
          {
            code: 'CASHIER_SALARY',
            label: 'Выплата зарплат из кассы',
            description: 'Выдача наличных средств сотрудникам в счет заработной платы',
          },
          {
            code: 'CASHIER_OPERATION_DELETE',
            label: 'Удаление кассовых операций',
            description: 'Аннулирование и удаление ошибочных записей в кассовой смене',
          },
        ],
      },
      {
        id: 'cashier_reports',
        title: 'Отчетность и администрирование',
        description: 'Кассовая дисциплина и инкассация',
        specialActions: [
          {
            code: 'CASHIER_REPORT',
            label: 'Z-отчет и суточная ведомость',
            description: 'Формирование и печать суточных кассовых отчетов смен',
          },
          {
            code: 'CASHIER_MANAGE',
            label: 'Администрирование кассы',
            description: 'Настройка политик кассы, инкассация и проверка баланса',
          },
        ],
      },
    ],
  },
  {
    id: 'salary',
    title: 'Зарплаты преподавателей (Payroll)',
    shortTitle: 'Зарплаты',
    icon: Building2,
    tone: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    tables: [
      {
        id: 'salary_payroll',
        title: 'Ведомость начислений',
        description: 'Расчетные листы преподавателей и персонала',
        viewCode: 'SALARY_VIEW',
        viewLabel: 'Просмотр начислений',
        editCode: 'SALARY_EDIT',
        editLabel: 'Корректировка начислений',
        specialActions: [
          {
            code: 'SALARY_PAY',
            label: 'Проведение выплат зарплат',
            description: 'Фиксация выдачи заработной платы и авансовых платежей',
          },
          {
            code: 'SALARY_RATES_MANAGE',
            label: 'Управление ставками преподавателей',
            description: 'Настройка базовых и индивидуальных процентных ставок за уроки',
          },
        ],
      },
    ],
  },
  {
    id: 'subscriptions',
    title: 'Абонементы и тарифные планы',
    shortTitle: 'Абонементы',
    icon: CreditCard,
    tone: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    tables: [
      {
        id: 'subscriptions_table',
        title: 'Абонементы учеников',
        description: 'Проданные пакеты занятий, сроки и остатки уроков',
        viewCode: 'SUBSCRIPTIONS_VIEW',
        viewLabel: 'Просмотр абонементов',
        createCode: 'SUBSCRIPTIONS_CREATE',
        createLabel: 'Оформление абонементов',
        editCode: 'SUBSCRIPTIONS_EDIT',
        editLabel: 'Заморозка и продление',
        deleteCode: 'SUBSCRIPTIONS_DELETE',
        deleteLabel: 'Удаление абонементов',
      },
      {
        id: 'price_lists_table',
        title: 'Прейскурант цен и тарифы',
        description: 'Стоимость уроков, разовых занятий и абонементов',
        viewCode: 'PRICE_LISTS_VIEW',
        viewLabel: 'Просмотр тарифов',
        createCode: 'PRICE_LISTS_CREATE',
        createLabel: 'Создание тарифов',
        editCode: 'PRICE_LISTS_EDIT',
        editLabel: 'Редактирование цен',
        deleteCode: 'PRICE_LISTS_DELETE',
        deleteLabel: 'Удаление тарифов',
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Задачи и командные поручения',
    shortTitle: 'Задачи',
    icon: CheckSquare,
    tone: 'border-orange-200 bg-orange-50 text-orange-700',
    tables: [
      {
        id: 'tasks_table',
        title: 'Таблица задач',
        description: 'Внутренние поручения и контроль дедлайнов',
        viewCode: 'TASKS_VIEW',
        viewLabel: 'Просмотр задач',
        createCode: 'TASKS_CREATE',
        createLabel: 'Создание поручений',
        editCode: 'TASKS_EDIT',
        editLabel: 'Редактирование и статусы',
        deleteCode: 'TASKS_DELETE',
        deleteLabel: 'Удаление задач',
      },
    ],
  },
  {
    id: 'staff',
    title: 'Сотрудники и филиальный доступ',
    shortTitle: 'Персонал',
    icon: UserCheck,
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    tables: [
      {
        id: 'staff_table',
        title: 'Реестр сотрудников',
        description: 'Штат учителей, менеджеров и кураторов',
        viewCode: 'STAFF_VIEW',
        viewLabel: 'Просмотр сотрудников',
        createCode: 'STAFF_CREATE',
        createLabel: 'Добавление сотрудников',
        editCode: 'STAFF_EDIT',
        editLabel: 'Редактирование ставок/ролей',
        deleteCode: 'STAFF_DELETE',
        deleteLabel: 'Увольнение сотрудников',
        specialActions: [
          {
            code: 'STAFF_BRANCH_ACCESS',
            label: 'Мультифилиальный доступ',
            description: 'Разрешение сотруднику работать в нескольких филиалах одновременно',
          },
        ],
      },
    ],
  },
  {
    id: 'files',
    title: 'Файлы и облачное хранилище',
    shortTitle: 'Файлы',
    icon: FolderOpen,
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
    tables: [
      {
        id: 'files_table',
        title: 'Файловый менеджер и папки',
        description: 'Хранилище учебных материалов, общие папки и доступ к документам',
        viewCode: 'FILES_VIEW',
        viewLabel: 'Просмотр файлов и папок',
        createCode: 'FILES_CREATE',
        createLabel: 'Создание папок и загрузка',
        editCode: 'FILES_EDIT',
        editLabel: 'Переименование и участники',
        deleteCode: 'FILES_DELETE',
        deleteLabel: 'Удаление файлов и папок',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Склад и инвентарь',
    shortTitle: 'Склад',
    icon: Boxes,
    tone: 'border-lime-200 bg-lime-50 text-lime-700',
    tables: [
      {
        id: 'inventory_table',
        title: 'Номенклатура и складские остатки',
        description: 'Учебники, форма, канцтовары и инвентарь',
        viewCode: 'INVENTORY_VIEW',
        viewLabel: 'Просмотр остатков',
        createCode: 'INVENTORY_CREATE',
        createLabel: 'Оприходование товаров',
        editCode: 'INVENTORY_EDIT',
        editLabel: 'Редактирование цен/остатков',
        deleteCode: 'INVENTORY_DELETE',
        deleteLabel: 'Списание позиций',
        specialActions: [
          {
            code: 'INVENTORY_REVISION',
            label: 'Инвентаризация и ревизия',
            description: 'Проведение ревизий и фиксация фактических остатков на складе',
          },
          {
            code: 'INVENTORY_TRANSFER',
            label: 'Перемещение между филиалами',
            description: 'Оформление межфилиальных складских перемещений товаров',
          },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Аналитика и сводные отчеты',
    shortTitle: 'Аналитика',
    icon: BarChart3,
    tone: 'border-pink-200 bg-pink-50 text-pink-700',
    tables: [
      {
        id: 'analytics_dashboards',
        title: 'Дашборды и бизнес-показатели',
        description: 'Метрики эффективности учебного центра',
        specialActions: [
          {
            code: 'ANALYTICS_VIEW',
            label: 'Главный сводный дашборд и KPI',
            description: 'Доступ к главному экрану аналитики, конверсиям и выручке',
          },
          {
            code: 'ANALYTICS_FINANCE',
            label: 'Финансовая аналитика',
            description: 'Графики доходов, расходов, рентабельности и среднего чека',
          },
          {
            code: 'ANALYTICS_RETENTION',
            label: 'Удержание и отток учеников',
            description: 'LTV, когортный анализ и повторные покупки абонементов',
          },
          {
            code: 'ANALYTICS_TEACHERS',
            label: 'Эффективность преподавателей',
            description: 'Посещаемость уроков учителей и удовлетворенность учеников',
          },
          {
            code: 'ANALYTICS_ROOM_LOAD',
            label: 'Загрузка учебных аудиторий',
            description: 'Почасовой анализ занятости кабинетов филиала',
          },
          {
            code: 'REPORTS_VIEW',
            label: 'Выгрузка сводных отчетов',
            description: 'Экспорт детальных управленческих отчетов в Excel',
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Настройки, филиалы и интеграции',
    shortTitle: 'Настройки',
    icon: Settings,
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
    tables: [
      {
        id: 'settings_center',
        title: 'Параметры центра и реквизиты',
        description: 'Общие настройки образовательного учреждения',
        viewCode: 'SETTINGS_VIEW',
        viewLabel: 'Просмотр настроек',
        editCode: 'SETTINGS_EDIT',
        editLabel: 'Редактирование реквизитов',
      },
      {
        id: 'settings_admin',
        title: 'Системное администрирование',
        description: 'Управление структурой и интеграциями',
        specialActions: [
          {
            code: 'BRANCHES_MANAGE',
            label: 'Управление филиалами',
            description: 'Создание, редактирование и закрытие филиалов центра',
          },
          {
            code: 'ROLES_MANAGE',
            label: 'Управление ролями и матрицей прав',
            description: 'Создание кастомных ролей и назначение уровней доступа',
          },
          {
            code: 'INTEGRATIONS_MANAGE',
            label: 'Интеграции (Kaspi, телефония)',
            description: 'Настройка эквайринга, виртуальной АТС и мессенджеров',
          },
          {
            code: 'DICTIONARIES_MANAGE',
            label: 'Справочники и категории',
            description: 'Настройка статусов посещений, категорий расходов и типов занятий',
          },
        ],
      },
    ],
  },
];

// Flat catalog of all permissions with metadata
export const ALL_SYSTEM_PERMISSIONS = new Map<string, { label: string; description: string; tabId: string }>();

for (const tab of TAB_MODULES) {
  for (const t of tab.tables) {
    if (t.viewCode) {
      ALL_SYSTEM_PERMISSIONS.set(t.viewCode, {
        label: t.viewLabel || 'Просмотр',
        description: `Просмотр: ${t.title}`,
        tabId: tab.id,
      });
    }
    if (t.createCode) {
      ALL_SYSTEM_PERMISSIONS.set(t.createCode, {
        label: t.createLabel || 'Создание',
        description: `Создание: ${t.title}`,
        tabId: tab.id,
      });
    }
    if (t.editCode) {
      ALL_SYSTEM_PERMISSIONS.set(t.editCode, {
        label: t.editLabel || 'Редактирование',
        description: `Редактирование: ${t.title}`,
        tabId: tab.id,
      });
    }
    if (t.deleteCode) {
      ALL_SYSTEM_PERMISSIONS.set(t.deleteCode, {
        label: t.deleteLabel || 'Удаление',
        description: `Удаление: ${t.title}`,
        tabId: tab.id,
      });
    }
    if (t.specialActions) {
      for (const sa of t.specialActions) {
        ALL_SYSTEM_PERMISSIONS.set(sa.code, {
          label: sa.label,
          description: sa.description,
          tabId: tab.id,
        });
      }
    }
  }
}

// Helper to collect all permission codes in a tab
function getTabCodes(tab: TabModuleDefinition): string[] {
  const codes: string[] = [];
  for (const t of tab.tables) {
    if (t.viewCode) codes.push(t.viewCode);
    if (t.createCode) codes.push(t.createCode);
    if (t.editCode) codes.push(t.editCode);
    if (t.deleteCode) codes.push(t.deleteCode);
    if (t.specialActions) {
      for (const sa of t.specialActions) {
        codes.push(sa.code);
      }
    }
  }
  return codes;
}

// Preset templates for quick role configuration
interface RolePreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  permissions: string[];
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'admin',
    name: 'Полный доступ (Администратор)',
    description: 'Все доступные разрешения во всех модулях',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    permissions: Array.from(ALL_SYSTEM_PERMISSIONS.keys()),
  },
  {
    id: 'manager',
    name: 'Менеджер филиала',
    description: 'Работа с клиентами, группами, файлами, кассой и посещаемостью (без удаления колонок и изменения ролей)',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: [
      'STUDENTS_VIEW', 'STUDENTS_CREATE', 'STUDENTS_EDIT', 'STUDENTS_EXPORT', 'STUDENTS_BALANCE', 'STUDENTS_CALL_LOGS', 'STUDENTS_DOCUMENTS',
      'COURSES_VIEW', 'GROUPS_VIEW', 'GROUPS_CREATE', 'GROUPS_EDIT', 'GROUPS_STUDENTS_MANAGE', 'GROUPS_TEACHER_ASSIGN',
      'ROOMS_VIEW', 'ROOMS_CREATE', 'ROOMS_EDIT',
      'LESSONS_VIEW', 'LESSONS_CREATE', 'LESSONS_EDIT', 'LESSONS_MARK_ATTENDANCE', 'SCHEDULE_MANAGE',
      'LEADS_VIEW', 'LEADS_CREATE', 'LEADS_EDIT', 'LEADS_STAGE_MOVE', 'LEADS_CONVERT',
      'FINANCE_VIEW', 'PAYMENTS_DEBTORS_VIEW', 'PAYMENTS_ACCEPT',
      'CASHIER_VIEW', 'CASHIER_SHIFT', 'CASHIER_PAYMENT', 'CASHIER_EXPENSE', 'CASHIER_REPORT',
      'SUBSCRIPTIONS_VIEW', 'SUBSCRIPTIONS_CREATE', 'SUBSCRIPTIONS_EDIT', 'PRICE_LISTS_VIEW',
      'TASKS_VIEW', 'TASKS_CREATE', 'TASKS_EDIT',
      'STAFF_VIEW',
      'FILES_VIEW', 'FILES_CREATE', 'FILES_EDIT', 'FILES_DELETE',
      'INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_EDIT',
      'ANALYTICS_VIEW',
      'SETTINGS_VIEW',
    ],
  },
  {
    id: 'teacher',
    name: 'Преподаватель',
    description: 'Журнал занятий, отметка посещаемости, общие учебные файлы и карточки учеников',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    permissions: [
      'STUDENTS_VIEW',
      'COURSES_VIEW',
      'GROUPS_VIEW',
      'ROOMS_VIEW',
      'LESSONS_VIEW',
      'LESSONS_MARK_ATTENDANCE',
      'FILES_VIEW', 'FILES_CREATE',
      'TASKS_VIEW',
      'ANALYTICS_VIEW',
    ],
  },
  {
    id: 'cashier',
    name: 'Кассир / Администратор кассы',
    description: 'Смены, прием оплат, абонементы и выплата расходов',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    permissions: [
      'STUDENTS_VIEW', 'STUDENTS_BALANCE',
      'CASHIER_VIEW', 'CASHIER_SHIFT', 'CASHIER_PAYMENT', 'CASHIER_EXPENSE', 'CASHIER_SALARY', 'CASHIER_REPORT',
      'FINANCE_VIEW', 'PAYMENTS_DEBTORS_VIEW', 'PAYMENTS_ACCEPT',
      'SUBSCRIPTIONS_VIEW', 'SUBSCRIPTIONS_CREATE', 'PRICE_LISTS_VIEW',
      'FILES_VIEW',
    ],
  },
  {
    id: 'lead_manager',
    name: 'Лид-менеджер / Отдел продаж',
    description: 'Воронка лидов, входящие заявки, звонки и регистрация учеников',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    permissions: [
      'LEADS_VIEW', 'LEADS_CREATE', 'LEADS_EDIT', 'LEADS_STAGE_MOVE', 'LEADS_CONVERT',
      'STUDENTS_VIEW', 'STUDENTS_CREATE', 'STUDENTS_CALL_LOGS',
      'COURSES_VIEW', 'GROUPS_VIEW',
      'SUBSCRIPTIONS_VIEW', 'SUBSCRIPTIONS_CREATE', 'PRICE_LISTS_VIEW',
      'FILES_VIEW', 'FILES_CREATE',
      'TASKS_VIEW', 'TASKS_CREATE', 'TASKS_EDIT',
    ],
  },
  {
    id: 'accountant',
    name: 'Бухгалтер / Финансист',
    description: 'Финоперации, касса, зарплаты, тарифы и аналитика выручки',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    permissions: [
      'STUDENTS_VIEW', 'STUDENTS_BALANCE',
      'FINANCE_VIEW', 'FINANCE_CREATE', 'FINANCE_EDIT', 'FINANCE_EXPORT', 'PAYMENTS_DEBTORS_VIEW',
      'CASHIER_VIEW', 'CASHIER_SHIFT', 'CASHIER_PAYMENT', 'CASHIER_EXPENSE', 'CASHIER_SALARY', 'CASHIER_REPORT', 'CASHIER_MANAGE',
      'SALARY_VIEW', 'SALARY_PAY', 'SALARY_EDIT', 'SALARY_RATES_MANAGE',
      'SUBSCRIPTIONS_VIEW', 'PRICE_LISTS_VIEW', 'PRICE_LISTS_CREATE', 'PRICE_LISTS_EDIT',
      'FILES_VIEW', 'FILES_CREATE',
      'ANALYTICS_VIEW', 'ANALYTICS_FINANCE', 'REPORTS_VIEW',
    ],
  },
  {
    id: 'readonly',
    name: 'Только чтение',
    description: 'Доступ только к просмотру всех таблиц без права редактирования',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    permissions: [
      'STUDENTS_VIEW', 'COURSES_VIEW', 'GROUPS_VIEW', 'ROOMS_VIEW', 'LESSONS_VIEW',
      'LEADS_VIEW', 'FINANCE_VIEW', 'PAYMENTS_DEBTORS_VIEW', 'CASHIER_VIEW',
      'SALARY_VIEW', 'SUBSCRIPTIONS_VIEW', 'PRICE_LISTS_VIEW', 'TASKS_VIEW',
      'STAFF_VIEW', 'FILES_VIEW', 'INVENTORY_VIEW', 'ANALYTICS_VIEW', 'SETTINGS_VIEW',
    ],
  },
];

export interface RoleFormPayload {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
}

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  availablePermissions: string[];
  onSave: (role: RoleFormPayload) => Promise<void>;
  isSubmitting?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return 'Не удалось сохранить роль. Попробуйте ещё раз.';
}

export const EditRoleModal = ({
  isOpen,
  onClose,
  role,
  availablePermissions,
  onSave,
  isSubmitting = false,
}: EditRoleModalProps) => {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [activeTabId, setActiveTabId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [nameError, setNameError] = useState(false);

  const getRoleLabel = (value: string) => ROLE_LABELS_RU[value] || value;

  // Merged available permissions
  const effectiveAvailableCodes = useMemo(() => {
    const set = new Set<string>();
    for (const code of ALL_SYSTEM_PERMISSIONS.keys()) {
      set.add(code);
    }
    for (const code of availablePermissions) {
      if (code) set.add(code);
    }
    return Array.from(set);
  }, [availablePermissions]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const map = new Map<string, { selected: number; total: number }>();
    for (const tab of TAB_MODULES) {
      const tabCodes = getTabCodes(tab);
      const selected = tabCodes.filter((c) => permissions.includes(c)).length;
      map.set(tab.id, { selected, total: tabCodes.length });
    }
    return map;
  }, [permissions]);

  // Filtered modules based on active tab and search query
  const displayedModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return TAB_MODULES.filter((tab) => {
      if (activeTabId !== 'all' && tab.id !== activeTabId) {
        return false;
      }
      if (!q) return true;

      // Check tab title
      if (tab.title.toLowerCase().includes(q) || tab.shortTitle.toLowerCase().includes(q)) return true;

      // Check tables
      for (const t of tab.tables) {
        if (t.title.toLowerCase().includes(q)) return true;
        if (t.viewCode && (t.viewCode.toLowerCase().includes(q) || t.viewLabel?.toLowerCase().includes(q))) return true;
        if (t.createCode && (t.createCode.toLowerCase().includes(q) || t.createLabel?.toLowerCase().includes(q))) return true;
        if (t.editCode && (t.editCode.toLowerCase().includes(q) || t.editLabel?.toLowerCase().includes(q))) return true;
        if (t.deleteCode && (t.deleteCode.toLowerCase().includes(q) || t.deleteLabel?.toLowerCase().includes(q))) return true;
        if (t.specialActions) {
          for (const sa of t.specialActions) {
            if (sa.code.toLowerCase().includes(q) || sa.label.toLowerCase().includes(q) || sa.description.toLowerCase().includes(q)) {
              return true;
            }
          }
        }
      }
      return false;
    });
  }, [activeTabId, searchQuery]);

  const togglePermission = (code: string) => {
    setPermissions((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  // Toggle all permissions in a specific sub-table
  const toggleSubTable = (table: SubTableDefinition) => {
    const codes: string[] = [];
    if (table.viewCode) codes.push(table.viewCode);
    if (table.createCode) codes.push(table.createCode);
    if (table.editCode) codes.push(table.editCode);
    if (table.deleteCode) codes.push(table.deleteCode);
    if (table.specialActions) {
      for (const sa of table.specialActions) {
        codes.push(sa.code);
      }
    }

    const allChecked = codes.every((c) => permissions.includes(c));
    if (allChecked) {
      setPermissions((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setPermissions((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  // Toggle entire tab
  const handleToggleTab = (tab: TabModuleDefinition, selectAll: boolean) => {
    const tabCodes = getTabCodes(tab);
    if (selectAll) {
      setPermissions((prev) => Array.from(new Set([...prev, ...tabCodes])));
    } else {
      setPermissions((prev) => prev.filter((c) => !tabCodes.includes(c)));
    }
  };

  const handleSelectAllGlobal = () => {
    setPermissions(effectiveAvailableCodes);
  };

  const handleClearAllGlobal = () => {
    setPermissions([]);
  };

  const applyPreset = (preset: RolePreset) => {
    setPermissions(preset.permissions);
    pushToast({ message: `Применен шаблон «${preset.name}» (${preset.permissions.length} прав)`, tone: 'success' });
  };

  const handleSave = async () => {
    setNameError(false);

    if (!name.trim()) {
      setNameError(true);
      pushToast({ message: 'Название роли обязательно.', tone: 'error' });
      return;
    }

    try {
      await onSave({
        id: role?.id,
        name: name.trim(),
        description: description.trim(),
        permissions,
      });
    } catch (submitError) {
      pushToast({ message: getErrorMessage(submitError), tone: 'error' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `Редактирование роли — ${getRoleLabel(role.name)}` : 'Создать новую роль'}
      maxWidth="max-w-6xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-gray-500">
            Выбрано разрешений:{' '}
            <span className="font-bold text-[#467aff]">{permissions.length}</span> / {effectiveAvailableCodes.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Сохраняем...' : 'Сохранить роль'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#dce6f5] bg-[linear-gradient(135deg,#f8fbff_0%,#f4f8ff_55%,#ffffff_100%)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#1f2d45]">Права доступа роли</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#68778a]">Выберите готовый шаблон или настройте доступы по разделам. Изменения применятся только после сохранения роли.</p>
            </div>
            <div className="rounded-xl border border-[#cfe0ff] bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#70819a]">Выбрано доступов</p>
              <p className="mt-0.5 text-lg font-bold text-[#467aff]">{permissions.length}<span className="ml-1 text-xs font-medium text-[#8a98aa]">/ {effectiveAvailableCodes.length}</span></p>
            </div>
          </div>
        </section>

        {/* Name & Description Inputs */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e5ebf2] bg-white p-4 sm:grid-cols-2">
          <Input
            label="Название роли"
            placeholder="Например: Старший куратор, Стажер..."
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(false);
            }}
            error={nameError}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Описание роли</label>
            <input
              type="text"
              placeholder="Кратко о назначении роли и обязанностях"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="crm-input"
            />
          </div>
        </div>

        {/* Presets Bar */}
        <div className="rounded-2xl border border-[#e0e8f3] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1f2530]">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Быстрый старт</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllGlobal}
                className="text-xs font-semibold text-[#467aff] hover:underline"
              >
                Выбрать все ({effectiveAvailableCodes.length})
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={handleClearAllGlobal}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Снять все
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:shadow-xs ${preset.badge}`}
                title={preset.description}
              >
                <span>{preset.name}</span>
                <span className="opacity-70 text-[10px]">({preset.permissions.length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative rounded-xl bg-[#f8fafc] p-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по таблицам, правам и кодам (например: файлы, ученики, касса, экспорт, удаление, канбан)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="crm-input crm-input-with-icon text-xs sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#e3eaf3] bg-[#fbfcfe] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTabId('all')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTabId === 'all'
                ? 'bg-[#467aff] text-white shadow-xs'
                : 'bg-transparent text-[#475569] hover:bg-[#f1f5f9]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Все разделы</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTabId === 'all' ? 'bg-white/20 text-white' : 'bg-[#e2e8f0] text-[#334155]'
              }`}
            >
              {permissions.length}/{effectiveAvailableCodes.length}
            </span>
          </button>

          {TAB_MODULES.map((tab) => {
            const Icon = tab.icon;
            const counts = tabCounts.get(tab.id) || { selected: 0, total: 0 };
            const isActive = activeTabId === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#467aff] text-white shadow-xs'
                    : 'bg-transparent text-[#475569] hover:bg-[#f1f5f9]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.shortTitle}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : counts.selected > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {counts.selected}/{counts.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modules & Tables List */}
        <div className="max-h-[500px] space-y-4 overflow-y-auto pr-1">
          {activeTabId === 'all' && !searchQuery.trim() ? (
            <section className="rounded-2xl border border-[#e1e9f2] bg-[#fbfcfe] p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#27303c]">Разделы CRM</h3>
                  <p className="mt-0.5 text-xs text-[#7a8899]">Нажмите на раздел, чтобы настроить конкретные действия.</p>
                </div>
                <span className="text-xs font-medium text-[#7a8899]">{TAB_MODULES.length} разделов</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {TAB_MODULES.map((tab) => {
                  const Icon = tab.icon;
                  const counts = tabCounts.get(tab.id) || { selected: 0, total: 0 };
                  const isComplete = counts.selected === counts.total && counts.total > 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTabId(tab.id)}
                      className="group flex items-center gap-3 rounded-xl border border-[#e3eaf2] bg-white p-3 text-left transition-all hover:border-[#9dc0ff] hover:bg-[#f6f9ff] hover:shadow-sm"
                    >
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tab.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[#27303c] group-hover:text-[#467aff]">{tab.shortTitle}</span>
                        <span className="mt-0.5 block text-[11px] text-[#8491a0]">{counts.selected} из {counts.total} доступов</span>
                      </span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${isComplete ? 'bg-emerald-500' : counts.selected > 0 ? 'bg-[#467aff]' : 'bg-slate-200'}`} />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : displayedModules.length > 0 ? (
            displayedModules.map((tab) => {
              const Icon = tab.icon;
              const counts = tabCounts.get(tab.id) || { selected: 0, total: 0 };
              const isAllTabSelected = counts.selected === counts.total && counts.total > 0;

              return (
                <div
                  key={tab.id}
                  className="rounded-2xl border border-[#dbe2e8] bg-white shadow-xs overflow-hidden"
                >
                  {/* Tab Section Header */}
                  <div className="flex flex-wrap items-center justify-between border-b border-[#eef2f6] bg-[#f8fbfd] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${tab.tone}`}>
                        <Icon className="mr-1.5 h-3.5 w-3.5 inline-block" />
                        {tab.title}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        Выбрано: <strong className="text-gray-900">{counts.selected}</strong> из {counts.total}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleTab(tab, !isAllTabSelected)}
                        className="text-xs font-semibold text-[#467aff] transition-colors hover:text-[#2d5be3]"
                      >
                        {isAllTabSelected ? 'Снять все в этом разделе' : 'Выбрать все в этом разделе'}
                      </button>
                    </div>
                  </div>

                  {/* Tables within this Tab */}
                  <div className="divide-y divide-[#eef2f6]">
                    {tab.tables.map((table) => {
                      // Collect all codes in this sub-table
                      const tableCodes: string[] = [];
                      if (table.viewCode) tableCodes.push(table.viewCode);
                      if (table.createCode) tableCodes.push(table.createCode);
                      if (table.editCode) tableCodes.push(table.editCode);
                      if (table.deleteCode) tableCodes.push(table.deleteCode);
                      if (table.specialActions) {
                        for (const sa of table.specialActions) tableCodes.push(sa.code);
                      }

                      const checkedCount = tableCodes.filter((c) => permissions.includes(c)).length;
                      const isAllTableChecked = checkedCount === tableCodes.length && tableCodes.length > 0;

                      return (
                        <div key={table.id} className="p-4">
                          {/* Table Header Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isAllTableChecked}
                                onChange={() => toggleSubTable(table)}
                                className="h-4 w-4 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff] cursor-pointer"
                                title="Выбрать/снять всю таблицу"
                              />
                              <div>
                                <h4
                                  onClick={() => toggleSubTable(table)}
                                  className="text-sm font-bold text-gray-900 cursor-pointer hover:text-[#467aff] transition-colors"
                                >
                                  {table.title}
                                </h4>
                                {table.description && (
                                  <p className="text-xs text-gray-500">{table.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-400">
                              {checkedCount} / {tableCodes.length}
                            </span>
                          </div>

                          {/* Standard CRUD Permissions Row (if available) */}
                          {(table.viewCode || table.createCode || table.editCode || table.deleteCode) && (
                            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {table.viewCode && (
                                <label
                                  className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                    permissions.includes(table.viewCode)
                                      ? 'border-[#b8d2ff] bg-[#f3f7ff]'
                                      : 'border-[#e8eef3] bg-white hover:bg-[#fafbfc]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions.includes(table.viewCode)}
                                    onChange={() => togglePermission(table.viewCode!)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                                      <Eye className="h-3 w-3 text-blue-600" />
                                      {table.viewLabel || 'Просмотр'}
                                    </span>
                                    <span className="mt-1 block font-mono text-[9px] text-[#718296]">
                                      {table.viewCode}
                                    </span>
                                  </div>
                                </label>
                              )}

                              {table.createCode && (
                                <label
                                  className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                    permissions.includes(table.createCode)
                                      ? 'border-[#b8d2ff] bg-[#f3f7ff]'
                                      : 'border-[#e8eef3] bg-white hover:bg-[#fafbfc]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions.includes(table.createCode)}
                                    onChange={() => togglePermission(table.createCode!)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                                      <Plus className="h-3 w-3 text-emerald-600" />
                                      {table.createLabel || 'Создание'}
                                    </span>
                                    <span className="mt-1 block font-mono text-[9px] text-[#718296]">
                                      {table.createCode}
                                    </span>
                                  </div>
                                </label>
                              )}

                              {table.editCode && (
                                <label
                                  className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                    permissions.includes(table.editCode)
                                      ? 'border-[#b8d2ff] bg-[#f3f7ff]'
                                      : 'border-[#e8eef3] bg-white hover:bg-[#fafbfc]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions.includes(table.editCode)}
                                    onChange={() => togglePermission(table.editCode!)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                                      <Wrench className="h-3 w-3 text-amber-600" />
                                      {table.editLabel || 'Редактирование'}
                                    </span>
                                    <span className="mt-1 block font-mono text-[9px] text-[#718296]">
                                      {table.editCode}
                                    </span>
                                  </div>
                                </label>
                              )}

                              {table.deleteCode && (
                                <label
                                  className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                    permissions.includes(table.deleteCode)
                                      ? 'border-[#b8d2ff] bg-[#f3f7ff]'
                                      : 'border-[#e8eef3] bg-white hover:bg-[#fafbfc]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions.includes(table.deleteCode)}
                                    onChange={() => togglePermission(table.deleteCode!)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                                      <Trash2 className="h-3 w-3 text-rose-600" />
                                      {table.deleteLabel || 'Удаление'}
                                    </span>
                                    <span className="mt-1 block font-mono text-[9px] text-[#718296]">
                                      {table.deleteCode}
                                    </span>
                                  </div>
                                </label>
                              )}
                            </div>
                          )}

                          {/* Special Actions / Sub-features */}
                          {table.specialActions && table.specialActions.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {table.specialActions.map((sa) => {
                                const isChecked = permissions.includes(sa.code);
                                return (
                                  <label
                                    key={sa.code}
                                    className={`flex cursor-pointer select-none items-start gap-3 rounded-lg border p-2.5 transition-colors ${
                                      isChecked
                                        ? 'border-[#b8d2ff] bg-[#f3f7ff]'
                                        : 'border-[#e8eef3] bg-white hover:bg-[#fafbfc]'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(sa.code)}
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cfd8e1] text-[#467aff] focus:ring-[#467aff]"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-gray-900 leading-tight">
                                        {sa.label}
                                      </p>
                                      <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                                        {sa.description}
                                      </p>
                                      <span className="mt-1 inline-block rounded bg-[#f1f4f8] px-1.5 py-0.5 font-mono text-[9px] text-[#637286]">
                                        {sa.code}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              По запросу «{searchQuery}» разрешений не найдено.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
