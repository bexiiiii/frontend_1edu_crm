// Short-lived in-tab cache for reference lists (schedules, courses, staff, rooms...).
// 2026-11-04: pages reloaded the same 1000-row lists on every date change / navigation.
// The key includes the current branch, so switching branch never shows another branch's data.

type Entry = { at: number; promise: Promise<unknown> };

const store = new Map<string, Entry>();

function branchKey(): string {
  try {
    return (typeof window !== 'undefined' && window.localStorage.getItem('branch_id')) || '';
  } catch {
    return '';
  }
}

export function cachedLookup<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const fullKey = `${branchKey()}|${key}`;
  const now = Date.now();
  const hit = store.get(fullKey);
  if (hit && now - hit.at < ttlMs) {
    return hit.promise as Promise<T>;
  }
  const promise = load().catch((error) => {
    store.delete(fullKey);
    throw error;
  });
  store.set(fullKey, { at: now, promise });
  return promise;
}

/** Drop cached lists (all, or those whose key starts with the prefix), e.g. after an edit. */
export function invalidateLookups(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.split('|').slice(1).join('|').startsWith(prefix)) {
      store.delete(key);
    }
  }
}
