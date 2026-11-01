const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return value;
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

/** «ноя 2026 – дек 2026», «с ноя 2026», «по дек 2026»; null — скидка без срока. */
export function formatDiscountPeriod(fromMonth?: string | null, toMonth?: string | null): string | null {
  if (fromMonth && toMonth) {
    return fromMonth === toMonth ? formatMonth(fromMonth) : `${formatMonth(fromMonth)} – ${formatMonth(toMonth)}`;
  }
  if (fromMonth) return `с ${formatMonth(fromMonth)}`;
  if (toMonth) return `по ${formatMonth(toMonth)}`;
  return null;
}

export function isDiscountPeriodValid(fromMonth?: string | null, toMonth?: string | null): boolean {
  return !fromMonth || !toMonth || fromMonth <= toMonth;
}
