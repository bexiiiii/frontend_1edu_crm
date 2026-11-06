import api from './api';
import type { ApiResponse } from './api/types';

/**
 * Loads many records by id with GET {basePath}/by-ids (chunks of 100) instead of one request
 * per id (2026-11-04). Returns [id, record | null] pairs in the order of `ids`, exactly like the
 * old per-id loops. If the batch endpoint fails, falls back to `single` per id.
 */
export async function fetchManyByIds<T extends { id: string }>(
  basePath: string,
  ids: string[],
  single: (id: string) => Promise<{ data: T }>
): Promise<Array<readonly [string, T | null]>> {
  if (ids.length === 0) {
    return [];
  }
  const byId = new Map<string, T>();
  try {
    for (let start = 0; start < ids.length; start += 100) {
      const chunk = ids.slice(start, start + 100);
      const response = await api.get<ApiResponse<T[]>>(`${basePath}/by-ids`, {
        params: { ids: chunk.join(',') },
      });
      (response.data.data ?? []).forEach((item) => byId.set(item.id, item));
    }
  } catch {
    return Promise.all(
      ids.map(async (id) => {
        try {
          const response = await single(id);
          return [id, response.data] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );
  }
  return ids.map((id) => [id, byId.get(id) ?? null] as const);
}
