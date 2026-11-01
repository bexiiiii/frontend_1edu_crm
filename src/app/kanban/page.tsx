'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { Select } from '@/components/ui/Select';
import {
	leadsService,
	staffService,
	studentsService,
	type CreateLeadRequest,
	type CreateStudentRequest,
	type UpdateLeadRequest,
} from '@/lib/api';
import { useApi, useMutation } from '@/hooks/useApi';
import type { LeadDto, LeadStage } from '@/lib/api/types';
import { useAuthStore } from '@/store/authStore';

type LeadFormValues = {
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  email: string;
  source: string;
  courseInterest: string;
  assignedTo: string;
  notes: string;
  stage: LeadStage;
};

type LeadBoardCard = LeadDto & {
  displayName: string;
  assignedToName: string;
};

type LeadColumn = {
  stage: LeadStage;
  title: string;
  titleTone: string;
  accent: string;
  emptyLabel: string;
  leads: LeadBoardCard[];
};

type KanbanColumnPreferences = {
  titles: Partial<Record<LeadStage, string>>;
  hiddenStages: LeadStage[];
};

const DEFAULT_COLUMN_PREFERENCES: KanbanColumnPreferences = {
  titles: {},
  hiddenStages: [],
};

const PHONE_WITH_COUNTRY_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_LATIN_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const STAGE_COLUMNS: Omit<LeadColumn, 'leads'>[] = [
  {
    stage: 'TESTS',
    title: 'Тесты',
    titleTone: 'border border-[#cbd5ff] bg-[#eff2ff] text-[#4d5fc0]',
    accent: 'bg-[#f7f8ff]',
    emptyLabel: 'Результатов тестов пока нет',
  },
  {
    stage: 'NEW',
    title: 'Новый лид',
    titleTone: 'border border-[#8ce8df] bg-[#e6fbf7] text-[#0f9f93]',
    accent: 'bg-[#f5f8fb]',
    emptyLabel: 'Новых лидов пока нет',
  },
  {
    stage: 'CONTACTED',
    title: 'Связались',
    titleTone: 'border border-[#ffd2a9] bg-[#fff4e8] text-[#c26a1b]',
    accent: 'bg-[#f8f9fc]',
    emptyLabel: 'Звонков пока нет',
  },
  {
    stage: 'QUALIFIED',
    title: 'Квалифицирован',
    titleTone: 'border border-[#bfd8ff] bg-[#ecf4ff] text-[#2b6ecb]',
    accent: 'bg-[#f3f9ff]',
    emptyLabel: 'Подходящих лидов пока нет',
  },
  {
    stage: 'TRIAL',
    title: 'Пробный урок',
    titleTone: 'border border-[#b6f0cb] bg-[#eefdf3] text-[#2f9d5b]',
    accent: 'bg-[#f1fbf7]',
    emptyLabel: 'Пробных уроков пока нет',
  },
  {
    stage: 'NEGOTIATION',
    title: 'Переговоры',
    titleTone: 'border border-[#fde3a7] bg-[#fff8e6] text-[#b68b1f]',
    accent: 'bg-[#fffaf0]',
    emptyLabel: 'Переговоров пока нет',
  },
  {
    stage: 'WON',
    title: 'Успешно',
    titleTone: 'border border-[#a7ecd6] bg-[#e8fbf4] text-[#138e6d]',
    accent: 'bg-[#effbf7]',
    emptyLabel: 'Успешных лидов пока нет',
  },
  {
    stage: 'LOST',
    title: 'Потерян',
    titleTone: 'border border-[#ffc4cd] bg-[#ffeef0] text-[#c65367]',
    accent: 'bg-[#fff3f3]',
    emptyLabel: 'Потерянных лидов пока нет',
  },
];

function getLeadFullName(lead: Pick<LeadDto, 'fullName' | 'firstName' | 'lastName' | 'middleName'>): string {
  const fallback = [lead.lastName, lead.firstName, lead.middleName].filter(Boolean).join(' ').trim();
  if (fallback) return fallback;
  if (lead.fullName?.trim()) return lead.fullName.trim();
  return fallback || 'Без имени';
}

type FormDataField = { key?: string; label: string; value: string };

function parseFormData(value?: string | null): FormDataField[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FormDataField =>
        Boolean(item) && typeof item === 'object' && typeof (item as FormDataField).label === 'string' && typeof (item as FormDataField).value === 'string'
    );
  } catch {
    return [];
  }
}

function isRegistrationLead(lead: LeadDto) {
  if (lead.source !== 'WEB_FORM') return false;
  const formIdentity = `${lead.formTitle || ''} ${lead.courseInterest || ''}`;
  return /регистрац|тіркеу/i.test(formIdentity);
}

function findFormValue(fields: FormDataField[], key: string, labelPattern: RegExp) {
  return fields.find((field) => field.key === key)?.value
    || fields.find((field) => labelPattern.test(field.label))?.value
    || '';
}

function toStudentPayload(lead: LeadBoardCard): CreateStudentRequest {
  const fields = parseFormData(lead.formData);
  const parentName = findFormValue(fields, 'parent_name_1', /родитель\s*\(i\)|ата-ана.*\(i\)/i);
  const parentPhone = findFormValue(fields, 'parent_phone_1', /номер телефона\s*\(i\)|телефон.*\(i\)/i);
  const secondParentName = findFormValue(fields, 'parent_name_2', /родитель\s*\(ii\)|ата-ана.*\(ii\)/i);
  const secondParentPhone = findFormValue(fields, 'parent_phone_2', /номер телефона\s*\(ii\)|телефон.*\(ii\)/i);
  const mappedKeys = new Set(['birth_date', 'address', 'parent_name_1', 'parent_phone_1', 'parent_name_2', 'parent_phone_2', 'school_name', 'grade', 'comments']);
  const remainingFormData = fields
    .filter((field) => !field.key || !mappedKeys.has(field.key))
    .map((field) => `${field.label}: ${field.value}`);
  if (secondParentName || secondParentPhone) {
    remainingFormData.push(`Второй родитель: ${[secondParentName, secondParentPhone].filter(Boolean).join(', ')}`);
  }
  if (lead.courseInterest) {
    remainingFormData.unshift(`Интерес к курсу: ${lead.courseInterest}`);
  }

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    middleName: lead.middleName || undefined,
    phone: lead.phone || undefined,
    studentPhone: lead.phone || undefined,
    email: lead.email || undefined,
    birthDate: findFormValue(fields, 'birth_date', /туылған күні|день рождения/i) || undefined,
    address: findFormValue(fields, 'address', /мекен-жайы|адрес/i) || undefined,
    parentName: parentName || undefined,
    parentPhone: parentPhone || undefined,
    school: findFormValue(fields, 'school_name', /мектеп|школа|жұмыс орны/i) || undefined,
    grade: findFormValue(fields, 'grade', /сынып|класс/i) || undefined,
    comment: findFormValue(fields, 'comments', /сұрақтар|вопросы.*предложения/i) || undefined,
    additionalPhones: secondParentPhone ? [secondParentPhone] : undefined,
    additionalInfo: remainingFormData.join('\n') || undefined,
    notes: lead.notes || undefined,
  };
}

function getStaffFullName(staff: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return [staff.lastName, staff.firstName, staff.middleName].filter(Boolean).join(' ').trim()
    || staff.fullName?.trim()
    || '';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return formatter.format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
}

function getDefaultLeadForm(stage: LeadStage = 'NEW'): LeadFormValues {
  return {
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    email: '',
    source: '',
    courseInterest: '',
    assignedTo: '',
    notes: '',
    stage,
  };
}

function toFormValues(lead: LeadBoardCard): LeadFormValues {
  return {
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    middleName: lead.middleName || '',
    phone: lead.phone || '',
    email: lead.email || '',
    source: lead.source || '',
    courseInterest: lead.courseInterest || '',
    assignedTo: lead.assignedTo || '',
    notes: lead.notes || '',
    stage: lead.stage,
  };
}

function buildCreatePayload(values: LeadFormValues): CreateLeadRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    middleName: values.middleName.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    source: values.source.trim() || undefined,
    courseInterest: values.courseInterest.trim() || undefined,
    notes: values.notes.trim() || undefined,
    assignedTo: values.assignedTo || undefined,
  };
}

function buildUpdatePayload(values: LeadFormValues): UpdateLeadRequest {
  const phone = values.phone.trim();
  const email = values.email.trim();
  const source = values.source.trim();
  const courseInterest = values.courseInterest.trim();
  const notes = values.notes.trim();

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    middleName: values.middleName.trim() || null,
    phone: phone || null,
    email: email || null,
    source: source || null,
    courseInterest: courseInterest || null,
    notes: notes || null,
    assignedTo: values.assignedTo || null,
    stage: values.stage,
  };
}

function LeadCardItem({
  lead,
  onOpen,
  onDelete,
  onChangeStage,
  onConvert,
  stageOptions,
  isMovingStage,
  isDeleting,
  isConverting,
}: {
  lead: LeadBoardCard;
  onOpen: (lead: LeadBoardCard) => void;
  onDelete: (lead: LeadBoardCard) => void;
  onChangeStage: (lead: LeadBoardCard, stage: LeadStage) => void;
  /** Absent when the user may not convert leads (needs LEADS_EDIT). */
  onConvert?: (lead: LeadBoardCard) => void;
  stageOptions: Array<Pick<LeadColumn, 'stage' | 'title'>>;
  isMovingStage: boolean;
  isDeleting: boolean;
  isConverting: boolean;
}) {
  return (
    <article
      draggable={!isMovingStage && !isDeleting && !isConverting}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-xl border border-[#dbe4ec] bg-white p-4 shadow-[0_1px_2px_rgba(14,23,38,0.06)] cursor-grab active:cursor-grabbing ${
        isMovingStage || isDeleting || isConverting ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#1f2937]">{lead.displayName}</h3>
          <p className="mt-1 text-sm text-[#5f6b7b]">{lead.phone || lead.email || 'Без контакта'}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpen(lead)}
            className="rounded-lg border border-[#dbe4ec] p-2 text-[#4b5565] transition-colors hover:bg-[#f4f7f9]"
            aria-label="Открыть лид"
            title="Открыть"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-[#3f4a59]">
        {lead.formTitle ? (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[#8a93a3]">Форма</dt>
            <dd className="text-right font-medium">{lead.formTitle}</dd>
          </div>
        ) : null}
        {lead.testLevel || lead.testScore !== null ? (
          <div className="rounded-lg border border-[#dce4ff] bg-[#f6f8ff] px-3 py-2 text-[#4253af]">
            <div className="flex items-center justify-between gap-3 font-semibold">
              <span>{lead.testLevel || 'Результат теста'}</span>
              <span>{lead.testScore ?? 0}/{lead.testMaxScore ?? 0}</span>
            </div>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8a93a3]">Ответственный</dt>
          <dd className="text-right font-medium">
            {lead.assignedTo ? (
              <Link
                href={`/staff/${lead.assignedTo}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[#467aff] hover:underline"
              >
                {lead.assignedToName}
              </Link>
            ) : (
              lead.assignedToName
            )}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8a93a3]">Источник</dt>
          <dd className="text-right font-medium">{lead.source || '—'}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8a93a3]">Интерес</dt>
          <dd className="text-right font-medium">{lead.courseInterest || '—'}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8a93a3]">Создан</dt>
          <dd className="text-right font-medium">{formatDateTime(lead.createdAt)}</dd>
        </div>
      </dl>

      {lead.notes ? (
        <div className="mt-4 rounded-lg bg-[#f8fbfd] px-3 py-2 text-xs text-[#526072]">
          {lead.notes}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <select
          value={lead.stage}
          onChange={(event) => onChangeStage(lead, event.target.value as LeadStage)}
          disabled={isMovingStage}
          className="h-9 flex-1 rounded-lg border border-[#dbe4ec] bg-white px-3 text-sm text-[#3d4756] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {stageOptions.map((stage) => (
            <option key={stage.stage} value={stage.stage}>
              {stage.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onDelete(lead)}
          disabled={isDeleting}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3c4c4] text-[#c85151] transition-colors hover:bg-[#fff3f3] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Удалить лид"
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {onConvert && isRegistrationLead(lead) && !lead.studentId ? (
        <button
          type="button"
          onClick={() => onConvert(lead)}
          disabled={isConverting}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#a9dfc0] bg-[#f1fbf5] px-3 text-sm font-semibold text-[#187346] transition-colors hover:bg-[#e3f7eb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {isConverting ? 'Создаём ученика...' : 'Создать ученика'}
        </button>
      ) : null}

      <div className="mt-3 border-t border-[#edf1f5] pt-3 text-[11px] text-[#8a93a3]">
        Обновлено {formatDateTime(lead.updatedAt)}
      </div>
    </article>
  );
}

function LeadColumnCard({
  column,
  onAddLead,
  onOpenLead,
  onDeleteLead,
  onChangeStage,
  onConvertLead,
  onDropLead,
  activeStageId,
  activeDeleteId,
  activeConvertId,
  canManageColumns,
  onRenameColumn,
  onRemoveColumn,
  stageOptions,
}: {
  column: LeadColumn;
  onAddLead: (stage: LeadStage) => void;
  onOpenLead: (lead: LeadBoardCard) => void;
  onDeleteLead: (lead: LeadBoardCard) => void;
  onChangeStage: (lead: LeadBoardCard, stage: LeadStage) => void;
  onConvertLead?: (lead: LeadBoardCard) => void;
  onDropLead: (leadId: string, stage: LeadStage) => void;
  activeStageId: string | null;
  activeDeleteId: string | null;
  activeConvertId: string | null;
  canManageColumns: boolean;
  onRenameColumn: (stage: LeadStage, title: string) => void;
  onRemoveColumn: (stage: LeadStage) => void;
  stageOptions: Array<Pick<LeadColumn, 'stage' | 'title'>>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);

  useEffect(() => {
    setDraftTitle(column.title);
  }, [column.title]);

  const saveTitle = () => {
    const nextTitle = draftTitle.trim();
    if (nextTitle) {
      onRenameColumn(column.stage, nextTitle);
    } else {
      setDraftTitle(column.title);
    }
    setIsEditingTitle(false);
  };

  return (
    <section className="flex h-full w-72 shrink-0 flex-col rounded-2xl border border-[#dfe6ed] bg-[#f8fafc] p-3 sm:w-80 lg:w-85">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isEditingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveTitle();
                if (event.key === 'Escape') {
                  setDraftTitle(column.title);
                  setIsEditingTitle(false);
                }
              }}
              aria-label="Название статуса"
              className="h-7 w-35 rounded-lg border border-[#86a8ff] bg-white px-2 text-xs font-semibold text-[#2d4e9d] outline-none ring-2 ring-[#dbe7ff]"
            />
          ) : (
            <button
              type="button"
              onClick={() => canManageColumns && setIsEditingTitle(true)}
              disabled={!canManageColumns}
              title={canManageColumns ? 'Нажмите, чтобы переименовать статус' : column.title}
              className={`inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${column.titleTone} ${canManageColumns ? 'cursor-text hover:brightness-[0.98]' : ''}`}
            >
              {column.title}
              {canManageColumns ? <Pencil className="h-3 w-3 opacity-65" /> : null}
            </button>
          )}
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-1.5 text-xs font-semibold text-[#5e6a7a]">
            {column.leads.length}
          </span>
        </div>
        {canManageColumns && column.stage !== 'NEW' ? (
          <button
            type="button"
            onClick={() => onRemoveColumn(column.stage)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9aa4b2] transition-colors hover:bg-[#fff0f1] hover:text-[#d25563]"
            aria-label={`Удалить колонку «${column.title}»`}
            title="Удалить колонку"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <button
        type="button"
        onClick={() => onAddLead(column.stage)}
        className="mt-3 inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4ec] bg-white px-3 text-xs font-semibold text-[#4b5565] transition-colors hover:bg-[#f2f6fa]"
      >
        <Plus className="h-3.5 w-3.5" />
        Добавить
      </button>

      <div
        className={`mt-3 flex-1 overflow-hidden rounded-xl p-2 transition-colors ${
          isDragOver ? 'ring-2 ring-inset ring-[#467aff] bg-[#eff4ff]' : column.accent
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          // We only want to hide the hover effect if we actually leave the column container
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const leadId = e.dataTransfer.getData('text/plain');
          if (leadId) {
            onDropLead(leadId, column.stage);
          }
        }}
      >
        <div className="h-full space-y-2 overflow-y-auto pr-1">
          {column.leads.length > 0 ? (
            column.leads.map((lead) => (
              <LeadCardItem
                key={lead.id}
                lead={lead}
                onOpen={onOpenLead}
                onDelete={onDeleteLead}
                onChangeStage={onChangeStage}
                onConvert={onConvertLead}
                stageOptions={stageOptions}
                isMovingStage={activeStageId === lead.id}
                isDeleting={activeDeleteId === lead.id}
                isConverting={activeConvertId === lead.id}
              />
            ))
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-[#d6dee8] bg-white/80 px-3 text-center text-xs text-[#8a93a3] sm:min-h-70">
              <span>{column.emptyLabel}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LeadFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConvert,
  initialValues,
  formLead,
  assignees,
  isSubmitting,
  isDeleting,
  isConverting,
  title,
  stageOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: LeadFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onConvert?: () => Promise<void>;
  initialValues: LeadFormValues;
  formLead: LeadBoardCard | null;
  assignees: Array<{ id: string; name: string }>;
  isSubmitting: boolean;
  isDeleting: boolean;
  isConverting: boolean;
  title: string;
  stageOptions: Array<Pick<LeadColumn, 'stage' | 'title'>>;
}) {
  const [firstName, setFirstName] = useState(initialValues.firstName);
  const [lastName, setLastName] = useState(initialValues.lastName);
  const [middleName, setMiddleName] = useState(initialValues.middleName);
  const [phone, setPhone] = useState(initialValues.phone);
  const [email, setEmail] = useState(initialValues.email);
  const [source, setSource] = useState(initialValues.source);
  const [courseInterest, setCourseInterest] = useState(initialValues.courseInterest);
  const [assignedTo, setAssignedTo] = useState(initialValues.assignedTo);
  const [notes, setNotes] = useState(initialValues.notes);
  const [stage, setStage] = useState<LeadStage>(initialValues.stage);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone: boolean; email: boolean }>({
    phone: false,
    email: false,
  });

  const handleSave = async () => {
    setError(null);
    setFieldErrors({ phone: false, email: false });

    if (!firstName.trim()) {
      setError('Имя лида обязательно.');
      return;
    }

    if (!lastName.trim()) {
      setError('Фамилия лида обязательна.');
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    const normalizedEmail = email.trim();

    if (normalizedPhone && !PHONE_WITH_COUNTRY_REGEX.test(normalizedPhone)) {
      setFieldErrors((prev) => ({ ...prev, phone: true }));
      setError('Введите корректный номер с кодом страны (например, +998901234567).');
      return;
    }

    if (normalizedEmail && !EMAIL_LATIN_REGEX.test(normalizedEmail)) {
      setFieldErrors((prev) => ({ ...prev, email: true }));
      setError('Email должен быть на латинице и в корректном формате (name@example.com).');
      return;
    }

    try {
      await onSave({
        firstName,
        lastName,
        middleName,
        phone: normalizedPhone,
        email: normalizedEmail,
        source,
        courseInterest,
        assignedTo,
        notes,
        stage,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Не удалось сохранить лид. Попробуйте ещё раз.'));
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Вы уверены, что хотите удалить лид?')) {
      return;
    }

    setError(null);

    try {
      await onDelete();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Не удалось удалить лид. Попробуйте ещё раз.'));
    }
  };

  const handleConvert = async () => {
    if (!onConvert || !confirm('Создать ученика из этой регистрационной заявки? Все данные формы будут перенесены, а лид перейдёт в «Успешный» со ссылкой на ученика.')) {
      return;
    }
    setError(null);
    try {
      await onConvert();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Не удалось создать ученика из лида.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="mr-auto inline-flex h-10 items-center rounded-xl border border-[#f3c4c4] px-4 text-sm font-semibold text-[#c85151] transition-colors hover:bg-[#fff3f3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Удаляем...' : 'Удалить'}
            </button>
          ) : null}
          {onConvert ? (
            <button
              type="button"
              onClick={handleConvert}
              disabled={isSubmitting || isDeleting || isConverting}
              className="mr-auto inline-flex h-10 items-center gap-2 rounded-xl border border-[#a9dfc0] bg-[#f1fbf5] px-4 text-sm font-semibold text-[#187346] transition-colors hover:bg-[#e3f7eb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {isConverting ? 'Создаём ученика...' : 'Создать ученика'}
            </button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting || isDeleting || isConverting}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || isDeleting || isConverting}>
            {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Например, Мария"
          />
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Например, Иванова"
          />
        </div>

        <Input
          label="Отчество"
          value={middleName}
          onChange={(event) => setMiddleName(event.target.value)}
          placeholder="Например, Сергеевна"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhoneInputWithCountry
            label="Телефон"
            value={phone}
            onChange={(nextValue) => {
              setPhone(nextValue);
              setFieldErrors((prev) => ({ ...prev, phone: false }));
            }}
            placeholder="90 123 45 67"
            error={fieldErrors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, email: false }));
            }}
            placeholder="lead@example.com"
            error={fieldErrors.email}
          />
        </div>

        {formLead?.source === 'WEB_FORM' ? (
          <section className="rounded-xl border border-[#dbe4ec] bg-[#f8fbfd] p-4">
            <h3 className="text-sm font-semibold text-[#263343]">Данные из формы</h3>
            <p className="mt-1 text-xs text-[#718096]">{formLead.formTitle || formLead.courseInterest || 'Форма с сайта'}</p>
            {formLead.testLevel || formLead.testScore !== null ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] text-[#8a93a3]">Уровень</p><p className="mt-0.5 text-sm font-semibold text-[#3647a5]">{formLead.testLevel || '—'}</p></div>
                <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] text-[#8a93a3]">Баллы</p><p className="mt-0.5 text-sm font-semibold text-[#3647a5]">{formLead.testScore ?? 0}</p></div>
                <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] text-[#8a93a3]">Максимум</p><p className="mt-0.5 text-sm font-semibold text-[#3647a5]">{formLead.testMaxScore ?? 0}</p></div>
              </div>
            ) : null}
            {parseFormData(formLead.formData).length > 0 ? (
              <dl className="mt-3 divide-y divide-[#e6edf3] overflow-hidden rounded-lg border border-[#e1e9f0] bg-white">
                {parseFormData(formLead.formData).map((field, index) => (
                  <div key={`${field.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3 px-3 py-2 text-sm">
                    <dt className="text-[#718096]">{field.label}</dt>
                    <dd className="break-words text-right font-medium text-[#2d3748]">{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Источник"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Instagram, рекомендация, звонок"
          />
          <Input
            label="Интерес к курсу"
            value={courseInterest}
            onChange={(event) => setCourseInterest(event.target.value)}
            placeholder="Английский, математика"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Стадия" value={stage} onChange={(event) => setStage(event.target.value as LeadStage)}>
            {stageOptions.map((column) => (
              <option key={column.stage} value={column.stage}>
                {column.title}
              </option>
            ))}
          </Select>

          <Select
            label="Ответственный"
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
          >
            <option value="">Не назначен</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Что важно знать по этому лиду"
            className="crm-textarea resize-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default function KanbanPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [activeConvertId, setActiveConvertId] = useState<string | null>(null);
  const [columnPreferences, setColumnPreferences] = useState<KanbanColumnPreferences>(DEFAULT_COLUMN_PREFERENCES);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);
  const [modalState, setModalState] = useState<{
    key: number;
    isOpen: boolean;
    leadId: string | null;
    initialValues: LeadFormValues;
    formLead: LeadBoardCard | null;
    title: string;
  }>({
    key: 0,
    isOpen: false,
    leadId: null,
    initialValues: getDefaultLeadForm(),
    formLead: null,
    title: 'Добавить лид',
  });
  useEffect(() => {
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      setDebouncedSearch('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const { roles, permissions, tenantId, user, userEmail } = useAuthStore();
  const columnStorageKey = `1edu:kanban-columns:${tenantId || 'current-tenant'}`;

  // POST /leads/{id}/convert requires TENANT_ADMIN or LEADS_EDIT.
  const canConvertLeads = roles.includes('TENANT_ADMIN') || permissions.includes('LEADS_EDIT');
  const canViewStaff = roles.includes('TENANT_ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('MANAGER') || permissions.includes('STAFF_VIEW');

  const { data: staffPage } = useApi(
    () => (canViewStaff ? staffService.getAll({ page: 0, size: 500 }) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 500 })),
    [canViewStaff]
  );

  const isManager = useMemo(() => {
    if (roles.includes('MANAGER') || user?.roles?.includes('MANAGER')) return true;
    if (roles.some((r) => r.toUpperCase().includes('MANAGER'))) return true;

    const staffList = staffPage?.content ?? [];
    if (user?.staffId) {
      const staffMember = staffList.find((s) => s.id === user.staffId);
      if (staffMember?.role === 'MANAGER') return true;
    }
    const emailToMatch = userEmail || user?.email;
    if (emailToMatch) {
      const staffMember = staffList.find(
        (s) => s.email && s.email.trim().toLowerCase() === emailToMatch.trim().toLowerCase()
      );
      if (staffMember?.role === 'MANAGER') return true;
    }

    return false;
  }, [roles, user, userEmail, staffPage?.content]);

  // Менеджерам запрещено редактировать названия, удалять или добавлять/восстанавливать колонки
  const canManageColumns = !isManager && (roles.includes('TENANT_ADMIN') || roles.includes('SUPER_ADMIN'));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawValue = window.localStorage.getItem(columnStorageKey);
      if (!rawValue) {
        setColumnPreferences(DEFAULT_COLUMN_PREFERENCES);
        return;
      }
      const parsed = JSON.parse(rawValue) as Partial<KanbanColumnPreferences>;
      const validStages = new Set(STAGE_COLUMNS.map((column) => column.stage));
      setColumnPreferences({
        titles: Object.fromEntries(
          Object.entries(parsed.titles || {}).filter(([stage, title]) => validStages.has(stage as LeadStage) && typeof title === 'string')
        ) as Partial<Record<LeadStage, string>>,
        hiddenStages: Array.isArray(parsed.hiddenStages)
          ? parsed.hiddenStages.filter((stage): stage is LeadStage => validStages.has(stage as LeadStage) && stage !== 'NEW')
          : [],
      });
    } catch {
      setColumnPreferences(DEFAULT_COLUMN_PREFERENCES);
    }
  }, [columnStorageKey]);

  const saveColumnPreferences = (next: KanbanColumnPreferences) => {
    if (!canManageColumns) return;
    setColumnPreferences(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(columnStorageKey, JSON.stringify(next));
    }
  };

  const staffOptions = useMemo(
    () =>
      (staffPage?.content ?? []).map((staff) => ({
        id: staff.id,
        name: getStaffFullName(staff) || staff.email || staff.phone || 'Без имени',
      })),
    [staffPage]
  );

  const staffMap = useMemo(() => new Map(staffOptions.map((staff) => [staff.id, staff.name])), [staffOptions]);

  const { data: leadsPage, loading, error, refetch } = useApi(() => {
    if (debouncedSearch) {
      return leadsService.search(debouncedSearch, { page: 0, size: 500 });
    }

    return leadsService.getAll({ page: 0, size: 500 });
  }, [debouncedSearch]);

  const createMutation = useMutation((data: CreateLeadRequest) => leadsService.create(data));
  const updateMutation = useMutation(({ id, data }: { id: string; data: UpdateLeadRequest }) =>
    leadsService.update(id, data)
  );
  const moveStageMutation = useMutation(({ id, stage }: { id: string; stage: LeadStage }) =>
    leadsService.moveStage(id, stage)
  );
  const deleteMutation = useMutation((id: string) => leadsService.delete(id));
  const createStudentMutation = useMutation((data: CreateStudentRequest) => studentsService.create(data));
  const convertLeadMutation = useMutation(({ id, studentId }: { id: string; studentId: string }) =>
    leadsService.convert(id, studentId)
  );

  const leads = useMemo<LeadBoardCard[]>(
    () =>
      (leadsPage?.content ?? []).map((lead) => ({
        ...lead,
        displayName: getLeadFullName(lead),
        assignedToName: lead.assignedTo ? staffMap.get(lead.assignedTo) || lead.assignedTo : 'Не назначен',
      })),
    [leadsPage, staffMap]
  );

  const allColumns = useMemo<LeadColumn[]>(() => {
    const leadsByStage = new Map<LeadStage, LeadBoardCard[]>();

    for (const lead of leads) {
      const current = leadsByStage.get(lead.stage) ?? [];
      current.push(lead);
      leadsByStage.set(lead.stage, current);
    }

    return STAGE_COLUMNS.map((column) => ({
      ...column,
      title: columnPreferences.titles[column.stage]?.trim() || column.title,
      leads: leadsByStage.get(column.stage) ?? [],
    }));
  }, [columnPreferences.titles, leads]);

  const columns = useMemo(
    () => allColumns.filter((column) => !columnPreferences.hiddenStages.includes(column.stage)),
    [allColumns, columnPreferences.hiddenStages]
  );
  const hiddenColumns = useMemo(
    () => allColumns.filter((column) => columnPreferences.hiddenStages.includes(column.stage)),
    [allColumns, columnPreferences.hiddenStages]
  );

  const stageOptions = useMemo(
    () => allColumns.map(({ stage, title }) => ({ stage, title })),
    [allColumns]
  );

  useEffect(() => {
    const board = boardScrollRef.current;
    if (!board) return;
    const updateWidth = () => setBoardScrollWidth(board.scrollWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(board);
    return () => observer.disconnect();
  }, [columns.length, loading]);

  const syncTopScroll = () => {
    const top = topScrollRef.current;
    const board = boardScrollRef.current;
    if (top && board && board.scrollLeft !== top.scrollLeft) board.scrollLeft = top.scrollLeft;
  };

  const syncBoardScroll = () => {
    const top = topScrollRef.current;
    const board = boardScrollRef.current;
    if (top && board && top.scrollLeft !== board.scrollLeft) top.scrollLeft = board.scrollLeft;
  };

  const closeModal = () => {
    setModalState((previous) => ({
      ...previous,
      isOpen: false,
      leadId: null,
    }));
  };

  const openCreateModal = (stage: LeadStage = 'NEW') => {
    setPageError(null);
    setModalState((previous) => ({
      key: previous.key + 1,
      isOpen: true,
      leadId: null,
      initialValues: getDefaultLeadForm(stage),
      formLead: null,
      title: 'Добавить лид',
    }));
  };

  const openEditModal = (lead: LeadBoardCard) => {
    setPageError(null);
    setModalState((previous) => ({
      key: previous.key + 1,
      isOpen: true,
      leadId: lead.id,
      initialValues: toFormValues(lead),
      formLead: lead,
      title: 'Редактировать лид',
    }));
  };

  const handleSaveLead = async (values: LeadFormValues) => {
    setPageError(null);

    if (modalState.leadId) {
      await updateMutation.mutate({
        id: modalState.leadId,
        data: buildUpdatePayload(values),
      });
      closeModal();
      await refetch();
      return;
    }

    const createdLead = await createMutation.mutate(buildCreatePayload(values));

    if (values.stage !== 'NEW') {
      try {
        await updateMutation.mutate({
          id: createdLead.id,
          data: buildUpdatePayload(values),
        });
      } catch (updateError) {
        setPageError(
          getErrorMessage(
            updateError,
            'Лид создан, но стадия сохранилась не полностью. Проверьте карточку.'
          )
        );
      }
    }

    closeModal();
    await refetch();
  };

  const handleDeleteLead = async (lead?: LeadBoardCard, throwOnError = false) => {
    const target = lead ?? leads.find((item) => item.id === modalState.leadId) ?? null;
    if (!target || !confirm('Вы уверены, что хотите удалить лид?')) {
      return;
    }

    setPageError(null);
    setActiveDeleteId(target.id);

    try {
      await deleteMutation.mutate(target.id);
      if (modalState.leadId === target.id) {
        closeModal();
      }
      await refetch();
    } catch (deleteError) {
      setPageError(getErrorMessage(deleteError, 'Не удалось удалить лид.'));
      if (throwOnError) {
        throw deleteError;
      }
    } finally {
      setActiveDeleteId(null);
    }
  };

  const handleMoveLeadStage = async (lead: LeadBoardCard, stage: LeadStage) => {
    if (lead.stage === stage) {
      return;
    }

    setPageError(null);
    setActiveStageId(lead.id);

    try {
      await moveStageMutation.mutate({ id: lead.id, stage });
      await refetch();
    } catch (moveError) {
      setPageError(getErrorMessage(moveError, 'Не удалось изменить стадию лида.'));
    } finally {
      setActiveStageId(null);
    }
  };

  const handleConvertRegistrationLead = async (lead: LeadBoardCard) => {
    if (!isRegistrationLead(lead)) return;
    setPageError(null);
    setActiveConvertId(lead.id);
    try {
      const student = await createStudentMutation.mutate(toStudentPayload(lead));
      try {
        // The lead is not deleted: it moves to WON with a link to the student (keeps the funnel honest).
        await convertLeadMutation.mutate({ id: lead.id, studentId: student.id });
      } catch (convertLeadError) {
        throw new Error(`Ученик создан, но лид пока не переведён в «Успешный». Переведите лид вручную, чтобы не создать дубль. ${getErrorMessage(convertLeadError, '')}`.trim());
      }
      if (modalState.leadId === lead.id) closeModal();
      await refetch();
    } catch (convertError) {
      setPageError(getErrorMessage(convertError, 'Не удалось создать ученика из регистрационной заявки.'));
      throw convertError;
    } finally {
      setActiveConvertId(null);
    }
  };

  const handleDropLead = async (leadId: string, stage: LeadStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    
    await handleMoveLeadStage(lead, stage);
  };

  const handleRenameColumn = (stage: LeadStage, title: string) => {
    if (!canManageColumns) return;
    saveColumnPreferences({
      ...columnPreferences,
      titles: { ...columnPreferences.titles, [stage]: title },
    });
  };

  const handleHideColumn = async (stage: LeadStage) => {
    if (!canManageColumns || stage === 'NEW') return;
    const target = allColumns.find((column) => column.stage === stage);
    const affectedLeads = leads.filter((lead) => lead.stage === stage);
    const message = affectedLeads.length > 0
      ? `В колонке «${target?.title || 'Статус'}» ${affectedLeads.length} лид(ов). Они будут переведены в «Новый лид», после чего колонка исчезнет. Продолжить?`
      : `Удалить колонку «${target?.title || 'Статус'}» с доски?`;
    if (!confirm(message)) return;

    setPageError(null);
    try {
      for (const lead of affectedLeads) {
        await moveStageMutation.mutate({ id: lead.id, stage: 'NEW' });
      }
      saveColumnPreferences({
        ...columnPreferences,
        hiddenStages: [...new Set([...columnPreferences.hiddenStages, stage])],
      });
      await refetch();
    } catch (moveError) {
      setPageError(getErrorMessage(moveError, 'Не удалось перенести лиды и удалить колонку.'));
    }
  };

  const handleRestoreColumn = (stage: LeadStage) => {
    if (!canManageColumns) return;
    saveColumnPreferences({
      ...columnPreferences,
      hiddenStages: columnPreferences.hiddenStages.filter((item) => item !== stage),
    });
  };

  const totalLeads = leads.length;
  const modalIsSubmitting = createMutation.loading || updateMutation.loading;
  const modalIsDeleting = deleteMutation.loading && activeDeleteId === modalState.leadId;
  const modalIsConverting = activeConvertId === modalState.leadId;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="crm-surface p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#e9faf7] px-3 py-1 text-xs font-semibold text-[#1a9f92]">
              Лидов: {totalLeads}
            </span>
            {debouncedSearch ? (
              <span className="rounded-lg bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#3567c7]">
                Поиск: {totalLeads}
              </span>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:min-w-70">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a93a3]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по ФИО, телефону, email, источнику и интересу"
                className="crm-input pl-10"
              />
            </div>

            <Button variant="secondary" onClick={() => void refetch()} disabled={loading} className="w-full sm:w-auto">
              Обновить
            </Button>
            {canManageColumns ? (
              <Button variant="secondary" onClick={() => setIsColumnManagerOpen((value) => !value)} className="w-full sm:w-auto">
                Колонки
              </Button>
            ) : null}
            <Button icon={Plus} onClick={() => openCreateModal()} className="w-full sm:w-auto">
              Добавить лид
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {pageError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {canManageColumns && isColumnManagerOpen ? (
          <div className="mt-3 rounded-xl border border-[#dce5ee] bg-[#f8fbff] p-3">
            <p className="text-xs font-semibold text-[#536174]">Скрытые колонки</p>
            {hiddenColumns.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {hiddenColumns.map((column) => (
                  <button
                    key={column.stage}
                    type="button"
                    onClick={() => handleRestoreColumn(column.stage)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#cbd9eb] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#44566f] transition-colors hover:bg-[#eef5ff]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Вернуть «{column.title}»
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-[#8491a1]">Скрытых колонок нет. Название колонки меняется нажатием на него.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="crm-surface flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#467aff]" />
          </div>
        ) : (
          <>
            <div
              ref={topScrollRef}
              onScroll={syncTopScroll}
              className="mb-2 h-3 overflow-x-auto overflow-y-hidden rounded-full bg-[#eff3f7]"
              aria-label="Горизонтальная прокрутка канбана"
            >
              <div style={{ width: Math.max(boardScrollWidth, 1), height: 1 }} />
            </div>
            <div ref={boardScrollRef} onScroll={syncBoardScroll} className="flex h-full min-h-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-2">
            {columns.map((column) => (
              <LeadColumnCard
                key={column.stage}
                column={column}
                onAddLead={openCreateModal}
                onOpenLead={openEditModal}
                onDeleteLead={(lead) => void handleDeleteLead(lead)}
                onChangeStage={(lead, stage) => void handleMoveLeadStage(lead, stage)}
                onConvertLead={canConvertLeads ? (lead) => void handleConvertRegistrationLead(lead) : undefined}
                onDropLead={handleDropLead}
                activeStageId={activeStageId}
                activeDeleteId={activeDeleteId}
                activeConvertId={activeConvertId}
                canManageColumns={canManageColumns}
                onRenameColumn={handleRenameColumn}
                onRemoveColumn={(stage) => void handleHideColumn(stage)}
                stageOptions={stageOptions}
              />
            ))}
          </div>
          </>
        )}
      </div>

      <LeadFormModal
        key={modalState.key}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveLead}
        onDelete={modalState.leadId ? () => handleDeleteLead(undefined, true) : undefined}
        onConvert={
          canConvertLeads && modalState.formLead && isRegistrationLead(modalState.formLead) && !modalState.formLead.studentId
            ? () => handleConvertRegistrationLead(modalState.formLead!)
            : undefined
        }
        initialValues={modalState.initialValues}
        formLead={modalState.formLead}
        assignees={staffOptions}
        isSubmitting={modalIsSubmitting}
        isDeleting={Boolean(modalIsDeleting)}
        isConverting={modalIsConverting}
        title={modalState.title}
        stageOptions={stageOptions}
      />
    </div>
  );
}
