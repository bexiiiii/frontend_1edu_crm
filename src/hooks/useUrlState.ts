'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Page state kept in the URL query (?date=…&tab=…), so «Назад», reload and a
 * copied link restore the same filters, date, tab and page. Default values are
 * not written to the URL.
 */
type Pending = { pathname: string; params: URLSearchParams };
let pending: Pending | null = null;

export function useUrlState(key: string, defaultValue = ''): [string, (next: string) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const value = searchParams?.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      if (typeof window === 'undefined') return;
      // Several setters in one handler (e.g. «Сбросить») are merged into one URL update.
      if (!pending || pending.pathname !== pathname) {
        pending = { pathname, params: new URLSearchParams(window.location.search) };
        queueMicrotask(() => {
          const current = pending;
          pending = null;
          if (!current) return;
          const query = current.params.toString();
          // Next >= 14.1 syncs useSearchParams with history.replaceState: no server round trip per keystroke.
          window.history.replaceState(null, '', query ? `${current.pathname}?${query}` : current.pathname);
        });
      }
      if (next === defaultValue || next === '') pending.params.delete(key);
      else pending.params.set(key, next);
    },
    [defaultValue, key, pathname]
  );

  return [value, setValue];
}

type UrlValue = string | number | boolean | null | undefined;

/**
 * Drop-in replacement for useState(filtersObject): every field is kept in the
 * URL under its own name (with an optional prefix); fields equal to their
 * default are left out. Numbers and booleans keep their type.
 */
export function useUrlFilters<T extends object>(
  defaults: T,
  prefix = ''
): [T, Dispatch<SetStateAction<T>>] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const defaultsRef = useRef(defaults);

  const read = useCallback(
    (params: URLSearchParams | null): T => {
      const base = defaultsRef.current as Record<string, UrlValue>;
      const out: Record<string, UrlValue> = { ...base };
      Object.keys(base).forEach((key) => {
        const raw = params?.get(prefix + key);
        if (raw === null || raw === undefined) return;
        const fallback = base[key];
        if (typeof fallback === 'number') {
          const parsed = Number(raw);
          out[key] = Number.isFinite(parsed) ? parsed : fallback;
        } else if (typeof fallback === 'boolean') {
          out[key] = raw === 'true';
        } else {
          out[key] = raw;
        }
      });
      return out as T;
    },
    [prefix]
  );

  const query = searchParams?.toString() ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => read(searchParams ? new URLSearchParams(query) : null), [query, read]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      if (typeof window === 'undefined') return;
      if (!pending || pending.pathname !== pathname) {
        pending = { pathname, params: new URLSearchParams(window.location.search) };
        queueMicrotask(() => {
          const current = pending;
          pending = null;
          if (!current) return;
          const nextQuery = current.params.toString();
          window.history.replaceState(null, '', nextQuery ? `${current.pathname}?${nextQuery}` : current.pathname);
        });
      }
      const params = pending.params;
      const resolved = (typeof next === 'function' ? (next as (prev: T) => T)(read(params)) : next) as Record<string, UrlValue>;
      const base = defaultsRef.current as Record<string, UrlValue>;
      Object.keys(base).forEach((key) => {
        const item = resolved[key];
        if (item === undefined || item === null || item === '' || item === base[key]) params.delete(prefix + key);
        else params.set(prefix + key, String(item));
      });
    },
    [pathname, prefix, read]
  );

  return [value, setValue];
}

/** Number value in the URL (page number, …). */
export function useUrlNumber(key: string, defaultValue = 0): [number, (next: number) => void] {
  const [raw, setRaw] = useUrlState(key, String(defaultValue));
  const parsed = Number(raw);
  const setNumber = useCallback((next: number) => setRaw(String(next)), [setRaw]);
  return [Number.isFinite(parsed) ? parsed : defaultValue, setNumber];
}

const NAV_COUNT_KEY = 'crm-nav-count';

/** Counts in-app navigations of this tab (mounted once in AppShell). */
export function useNavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const count = Number(sessionStorage.getItem(NAV_COUNT_KEY) || '-1') + 1;
      sessionStorage.setItem(NAV_COUNT_KEY, String(count));
    } catch {
      // storage unavailable: «Назад» falls back to the list page
    }
  }, [pathname]);
}

/**
 * «Назад»: the previous CRM page with its filters (browser history); when the
 * page was opened directly (new tab, typed link), the given list page.
 */
export function useBackNavigation(fallbackHref: string) {
  const router = useRouter();
  return useCallback(() => {
    let count = 0;
    try {
      count = Number(sessionStorage.getItem(NAV_COUNT_KEY) || '0');
    } catch {
      count = 0;
    }
    if (count > 0 && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }, [fallbackHref, router]);
}
