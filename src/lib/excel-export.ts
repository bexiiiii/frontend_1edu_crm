import type { Workbook, Worksheet } from 'exceljs';

/** Earliest date used for «За весь период работы» exports. */
export const ALL_TIME_FROM = '2020-01-01';

export type ExcelColumnType = 'text' | 'number' | 'money' | 'percent' | 'date';

export interface ExcelColumn {
  header: string;
  type?: ExcelColumnType;
}

export type ExcelCellValue = string | number | null | undefined;

export interface ExcelTable {
  title?: string;
  columns: ExcelColumn[];
  rows: ExcelCellValue[][];
}

export interface ExcelSheet {
  name: string;
  tables: ExcelTable[];
}

export interface ExcelExportPeriod {
  from: string;
  to: string;
  allTime: boolean;
}

export interface ExcelReport {
  title: string;
  /** Period of the data; omitted for «current state» exports (date-less lists). */
  period?: ExcelExportPeriod | null;
  /** Optional line describing active filters/search. */
  note?: string;
  sheets: ExcelSheet[];
}

const NUM_FORMATS: Record<Exclude<ExcelColumnType, 'text'>, string> = {
  number: 'General',
  money: '#,##0;-#,##0;0',
  percent: '0.0',
  date: 'dd.mm.yyyy',
};

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEEF3F7' } };
const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFDBE2E8' } },
  left: { style: 'thin' as const, color: { argb: 'FFDBE2E8' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFDBE2E8' } },
  right: { style: 'thin' as const, color: { argb: 'FFDBE2E8' } },
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const trimmed = value.trim();
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (plain) {
    return { year: Number(plain[1]), month: Number(plain[2]), day: Number(plain[3]) };
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() };
}

/** "2026-11-03" (or ISO date-time) → "03.11.2026". Unknown formats are returned as-is. */
export function formatExcelDate(value: string | null | undefined): string {
  if (!value) return '';
  const parts = parseDateParts(value);
  if (!parts) return value;
  return `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`;
}

export function formatExcelPeriod(period: ExcelExportPeriod): string {
  const range = `${formatExcelDate(period.from)} — ${formatExcelDate(period.to)}`;
  return period.allTime ? `За весь период работы (${range})` : range;
}

export function todayIsoDate(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** analytics-<page>-<from>_<to>.xlsx, or <prefix>-<page>-<today>.xlsx for snapshot exports. */
export function buildExcelFilename(page: string, period?: ExcelExportPeriod | null, prefix = 'analytics'): string {
  const base = prefix ? `${prefix}-${page}` : page;
  return period ? `${base}-${period.from}_${period.to}.xlsx` : `${base}-${todayIsoDate()}.xlsx`;
}

function toCellValue(value: ExcelCellValue, type: ExcelColumnType): string | number | Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (type === 'date' && typeof value === 'string') {
    const parts = parseDateParts(value);
    // Dates are stored as UTC midnight so Excel shows the same calendar day in any timezone.
    return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : value;
  }

  if ((type === 'number' || type === 'money' || type === 'percent') && typeof value === 'string') {
    const numeric = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : value;
  }

  return value;
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Лист').slice(0, 31);
  let candidate = base;
  let index = 2;

  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${index})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

function displayLength(value: ExcelCellValue, type: ExcelColumnType): number {
  if (value === null || value === undefined) return 0;
  if (type === 'date') return 10;
  if (typeof value === 'number') return value.toLocaleString('ru-RU').length + 1;
  return String(value).length;
}

function writeSheet(worksheet: Worksheet, sheet: ExcelSheet, report: ExcelReport) {
  const widths: number[] = [];
  const trackWidth = (columnIndex: number, length: number) => {
    widths[columnIndex] = Math.max(widths[columnIndex] ?? 0, length);
  };

  const titleRow = worksheet.addRow([report.title]);
  titleRow.font = { bold: true, size: 14 };
  const periodLine = report.period
    ? `Период: ${formatExcelPeriod(report.period)}`
    : `Состояние на ${formatExcelDate(todayIsoDate())}`;
  worksheet.addRow([periodLine]).font = { color: { argb: 'FF5F6A7A' } };
  if (report.note) {
    worksheet.addRow([report.note]).font = { color: { argb: 'FF5F6A7A' } };
  }
  worksheet.addRow([]);

  const singleTable = sheet.tables.length === 1 && !sheet.tables[0].title;

  sheet.tables.forEach((table, tableIndex) => {
    if (tableIndex > 0) {
      worksheet.addRow([]);
    }

    if (table.title) {
      worksheet.addRow([table.title]).font = { bold: true, size: 12 };
    }

    const headerRow = worksheet.addRow(table.columns.map((column) => column.header));
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
    });
    table.columns.forEach((column, columnIndex) => trackWidth(columnIndex, column.header.length));

    if (singleTable && table.rows.length > 0) {
      worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
      worksheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number, column: table.columns.length },
      };
    }

    if (table.rows.length === 0) {
      worksheet.addRow([report.period ? 'Нет данных за выбранный период' : 'Нет данных']).font = { italic: true, color: { argb: 'FF8A94A3' } };
      return;
    }

    table.rows.forEach((values) => {
      const row = worksheet.addRow(
        table.columns.map((column, columnIndex) => toCellValue(values[columnIndex], column.type ?? 'text')),
      );

      table.columns.forEach((column, columnIndex) => {
        const type = column.type ?? 'text';
        const cell = row.getCell(columnIndex + 1);
        cell.border = THIN_BORDER;
        if (type !== 'text' && cell.value !== null && typeof cell.value !== 'string') {
          cell.numFmt = NUM_FORMATS[type];
        }
        trackWidth(columnIndex, displayLength(values[columnIndex], type));
      });
    });
  });

  widths.forEach((width, columnIndex) => {
    worksheet.getColumn(columnIndex + 1).width = Math.min(Math.max(width + 2, 10), 60);
  });
}

async function createWorkbook(): Promise<Workbook> {
  const excelModule = await import('exceljs');
  const WorkbookCtor =
    excelModule.Workbook ?? (excelModule as unknown as { default: typeof excelModule }).default.Workbook;
  return new WorkbookCtor();
}

export async function buildExcelBlob(report: ExcelReport): Promise<Blob> {
  const workbook = await createWorkbook();
  workbook.creator = '1edu CRM';
  workbook.created = new Date();

  const usedNames = new Set<string>();
  report.sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sanitizeSheetName(sheet.name, usedNames));
    writeSheet(worksheet, sheet, report);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Months ("YYYY-MM") covering the inclusive date range. */
export function listMonthsInRange(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  const months: string[] = [];
  if (!fromYear || !fromMonth || !toYear || !toMonth) return months;

  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${pad2(month)}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

/** Runs async tasks with a small concurrency limit, preserving order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Loads every page of a Spring `PageResponse` endpoint (same call the page makes,
 * just with a bigger page size) so exports contain all rows, not only the visible page.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<{ data?: { content?: T[]; totalPages?: number; last?: boolean } | null }>,
  pageSize = 500,
  maxPages = 200,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchPage(page, pageSize);
    const content = response.data?.content ?? [];
    items.push(...content);
    const totalPages = response.data?.totalPages ?? 0;
    if (response.data?.last || content.length < pageSize || page + 1 >= totalPages) break;
  }
  return items;
}

/** Inclusive ISO date-range check for values like "2026-11-03" or ISO date-times. */
export function isDateInRange(value: string | null | undefined, period: ExcelExportPeriod): boolean {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= period.from && day <= period.to;
}
