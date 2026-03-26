import api from '../api';

export type ReportType = 'DASHBOARD' | 'FINANCE' | 'STUDENTS' | 'ATTENDANCE' | 'SUBSCRIPTIONS' | 'TEACHERS';
export type ReportFormat = 'PDF' | 'EXCEL';

interface DownloadReportParams {
  type: ReportType;
  format?: ReportFormat;
  from?: string;
  to?: string;
}

function getFallbackFilename(format: ReportFormat) {
  return format === 'EXCEL' ? 'report.xlsx' : 'report.pdf';
}

function getFilenameFromDisposition(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return fallback;
}

export const reportsService = {
  async download(params: DownloadReportParams) {
    const format = params.format ?? 'PDF';
    const response = await api.get<Blob>('/api/v1/reports/generate', {
      params: {
        ...params,
        format,
      },
      responseType: 'blob',
    });

    const fallbackFilename = getFallbackFilename(format);
    const contentDisposition = response.headers['content-disposition'];

    return {
      blob: response.data,
      filename: getFilenameFromDisposition(contentDisposition, fallbackFilename),
      contentType: response.headers['content-type'],
    };
  },
};
