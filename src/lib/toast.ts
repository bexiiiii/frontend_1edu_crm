import { getErrorMessage } from './error-message';

export type ToastTone = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
}

type ToastInput = {
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastListener = (toast: Toast) => void;

const listeners = new Set<ToastListener>();

let nextToastId = 1;
let lastToastKey = '';
let lastToastAt = 0;

export function subscribeToToasts(listener: ToastListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function pushToast({ message, tone = 'info', duration = 5000 }: ToastInput) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return;
  }

  const now = Date.now();
  const dedupeKey = `${tone}:${normalizedMessage}`;
  if (dedupeKey === lastToastKey && now - lastToastAt < 1500) {
    return;
  }

  lastToastKey = dedupeKey;
  lastToastAt = now;

  const toast: Toast = {
    id: nextToastId++,
    message: normalizedMessage,
    tone,
    duration,
  };

  listeners.forEach((listener) => listener(toast));
}

export function pushErrorToast(
  error: unknown,
  fallback = 'Произошла ошибка. Попробуйте ещё раз.'
) {
  pushToast({
    message: getErrorMessage(error, fallback),
    tone: 'error',
  });
}
