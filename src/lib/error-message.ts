import axios from 'axios';

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
