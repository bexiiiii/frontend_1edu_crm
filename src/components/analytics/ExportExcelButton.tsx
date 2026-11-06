'use client';

import { useState } from 'react';
import axios from 'axios';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { downloadBlob } from '@/lib/download';
import { normalizeAnalyticsDateRange } from '@/lib/analytics-periods';
import { pushToast } from '@/lib/toast';
import {
  ALL_TIME_FROM,
  buildExcelBlob,
  buildExcelFilename,
  type ExcelExportPeriod,
  type ExcelSheet,
} from '@/lib/excel-export';

type PeriodMode = 'range' | 'all';

interface ExportExcelButtonBaseProps {
  /** Short slug used in the filename: <filePrefix>-<page>-<from>_<to>.xlsx */
  page: string;
  /** Filename prefix; pass '' for CRM list pages (students-2026-11-03.xlsx). */
  filePrefix?: string;
  /** Title written at the top of every sheet. */
  reportTitle: string;
  /** Optional line written under the title, e.g. active filters. */
  note?: string;
  /** Optional note shown in the dialog (e.g. «Данные выгружаются по полным месяцам»). */
  hint?: string;
  disabled?: boolean;
}

interface ExportExcelPeriodProps extends ExportExcelButtonBaseProps {
  /** Period the page currently shows; used as the dialog default. */
  defaultRange: { from: string; to: string };
  /** Loads data for the chosen period and returns sheets to write. */
  buildSheets: (period: ExcelExportPeriod) => Promise<ExcelSheet[]>;
  buildSnapshot?: never;
}

interface ExportExcelSnapshotProps extends ExportExcelButtonBaseProps {
  /** Date-less list: one click exports the current state (with the page's filters). */
  buildSnapshot: () => Promise<ExcelSheet[]>;
  defaultRange?: never;
  buildSheets?: never;
}

type ExportExcelButtonProps = ExportExcelPeriodProps | ExportExcelSnapshotProps;

const pad2 = (value: number) => value.toString().padStart(2, '0');

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const toModeClass = (active: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
    active ? 'border-[#467aff] bg-[#f3f7ff]' : 'border-[#dbe2e8] bg-white hover:bg-[#f8fbfd]'
  }`;

export function ExportExcelButton({
  page,
  filePrefix = 'analytics',
  reportTitle,
  note,
  defaultRange,
  buildSheets,
  buildSnapshot,
  hint,
  disabled = false,
}: ExportExcelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PeriodMode>('range');
  const [fromDate, setFromDate] = useState(defaultRange?.from ?? '');
  const [toDate, setToDate] = useState(defaultRange?.to ?? '');
  const [isExporting, setIsExporting] = useState(false);

  const runExport = async (period: ExcelExportPeriod | null, load: () => Promise<ExcelSheet[]>) => {
    setIsExporting(true);
    try {
      const sheets = await load();
      const blob = await buildExcelBlob({ title: reportTitle, period, note, sheets });
      downloadBlob(blob, buildExcelFilename(page, period, filePrefix));
      pushToast({ message: 'Excel-файл скачивается.', tone: 'success' });
      setIsOpen(false);
    } catch (error) {
      // API errors are already shown by the axios interceptor.
      if (!axios.isAxiosError(error)) {
        console.error('Excel export failed:', error);
        pushToast({ message: 'Не удалось сформировать Excel-файл.', tone: 'error' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const openDialog = () => {
    if (buildSnapshot) {
      void runExport(null, buildSnapshot);
      return;
    }
    setMode('range');
    setFromDate(defaultRange?.from || todayIso());
    setToDate(defaultRange?.to || todayIso());
    setIsOpen(true);
  };

  const closeDialog = () => {
    if (!isExporting) setIsOpen(false);
  };

  const handleExport = async () => {
    const period: ExcelExportPeriod =
      mode === 'all'
        ? { from: ALL_TIME_FROM, to: todayIso(), allTime: true }
        : { ...normalizeAnalyticsDateRange(fromDate, toDate), allTime: false };

    if (!period.from || !period.to) {
      pushToast({ message: 'Укажите даты периода.', tone: 'error' });
      return;
    }

    if (!buildSheets) return;
    await runExport(period, () => buildSheets(period));
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={FileSpreadsheet}
        onClick={openDialog}
        disabled={disabled || (Boolean(buildSnapshot) && isExporting)}
      >
        {buildSnapshot && isExporting ? 'Формируем...' : 'Скачать в Excel'}
      </Button>

      <Modal
        isOpen={isOpen && !buildSnapshot}
        onClose={closeDialog}
        title="Скачать в Excel"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={isExporting}>
              Отмена
            </Button>
            <Button icon={FileSpreadsheet} onClick={() => void handleExport()} disabled={isExporting}>
              {isExporting ? 'Формируем...' : 'Скачать'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className={toModeClass(mode === 'range')} onClick={() => setMode('range')}>
            <input
              type="radio"
              name={`excel-period-${page}`}
              checked={mode === 'range'}
              onChange={() => setMode('range')}
              className="mt-1 accent-[#467aff]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#273142]">Период</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="text-xs text-[#7f8794]">
                  с
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(event) => {
                      setMode('range');
                      setFromDate(event.target.value);
                    }}
                    className="crm-select mt-1"
                  />
                </div>
                <div className="text-xs text-[#7f8794]">
                  по
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => {
                      setMode('range');
                      setToDate(event.target.value);
                    }}
                    className="crm-select mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <label className={toModeClass(mode === 'all')}>
            <input
              type="radio"
              name={`excel-period-${page}`}
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="mt-1 accent-[#467aff]"
            />
            <div>
              <p className="text-sm font-semibold text-[#273142]">За весь период работы</p>
              <p className="mt-1 text-xs text-[#7f8794]">Все данные центра по сегодняшний день.</p>
            </div>
          </label>

          {hint ? <p className="text-xs text-[#7f8794]">{hint}</p> : null}
        </div>
      </Modal>
    </>
  );
}
