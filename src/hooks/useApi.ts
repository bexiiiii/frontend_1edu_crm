'use client';

import axios from 'axios';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getErrorMessage } from '@/lib/error-message';
import { pushToast } from '@/lib/toast';

// ─── Generic Data Fetching Hook ─────────────────────────────────

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcherRef.current();
      setState({ data: result.data, loading: false, error: null });
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Ошибка загрузки данных');
      setState((prev) => ({ ...prev, loading: false, error: message }));
      if (!axios.isAxiosError(err)) {
        pushToast({ message, tone: 'error' });
      }
    }
  }, []);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch };
}

// ─── Paginated Data Hook ────────────────────────────────────────

interface UsePaginatedState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalElements: number;
}

export function usePaginatedApi<T>(
  fetcher: (page: number, size: number) => Promise<{
    data: {
      content: T[];
      page: number;
      totalPages: number;
      totalElements: number;
    };
  }>,
  initialPage = 0,
  pageSize = 20,
  deps: unknown[] = []
) {
  const [state, setState] = useState<UsePaginatedState<T>>({
    data: [],
    loading: true,
    error: null,
    page: initialPage,
    totalPages: 0,
    totalElements: 0,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchPage = useCallback(async (pageNum: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcherRef.current(pageNum, pageSize);
      setState({
        data: result.data.content,
        loading: false,
        error: null,
        page: result.data.page,
        totalPages: result.data.totalPages,
        totalElements: result.data.totalElements,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Ошибка загрузки данных');
      setState((prev) => ({ ...prev, loading: false, error: message }));
      if (!axios.isAxiosError(err)) {
        pushToast({ message, tone: 'error' });
      }
    }
  }, [pageSize]);

  useEffect(() => {
    fetchPage(initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setPage = useCallback(
    (pageNum: number) => {
      fetchPage(pageNum);
    },
    [fetchPage]
  );

  const refetch = useCallback(() => {
    fetchPage(state.page);
  }, [fetchPage, state.page]);

  return { ...state, setPage, refetch };
}

// ─── Mutation Hook ──────────────────────────────────────────────

export function useMutation<TData, TVariables>(
  mutator: (variables: TVariables) => Promise<{ data: TData }>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutator(variables);
        setData(result.data);
        setLoading(false);
        return result.data;
      } catch (err: unknown) {
        const message = getErrorMessage(err, 'Ошибка выполнения операции');
        setError(message);
        setLoading(false);
        if (!axios.isAxiosError(err)) {
          pushToast({ message, tone: 'error' });
        }
        throw err;
      }
    },
    [mutator]
  );

  return { mutate, loading, error, data };
}
