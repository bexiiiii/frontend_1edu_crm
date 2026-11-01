'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { redListService } from '@/lib/api';
import type { RedListDto } from '@/lib/api/types';
import { getErrorMessage, isApiErrorCode } from '@/lib/error-message';
import { useAuthStore } from '@/store/authStore';

/** Who may put students into / take them out of the red list (teachers only on their own courses — checked by the backend). */
export function canManageRedList(roles: string[]): boolean {
  return roles.some((role) => ['TENANT_ADMIN', 'ADMIN', 'MANAGER', 'TEACHER'].includes(role));
}

export function formatRedListDate(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}.${month}.${year}` : value;
}

/** «Редлист с 01.11.2026» / «Редлист 01.11.2026 – 15.11.2026» */
export function formatRedListPeriod(fromDate: string | null | undefined, toDate: string | null | undefined): string {
  if (!fromDate) return 'Редлист';
  return toDate
    ? `Редлист ${formatRedListDate(fromDate)} – ${formatRedListDate(toDate)}`
    : `Редлист с ${formatRedListDate(fromDate)}`;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type RedListModalTarget =
  | {
      mode: 'add';
      studentId: string;
      studentName: string;
      courseId: string;
      groupId?: string | null;
      courseName?: string | null;
      /** Default first red-listed day (e.g. the lesson date); today when omitted. */
      defaultDate?: string;
    }
  | {
      mode: 'close';
      redListId: string;
      studentName: string;
      fromDate: string;
      courseName?: string | null;
    };

interface RedListModalProps {
  target: RedListModalTarget | null;
  onClose: () => void;
  onDone: (result: RedListDto) => void | Promise<void>;
}

/**
 * «В редлист с даты» / «Вывести из редлиста». While a student is in the red list,
 * lessons of the period are not marked, not billed and not paid to the teacher.
 */
export function RedListModal({ target, onClose, onDone }: RedListModalProps) {
  // Backdating and lock overrides are TENANT_ADMIN-only on the backend.
  const isTenantAdmin = useAuthStore((s) => s.roles.includes('TENANT_ADMIN'));
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasMarks, setHasMarks] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form whenever a different target is opened.
  const currentKey = target
    ? target.mode === 'add'
      ? `add:${target.studentId}:${target.courseId}:${target.defaultDate ?? ''}`
      : `close:${target.redListId}`
    : null;
  if (currentKey !== targetKey) {
    setTargetKey(currentKey);
    const suggested = target?.mode === 'add' ? target.defaultDate || todayIso() : todayIso();
    // Non-admins cannot pick a date before today.
    setDate(!isTenantAdmin && suggested < todayIso() ? todayIso() : suggested);
    setReason('');
    setError(null);
    setHasMarks(false);
    setIsLocked(false);
    setUnlockReason('');
  }

  if (!target) return null;

  const submit = async (force = false) => {
    if (!date) {
      setError('Укажите дату');
      return;
    }
    if ((force || isLocked) && !unlockReason.trim()) {
      setError('Укажите причину снятия блокировки');
      return;
    }
    const unlock = unlockReason.trim() || undefined;
    setSaving(true);
    setError(null);
    try {
      const response = target.mode === 'add'
        ? await redListService.create(
            {
              studentId: target.studentId,
              courseId: target.courseId,
              groupId: target.groupId || undefined,
              fromDate: date,
              reason: reason.trim() || undefined,
              force: force || undefined,
              unlockReason: unlock,
            },
            { skipErrorToast: true }
          )
        : await redListService.close(
            target.redListId,
            { returnDate: date, reason: reason.trim() || undefined, unlockReason: unlock },
            { skipErrorToast: true }
          );
      await onDone(response.data);
      onClose();
    } catch (submitError) {
      setHasMarks(target.mode === 'add' && isApiErrorCode(submitError, 'RED_LIST_HAS_MARKS'));
      setIsLocked(
        isApiErrorCode(submitError, 'ATTENDANCE_LOCKED_PAID_MONTH')
          || isApiErrorCode(submitError, 'ATTENDANCE_LOCKED_SALARY_PAID')
      );
      setError(getErrorMessage(submitError, 'Не удалось сохранить редлист.'));
    } finally {
      setSaving(false);
    }
  };

  const isAdd = target.mode === 'add';

  return (
    <Modal
      isOpen
      onClose={saving ? () => undefined : onClose}
      title={isAdd ? 'В редлист с даты' : 'Вывести из редлиста'}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          {isAdd && hasMarks && isTenantAdmin ? (
            <Button variant="secondary" onClick={() => submit(true)} disabled={saving}>
              Удалить отметки и поставить
            </Button>
          ) : null}
          <Button onClick={() => submit(false)} disabled={saving}>
            {saving ? 'Сохраняем...' : isAdd ? 'В редлист' : 'Вывести'}
          </Button>
        </>
      }
    >
      <div className="space-y-1 text-sm text-[#5d6676]">
        <p>
          <span className="font-semibold text-[#273142]">{target.studentName}</span>
          {target.courseName ? <> — {target.courseName}</> : null}
        </p>
        {isAdd ? (
          <p className="text-xs text-[#7f8794]">
            С этой даты и до вывода из редлиста посещаемость ученика по курсу не отмечается, оплата за
            занятия не начисляется, преподавателю за этого ученика не платится. Запланированные отметки
            с этой даты будут удалены.
          </p>
        ) : (
          <p className="text-xs text-[#7f8794]">
            В редлисте с {formatRedListDate(target.fromDate)}. Последним днём редлиста станет день перед
            датой возвращения.
          </p>
        )}
      </div>

      <Input
        type="date"
        label={isAdd ? 'Первый день редлиста' : 'Дата возвращения (первый день на занятиях)'}
        value={date}
        min={
          isTenantAdmin
            ? (isAdd ? undefined : target.fromDate)
            : !isAdd && target.fromDate > todayIso() ? target.fromDate : todayIso()
        }
        onChange={(event) => setDate(event.target.value)}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[#5d6676]">Причина</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={isAdd ? 'Например: долг по оплате, пропал без предупреждения' : 'Необязательно'}
          className="crm-textarea resize-none"
        />
      </div>

      {!isTenantAdmin ? (
        <p className="text-xs text-[#7f8794]">Дату раньше сегодняшней может выбрать только администратор.</p>
      ) : null}

      {isTenantAdmin && (hasMarks || isLocked) ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-[#5d6676]">
            Причина снятия блокировки (запишется в журнал)
          </label>
          <textarea
            rows={2}
            value={unlockReason}
            onChange={(event) => setUnlockReason(event.target.value)}
            className="crm-textarea resize-none"
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {hasMarks && !isTenantAdmin ? (
            <p className="mt-1 text-xs">Удалить уже проставленные отметки может только администратор.</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

/** Red «Редлист» chip shown instead of the attendance control. */
export function RedListChip({ fromDate, toDate, compact = false }: { fromDate?: string | null; toDate?: string | null; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-red-300 bg-red-50 font-semibold text-red-700 ${
        compact ? 'w-full justify-center px-1 py-1.5 text-[11px]' : 'px-2 py-1 text-xs'
      }`}
      title={`${formatRedListPeriod(fromDate, toDate)}: отметки не ставятся, оплата не начисляется`}
    >
      {compact ? 'Редлист' : formatRedListPeriod(fromDate, toDate)}
    </span>
  );
}
