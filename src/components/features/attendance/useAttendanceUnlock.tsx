import { useCallback, useRef, useState } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/error-message';

export const ATTENDANCE_LOCK_CODES = ['ATTENDANCE_LOCKED_PAID_MONTH', 'ATTENDANCE_LOCKED_SALARY_PAID'] as const;

export function getAttendanceLockCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data as { errorCode?: unknown } | undefined;
  const code = typeof data?.errorCode === 'string' ? data.errorCode : null;
  return code && (ATTENDANCE_LOCK_CODES as readonly string[]).includes(code) ? code : null;
}

type PendingUnlock = {
  message: string;
  resolve: (reason: string | null) => void;
};

/**
 * Attendance of a month is locked once the month is paid or the teacher's salary is paid.
 * TENANT_ADMIN may override the lock with a reason: `run` retries the same request with
 * `unlockReason`. Everyone else just gets the original error (its message is shown as usual).
 */
export function useAttendanceUnlock() {
  const isTenantAdmin = useAuthStore((s) => s.roles.includes('TENANT_ADMIN'));
  const [pending, setPending] = useState<PendingUnlock | null>(null);
  const [reason, setReason] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const pendingRef = useRef<PendingUnlock | null>(null);

  const askReason = useCallback((message: string) => {
    return new Promise<string | null>((resolve) => {
      const next = { message, resolve };
      pendingRef.current = next;
      setReason('');
      setPending(next);
    });
  }, []);

  const close = (value: string | null) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  };

  /**
   * Runs `request()`; on an attendance lock lets an admin retry it as `request(reason)`.
   * Pass `requestConfig` to the API call: for an admin it suppresses the global toast for the
   * lock error, since the unlock modal shows that message instead.
   */
  const run = useCallback(
    async <T,>(request: (unlockReason?: string, requestConfig?: AxiosRequestConfig) => Promise<T>): Promise<T> => {
      try {
        return await request(
          undefined,
          isTenantAdmin ? { skipErrorToast: (error) => getAttendanceLockCode(error) !== null } : undefined
        );
      } catch (error) {
        if (!isTenantAdmin || !getAttendanceLockCode(error)) throw error;
        const unlockReason = await askReason(getErrorMessage(error, 'Посещаемость за этот месяц заблокирована'));
        if (!unlockReason) throw error;
        setIsRetrying(true);
        try {
          return await request(unlockReason);
        } finally {
          setIsRetrying(false);
        }
      }
    },
    [askReason, isTenantAdmin]
  );

  const modal = (
    <Modal
      isOpen={pending !== null}
      onClose={() => close(null)}
      title="Посещаемость заблокирована"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(null)} disabled={isRetrying}>
            Отмена
          </Button>
          <Button icon={Lock} onClick={() => close(reason.trim())} disabled={!reason.trim() || isRetrying}>
            Разблокировать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
          {pending?.message}
        </p>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#5d6676]">Причина разблокировки</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Например: исправление ошибки преподавателя"
            className="crm-textarea resize-none"
          />
          <p className="mt-1 text-xs text-[#8a93a3]">Причина сохраняется в журнале действий.</p>
        </div>
      </div>
    </Modal>
  );

  return { run, modal, isTenantAdmin };
}
