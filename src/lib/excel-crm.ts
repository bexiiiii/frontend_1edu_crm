import api from './api';
import type { ApiResponse, BranchDto, StudentDebtDto } from './api/types';

/**
 * Optional lookups for CRM Excel exports. They never show an error toast:
 * when the user has no access, the related column is simply left empty.
 */

export async function loadBranchNames(): Promise<Map<string, string>> {
  try {
    const response = await api.get<ApiResponse<BranchDto[]>>('/api/v1/settings/branches', { skipErrorToast: true });
    return new Map((response.data.data ?? []).map((branch) => [branch.id, branch.name]));
  } catch {
    return new Map();
  }
}

/** Current total debt per student (same endpoint as «Должники»). */
export async function loadDebtByStudent(): Promise<Map<string, number> | null> {
  try {
    const response = await api.get<ApiResponse<StudentDebtDto[]>>('/api/v1/payments/student-payments/debtors', {
      skipErrorToast: true,
    });
    const map = new Map<string, number>();
    (response.data.data ?? []).forEach((debt) => {
      map.set(debt.studentId, (map.get(debt.studentId) ?? 0) + (debt.totalDebt ?? 0));
    });
    return map;
  } catch {
    return null;
  }
}

export function joinBranchNames(ids: (string | null | undefined)[] | null | undefined, names: Map<string, string>): string {
  return Array.from(new Set((ids ?? []).filter((id): id is string => Boolean(id))))
    .map((id) => names.get(id) ?? '')
    .filter(Boolean)
    .join(', ');
}

/** "Фильтры: статус «Активный», поиск «Иванов»" or undefined when nothing is filtered. */
export function describeFilters(parts: (string | false | null | undefined)[]): string | undefined {
  const active = parts.filter((part): part is string => Boolean(part));
  return active.length > 0 ? `Фильтры: ${active.join('; ')}` : undefined;
}
