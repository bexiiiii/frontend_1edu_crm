/** Kazakhstan phone numbers for «Перевод» payments: +7 XXX XXX XX XX. */

/** 10 national digits (starting with 7) from any input, without the country code. */
function nationalDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** Input mask: «+7 777 123 45 67» while typing. */
export function formatKzPhoneInput(value: string): string {
  const raw = value.trim();
  // Backspace over «+7 » clears the field instead of re-adding the prefix.
  if (!raw || raw === '+' || raw === '+7') return '';
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+7') || (raw.startsWith('8') && digits.length > 1) || digits.length > 10) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (!digits) return '+7 ';
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);
  return `+7 ${parts.join(' ')}`;
}

/** +7XXXXXXXXXX or null when the number is not a full KZ number. */
export function normalizeKzPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = nationalDigits(value);
  return digits.length === 10 && digits.startsWith('7') ? `+7${digits}` : null;
}

/** «+7 777 123 45 67» for display; anything else is shown as is. */
export function formatKzPhone(value: string | null | undefined): string {
  const normalized = normalizeKzPhone(value);
  if (!normalized) return value || '';
  const d = normalized.slice(2);
  return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}
