'use client';

import { useEffect, useState } from 'react';
import { filesService } from '@/lib/api';

const INTERNAL_BUCKET_NAME = process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME || 'ondeedu-files';
const INTERNAL_FILE_HOSTS = new Set(['minio', 'localhost', '127.0.0.1']);
const KNOWN_FILE_FOLDERS = ['avatars/', 'documents/', 'reports/'];
const PRESIGNED_URL_TTL_MS = 14 * 60 * 1000;

type CachedResolvedUrl = {
  url: string;
  expiresAt: number;
};

const resolvedUrlCache = new Map<string, CachedResolvedUrl>();
const pendingUrlCache = new Map<string, Promise<string>>();

function extractPresignedUrl(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const record = payload as Record<string, unknown>;
  const directKeys = ['url', 'presignedUrl', 'value', 'signedUrl', 'downloadUrl', 'fileUrl'];

  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if ('data' in record) {
    return extractPresignedUrl(record.data);
  }

  return '';
}

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

    // Internal MinIO hosts - need presigned URL resolution
    if (INTERNAL_FILE_HOSTS.has(url.hostname.toLowerCase())) {
      return true;
    }

    // URLs with file/object query parameters need resolution
    if (['objectName', 'fileName', 'filename', 'key', 'objectKey', 'path'].some((param) => url.searchParams.has(param))) {
      return true;
    }

    let normalizedPathname = url.pathname.replace(/^\/+/, '');
    try {
      normalizedPathname = decodeURIComponent(normalizedPathname);
    } catch {
      normalizedPathname = url.pathname.replace(/^\/+/, '');
    }

    if (!normalizedPathname) {
      return false;
    }

    // Check for bucket segment in path
    if (normalizedPathname.startsWith(`${INTERNAL_BUCKET_NAME}/`)) {
      return true;
    }

    if (normalizedPathname.includes(`/${INTERNAL_BUCKET_NAME}/`)) {
      return true;
    }

    // Check for known file folders
    if (KNOWN_FILE_FOLDERS.some((folder) => normalizedPathname.includes(folder))) {
      return true;
    }

    // Backend API file endpoints need resolution
    if (normalizedPathname.includes('api/v1/files/')) {
      return true;
    }

    // External CDN URLs or direct MinIO URLs should be used as-is
    // Only resolve if they have presigned URL expiration params
    const hasExpiryParams = url.searchParams.has('X-Amz-Expires') || url.searchParams.has('Expires') || url.searchParams.has('expires');
    if (hasExpiryParams) {
      return true;
    }

    // If it's a fully formed HTTPS URL without expiry params, use as-is
    return false;
  } catch {
    // Non-URL values (like object paths) should be resolved
    return true;
  }
}

function extractObjectNameFromUrl(url: URL): string | null {
  const objectNameQueryKeys = ['objectName', 'fileName', 'filename', 'key', 'objectKey', 'path'];

  for (const queryKey of objectNameQueryKeys) {
    const objectNameFromQuery = url.searchParams.get(queryKey);
    if (objectNameFromQuery?.trim()) {
      return normalizeObjectName(objectNameFromQuery);
    }
  }

  let normalizedPathname = url.pathname.replace(/^\/+/, '');
  try {
    normalizedPathname = decodeURIComponent(normalizedPathname);
  } catch {
    normalizedPathname = url.pathname.replace(/^\/+/, '');
  }

  if (!normalizedPathname) {
    return null;
  }

  if (normalizedPathname.startsWith(`${INTERNAL_BUCKET_NAME}/`)) {
    return normalizeObjectName(normalizedPathname);
  }

  const bucketSegmentIndex = normalizedPathname.indexOf(`/${INTERNAL_BUCKET_NAME}/`);
  if (bucketSegmentIndex >= 0) {
    const bucketPath = normalizedPathname.slice(bucketSegmentIndex + 1);
    return normalizeObjectName(bucketPath);
  }

  for (const folder of KNOWN_FILE_FOLDERS) {
    const folderIndex = normalizedPathname.indexOf(folder);
    if (folderIndex >= 0) {
      return normalizeObjectName(normalizedPathname.slice(folderIndex));
    }
  }

  if (INTERNAL_FILE_HOSTS.has(url.hostname.toLowerCase())) {
    return normalizeObjectName(normalizedPathname);
  }

  return null;
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
      return extractObjectNameFromUrl(url);
    }
  } catch {
    // Non-URL values are handled below.
  }

  if (/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i.test(trimmedValue)) {
    return normalizeObjectName(trimmedValue.replace(/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i, ''));
  }

  return normalizeObjectName(trimmedValue);
}

function extractBucketScopedObjectName(fileValue: string): string | null {
  const trimmedValue = fileValue.trim();

  if (!trimmedValue || trimmedValue.startsWith('blob:') || trimmedValue.startsWith('data:')) {
    return null;
  }

  let rawPath = '';

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    if (!INTERNAL_FILE_HOSTS.has(url.hostname.toLowerCase()) && !url.pathname.includes(`/${INTERNAL_BUCKET_NAME}/`)) {
      return null;
    }

    rawPath = url.pathname.replace(/^\/+/, '');
  } catch {
    if (/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i.test(trimmedValue)) {
      rawPath = trimmedValue.replace(/^(minio|localhost|127\.0\.0\.1)(?::\d+)?\//i, '');
    } else {
      return null;
    }
  }

  if (!rawPath) {
    return null;
  }

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

function getRenderableRawUrlFallback(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('/') || /^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return '';
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
    return getRenderableRawUrlFallback(trimmedValue);
  }

  const bucketScopedObjectName = extractBucketScopedObjectName(trimmedValue);
  const candidateObjectNames = [objectName];

  const bucketPrefixedObjectName = objectName.startsWith(`${INTERNAL_BUCKET_NAME}/`)
    ? objectName
    : `${INTERNAL_BUCKET_NAME}/${objectName}`;
  if (!candidateObjectNames.includes(bucketPrefixedObjectName)) {
    candidateObjectNames.push(bucketPrefixedObjectName);
  }

  if (bucketScopedObjectName && bucketScopedObjectName !== objectName) {
    if (!candidateObjectNames.includes(bucketScopedObjectName)) {
      candidateObjectNames.push(bucketScopedObjectName);
    }
  }

  const pendingValue = pendingUrlCache.get(trimmedValue);
  if (pendingValue) {
    return pendingValue;
  }

  const request = (async () => {
    for (const candidateObjectName of candidateObjectNames) {
      try {
        const response = await filesService.getPresignedUrl(candidateObjectName);
        const nextUrl = extractPresignedUrl(response.data) || extractPresignedUrl(response);

        if (nextUrl) {
          resolvedUrlCache.set(trimmedValue, {
            url: nextUrl,
            expiresAt: Date.now() + PRESIGNED_URL_TTL_MS,
          });
          return nextUrl;
        }
      } catch {
        // Try next candidate object name.
      }
    }

    return getRenderableRawUrlFallback(trimmedValue);
  })()
    .catch(() => '')
    .finally(() => {
      pendingUrlCache.delete(trimmedValue);
    });

  pendingUrlCache.set(trimmedValue, request);
  return request;
}

export function useResolvedFileUrl(fileValue: string | null | undefined): string {
  const rawValue = fileValue?.trim() ?? '';
  const rawUrlFallback = getRenderableRawUrlFallback(rawValue);
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

  if (resolvedState.source === rawValue) {
    return resolvedState.url || rawUrlFallback;
  }

  return rawUrlFallback;
}
