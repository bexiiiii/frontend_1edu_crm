export const STUDENT_PAYMENTS_REFRESH_KEY = 'student-payments:last-change';
export const STUDENT_PAYMENTS_REFRESH_EVENT = 'student-payments:refresh';

export function notifyStudentPaymentsChanged() {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STUDENT_PAYMENTS_REFRESH_KEY, String(Date.now()));
  window.dispatchEvent(new Event(STUDENT_PAYMENTS_REFRESH_EVENT));
}
