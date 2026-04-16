'use client';

import { useEffect, useState } from 'react';
import { filesService } from '@/lib/api';

const INTERNAL_BUCKET_NAME = 'ondeedu-files';
const INTERNAL_FILE_HOSTS = new Set(['minio', 'localhost', '127.0.0.1']);
const PRESIGNED_URL_TTL_MS = 14 * 60 * 1000;

type CachedResolvedUrl = {
  url: string;
  expiresAt: number;
};

const resolvedUrlCache = new Map<string, CachedResolvedUrl>();
const pendingUrlCache = new Map<string, Promise<string>>();

function isResolvableFileValue(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.startsWith('blob:') || trimmedValue.startsWith('data:')) {
    return false;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    return INTERNAL_FILE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return true;
  }
}

function normalizeObjectName(value: string): string {
  const trimmedValue = value.trim().replace(/^\/+/, '');

  if (!trimmedValue) {
    return '';
  }

  let decodedValue = trimmedValue;
  try {
    decodedValue = decodeURIComponent(trimmedValue);
  } catch {
    decodedValue = trimmedValue;
  }

  if (decodedValue.startsWith(`${INTERNAL_BUCKET_NAME}/`)) {
    return decodedValue.slice(INTERNAL_BUCKET_NAME.length + 1);
  }

  return decodedValue;
}

function extractObjectName(fileValue: string): string | null {
  const trimmedValue = fileValue.trim();

  if (!trimmedValue || trimmedValue.startsWith('blob:') || trimmedValue.startsWith('data:')) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (!INTERNAL_FILE_HOSTS.has(url.hostname.toLowerCase())) {
        return null;
      }

      return normalizeObjectName(url.pathname);
    }
  } catch {
    // Non-URL values are handled below.
  }

  if (/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i.test(trimmedValue)) {
    return normalizeObjectName(trimmedValue.replace(/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i, ''));
  }

  return normalizeObjectName(trimmedValue);
}

async function resolveFileUrl(fileValue: string): Promise<string> {
  const trimmedValue = fileValue.trim();

  if (!trimmedValue) {
    return '';
  }

  if (!isResolvableFileValue(trimmedValue)) {
    return trimmedValue;
  }

  const cachedValue = resolvedUrlCache.get(trimmedValue);
  if (cachedValue && cachedValue.expiresAt > Date.now()) {
    return cachedValue.url;
  }

  const objectName = extractObjectName(trimmedValue);
  if (!objectName) {
    return '';
  }

  const pendingValue = pendingUrlCache.get(trimmedValue);
  if (pendingValue) {
    return pendingValue;
  }

  const request = filesService
    .getPresignedUrl(objectName)
    .then((response) => {
      const payload = response.data as unknown;
      const nextUrl =
        typeof payload === 'string'
          ? payload.trim()
          : payload && typeof payload === 'object'
            ? ((payload as { url?: string; presignedUrl?: string; value?: string }).url ||
                (payload as { url?: string; presignedUrl?: string; value?: string }).presignedUrl ||
                (payload as { url?: string; presignedUrl?: string; value?: string }).value ||
                '')
                .trim()
            : '';

      if (nextUrl) {
        resolvedUrlCache.set(trimmedValue, {
          url: nextUrl,
          expiresAt: Date.now() + PRESIGNED_URL_TTL_MS,
        });
      }

      return nextUrl;
    })
    .catch(() => '')
    .finally(() => {
      pendingUrlCache.delete(trimmedValue);
    });

  pendingUrlCache.set(trimmedValue, request);
  return request;
}

export function useResolvedFileUrl(fileValue: string | null | undefined): string {
  const rawValue = fileValue?.trim() ?? '';
  const [resolvedState, setResolvedState] = useState<{ source: string; url: string }>({
    source: '',
    url: '',
  });

  useEffect(() => {
    if (!rawValue || !isResolvableFileValue(rawValue)) {
      return;
    }

    let isCancelled = false;

    void resolveFileUrl(rawValue).then((nextUrl) => {
      if (!isCancelled) {
        setResolvedState({
          source: rawValue,
          url: nextUrl,
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [rawValue]);

  if (!rawValue) {
    return '';
  }

  if (!isResolvableFileValue(rawValue)) {
    return rawValue;
  }

  return resolvedState.source === rawValue ? resolvedState.url : '';
}
