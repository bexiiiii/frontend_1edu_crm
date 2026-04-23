import axios from 'axios';

const ERROR_CODE_MESSAGES: Record<string, string> = {
  BRANCH_ACCESS_DENIED: 'Нет доступа к выбранному филиалу.',
  BRANCH_SCOPE_REQUIRED: 'Выберите филиал для выполнения операции.',
  TEACHER_SCOPE_DENIED: 'Операция недоступна в вашем teacher scope.',
  TEACHER_STAFF_ID_REQUIRED: 'Для роли преподавателя должен быть привязан staffId.',
  TEACHER_STAFF_ID_INVALID: 'Некорректный staffId преподавателя.',
};

export function getErrorMessage(
  error: unknown,
  fallback = 'Произошла ошибка. Попробуйте ещё раз.'
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      const errorCode = 'errorCode' in data ? data.errorCode : null;
      if (typeof errorCode === 'string' && errorCode.trim() && ERROR_CODE_MESSAGES[errorCode]) {
        return ERROR_CODE_MESSAGES[errorCode];
      }

      const message = 'message' in data ? data.message : null;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      const errorDescription = 'error_description' in data ? data.error_description : null;
      if (typeof errorDescription === 'string' && errorDescription.trim()) {
        return errorDescription;
      }

      const errorText = 'error' in data ? data.error : null;
      if (typeof errorText === 'string' && errorText.trim()) {
        return errorText;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
