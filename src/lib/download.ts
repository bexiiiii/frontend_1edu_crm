export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}
