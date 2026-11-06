'use client';

import axios from 'axios';
import { useCallback, useState } from 'react';
import { Archive, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { COURSE_HAS_DATA, coursesService } from '@/lib/api/courses';
import type { CourseDto, CourseLifecycleResult } from '@/lib/api/types';
import { getErrorMessage, isApiErrorCode } from '@/lib/error-message';
import { pushToast } from '@/lib/toast';

type CourseRef = { id: string; name?: string | null };

const COURSE_HAS_DATA_MESSAGE = 'У курса есть ученики и занятия. Используйте «Остановить курс» или «В архив».';

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatRuDate(iso?: string | null) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}.${month}.${year}` : iso;
}

/** Toast text for an archive / stop / restore result returned by the course API. */
export function describeCourseLifecycle(result?: CourseLifecycleResult | null): string | null {
  if (!result) return null;
  if (result.operation === 'RESTORE') {
    if (!result.restoredActions) {
      return 'Курс снова активен. Данных для восстановления не найдено — учеников добавьте вручную.';
    }
    const parts = [`учеников — ${result.students}`, `абонементов — ${result.subscriptions}`];
    if (result.lessons) parts.push(`занятий — ${result.lessons}`);
    let text = `Курс возобновлён. Восстановлено: ${parts.join(', ')}.`;
    if (result.skippedSubscriptions) {
      text += ` Не восстановлено абонементов: ${result.skippedSubscriptions} (у ученика уже есть новый активный абонемент).`;
    }
    return text;
  }
  const head = result.operation === 'STOP'
    ? `Курс остановлен с ${formatRuDate(result.effectiveDate)}.`
    : 'Курс перенесён в архив.';
  return `${head} Отменено занятий: ${result.lessons}, закрыто абонементов: ${result.subscriptions}. `
    + 'Всё можно вернуть кнопкой «Возобновить».';
}

export function notifyCourseLifecycle(course?: CourseDto | null) {
  const message = describeCourseLifecycle(course?.lifecycle);
  if (message) {
    pushToast({ message, tone: 'success', duration: 7000 });
  }
}

const inputClass =
  'w-full rounded-lg border border-[#cfd8e1] bg-white px-3 py-2 text-sm text-[#273142] focus:border-[#467aff] focus:outline-none';

/**
 * Stop / resume / delete-with-data flows for a course. Render `dialogs` once on the page and call
 * `requestStop`, `requestResume` or `requestDelete`; `onChanged` runs after a successful operation
 * (`deleted` is true when the course was physically removed).
 */
export function useCourseLifecycle(onChanged: (course: CourseDto | null, deleted: boolean) => void | Promise<void>) {
  const [stopTarget, setStopTarget] = useState<CourseRef | null>(null);
  const [resumeTarget, setResumeTarget] = useState<CourseRef | null>(null);
  const [hasDataTarget, setHasDataTarget] = useState<CourseRef | null>(null);
  const [fromDate, setFromDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const requestStop = useCallback((course: CourseRef) => {
    setFromDate(todayIso());
    setReason('');
    setHasDataTarget(null);
    setStopTarget(course);
  }, []);

  const requestResume = useCallback((course: CourseRef) => {
    setFromDate(todayIso());
    setResumeTarget(course);
  }, []);

  const run = async (action: () => Promise<{ data: CourseDto | null }>, deleted: boolean) => {
    setBusy(true);
    try {
      const result = await action();
      notifyCourseLifecycle(result.data);
      await onChanged(result.data, deleted && !result.data);
      return true;
    } catch {
      // The API client already showed the error toast.
      return false;
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = useCallback(async (course: CourseRef) => {
    if (!confirm('Курс будет перенесён в архив: история посещений и оплат сохранится. Продолжить?')) {
      return;
    }
    setBusy(true);
    try {
      const result = await coursesService.delete(course.id);
      setBusy(false);
      if (result.data?.lifecycle) {
        notifyCourseLifecycle(result.data);
      } else if (result.data) {
        // An empty course is archived too (never removed): restorable with «Возобновить».
        pushToast({ message: 'Курс перенесён в архив. Вернуть его можно кнопкой «Возобновить».', tone: 'success' });
      } else {
        pushToast({ message: 'Курс удалён', tone: 'success' });
      }
      await onChanged(result.data ?? null, !result.data);
    } catch (error) {
      setBusy(false);
      if (isApiErrorCode(error, COURSE_HAS_DATA)) {
        setHasDataTarget(course);
      } else if (!axios.isAxiosError(error)) {
        pushToast({ message: getErrorMessage(error, 'Не удалось удалить курс'), tone: 'error' });
      }
    }
  }, [onChanged]);

  const submitStop = async () => {
    if (!stopTarget) return;
    if (!fromDate) {
      pushToast({ message: 'Укажите дату остановки курса', tone: 'error' });
      return;
    }
    // Past lessons stay as they are: a course can be stopped from today on only.
    if (fromDate < todayIso()) {
      pushToast({ message: 'Дата остановки не может быть в прошлом', tone: 'error' });
      return;
    }
    const ok = await run(
      () => coursesService.stop(stopTarget.id, { fromDate, reason: reason.trim() || undefined }),
      false
    );
    if (ok) setStopTarget(null);
  };

  const submitResume = async () => {
    if (!resumeTarget) return;
    if (!fromDate) {
      pushToast({ message: 'Укажите дату возобновления курса', tone: 'error' });
      return;
    }
    const ok = await run(() => coursesService.resume(resumeTarget.id, { fromDate }), false);
    if (ok) setResumeTarget(null);
  };

  const submitArchive = async () => {
    if (!hasDataTarget) return;
    const ok = await run(() => coursesService.delete(hasDataTarget.id, { archive: true }), false);
    if (ok) setHasDataTarget(null);
  };

  const dialogs = (
    <>
      <Modal
        isOpen={Boolean(stopTarget)}
        onClose={() => !busy && setStopTarget(null)}
        title={stopTarget?.name ? `Остановить курс «${stopTarget.name}»` : 'Остановить курс'}
        maxWidth="max-w-lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setStopTarget(null)} disabled={busy}>Отмена</Button>
            <Button icon={PauseCircle} onClick={() => void submitStop()} disabled={busy}>Остановить курс</Button>
          </>
        )}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#273142]" htmlFor="course-stop-date">
            Последний день занятий
          </label>
          <input
            id="course-stop-date"
            type="date"
            min={todayIso()}
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-[#8a93a3]">
            Занятия после этой даты отменятся, расписание и абонементы закроются этой датой.
            Отменённые занятия не оплачиваются. Всё можно вернуть кнопкой «Возобновить».
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#273142]" htmlFor="course-stop-reason">
            Причина
          </label>
          <textarea
            id="course-stop-reason"
            value={reason}
            maxLength={500}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Например: каникулы, преподаватель в отпуске"
            className={inputClass}
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(resumeTarget)}
        onClose={() => !busy && setResumeTarget(null)}
        title={resumeTarget?.name ? `Возобновить курс «${resumeTarget.name}»` : 'Возобновить курс'}
        maxWidth="max-w-lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setResumeTarget(null)} disabled={busy}>Отмена</Button>
            <Button icon={PlayCircle} onClick={() => void submitResume()} disabled={busy}>Возобновить</Button>
          </>
        )}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#273142]" htmlFor="course-resume-date">
            Занятия возобновляются с
          </label>
          <input
            id="course-resume-date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-[#8a93a3]">
            Ученики, расписание и абонементы вернутся как были до остановки. Занятия до этой даты
            остаются отменёнными и не оплачиваются.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(hasDataTarget)}
        onClose={() => !busy && setHasDataTarget(null)}
        title="Курс нельзя удалить"
        maxWidth="max-w-lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setHasDataTarget(null)} disabled={busy}>Отмена</Button>
            <Button
              variant="outline"
              icon={Archive}
              onClick={() => void submitArchive()}
              disabled={busy}
            >
              В архив
            </Button>
            <Button
              icon={PauseCircle}
              onClick={() => hasDataTarget && requestStop(hasDataTarget)}
              disabled={busy}
            >
              Остановить курс
            </Button>
          </>
        )}
      >
        <p className="text-sm text-[#3d4756]">{COURSE_HAS_DATA_MESSAGE}</p>
        <p className="text-xs text-[#8a93a3]">
          «Остановить курс» — пауза с выбранной даты. «В архив» — курс скрывается из работы.
          В обоих случаях ученики и абонементы вернутся при возобновлении.
        </p>
      </Modal>
    </>
  );

  return { requestStop, requestResume, requestDelete, dialogs, busy };
}
