'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { studentsService, type StudentRestoreOptionsDto } from '@/lib/api/students';
import { pushToast } from '@/lib/toast';
import { getErrorMessage } from '@/lib/error-message';
import { useAuthStore } from '@/store/authStore';

/** Who may restore: the same people who may delete a student. */
export function useCanRestoreStudents(): boolean {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  return Boolean(
    roles?.includes('TENANT_ADMIN') ||
      user?.roles?.includes('TENANT_ADMIN') ||
      permissions?.includes('STUDENTS_DELETE'),
  );
}

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const formatRu = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

interface RestoreStudentModalProps {
  student: { id: string; name: string } | null;
  onClose: () => void;
  onRestored: () => void | Promise<void>;
}

/**
 * «Восстановить» a deleted student. History (attendance, payments) was never
 * removed. Groups closed by the deletion are offered unchecked; each checked
 * group is returned from the chosen date as a new period (like «Вернуть в
 * группу с даты»), so lessons between deletion and return are not billed.
 */
export function RestoreStudentModal({ student, onClose, onRestored }: RestoreStudentModalProps) {
  const [options, setOptions] = useState<StudentRestoreOptionsDto | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [busy, setBusy] = useState(false);

  const studentId = student?.id;
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setOptions(null);
    setLoadError('');
    setSelected([]);
    studentsService
      .restoreOptions(studentId)
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        setOptions(data);
        const today = todayIso();
        setFromDate(data.earliestReturnDate > today ? data.earliestReturnDate : today);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, 'Не удалось загрузить группы ученика'));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const toggle = (groupId: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, groupId] : current.filter((id) => id !== groupId)));

  const dateTooEarly = Boolean(options && selected.length > 0 && fromDate && fromDate < options.earliestReturnDate);

  const submit = async () => {
    if (!student) return;
    if (selected.length > 0 && (!fromDate || dateTooEarly)) return;
    setBusy(true);
    try {
      await studentsService.restore(student.id, {
        groupIds: selected,
        fromDate: selected.length > 0 ? fromDate : undefined,
      });
      pushToast({
        message:
          selected.length > 0
            ? `Ученик восстановлен и возвращён в группы с ${formatRu(fromDate)}.`
            : 'Ученик восстановлен. В группы его можно вернуть позже.',
        tone: 'success',
      });
      onClose();
      await onRestored();
    } catch (err) {
      pushToast({ message: getErrorMessage(err, 'Не удалось восстановить ученика'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={close}
      title="Восстановить ученика"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button
            icon={RotateCcw}
            onClick={() => void submit()}
            disabled={busy || !options || (selected.length > 0 && (!fromDate || dateTooEarly))}
          >
            {busy ? 'Восстанавливаем...' : 'Восстановить'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#516073]">
        <span className="font-semibold text-[#1f2530]">{student?.name}</span> снова станет активным.
        Посещения и оплаты до удаления остаются как были.
      </p>

      {loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      ) : !options ? (
        <div className="flex items-center gap-2 text-sm text-[#8c95a3]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Загружаем группы...
        </div>
      ) : options.groups.length === 0 ? (
        <p className="text-sm text-[#8c95a3]">При удалении ученик не состоял в группах.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1f2530]">Вернуть в группы</p>
            {options.groups.map((group) => (
              <Checkbox
                key={group.groupId}
                label={group.courseName ? `${group.groupName} · ${group.courseName}` : group.groupName}
                checked={selected.includes(group.groupId)}
                onChange={(checked) => toggle(group.groupId, checked)}
              />
            ))}
          </div>
          {selected.length > 0 ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[#1f2530]">С какой даты вернуть</span>
              <input
                type="date"
                value={fromDate}
                min={options.earliestReturnDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-lg border border-[#cfd8e1] bg-white px-3 py-2 text-sm text-[#273142] focus:border-[#467aff] focus:outline-none"
              />
              <span className={`block text-xs ${dateTooEarly ? 'text-red-600' : 'text-[#8c95a3]'}`}>
                {dateTooEarly
                  ? `Не раньше ${formatRu(options.earliestReturnDate)}: ученик удалён ${formatRu(options.deletedOn)}.`
                  : 'Уроки с даты удаления до этой даты не попадут в журнал и не будут начислены.'}
              </span>
            </label>
          ) : (
            <p className="text-xs text-[#8c95a3]">Без отмеченных групп вернётся только карточка ученика.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
