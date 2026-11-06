'use client';

import Link from 'next/link';
import { AttendanceTotals } from './AttendanceTotals';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
} from '@/constants/attendance';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import { RedListChip, formatRedListDate } from './RedListModal';
import type { AttendanceStatus, StudentStatus } from '@/lib/api/types';

export type AttendanceMonthlyLessonColumn = {
  lessonId: string;
  date: string;
  dayNumber: string;
  weekdayLabel: string;
  timeLabel: string;
  isCurrentDate: boolean;
  substituteTeacherName?: string | null;
};

export type AttendanceMonthlyStudentCell = {
  lessonId: string;
  status: AttendanceStatus | null;
  timeLabel: string;
  isCurrentLesson: boolean;
  isEligible?: boolean;
  /** «Редлист»: the student is red-listed for this lesson; marking is locked. */
  redList?: { fromDate: string | null; toDate: string | null } | null;
};

export type AttendanceMonthlyStudentRow = {
  studentId: string;
  fullName: string;
  studentStatus: StudentStatus;
  presentCount: number;
  markedCount: number;
  totalLessons: number;
  attendanceRate: number;
  cells: AttendanceMonthlyStudentCell[];
  /** The student's open «Редлист» period in this course, if any. */
  openRedList?: { id: string; fromDate: string } | null;
};

interface AttendanceMonthlyTableProps {
  monthLabel: string;
  groupName: string;
  totalLessons: number;
  lessonDaysCount: number;
  totalStudents: number;
  lessonColumns: AttendanceMonthlyLessonColumn[];
  rows: AttendanceMonthlyStudentRow[];
  onStatusChange: (studentId: string, lessonId: string, status: AttendanceStatus) => void;
  /** «В редлист с даты» / «Вывести из редлиста» for the row; hidden when omitted. */
  onRedListAction?: (row: AttendanceMonthlyStudentRow) => void;
}

function toRateToneClass(rate: number) {
  if (rate >= 90) return 'text-emerald-700';
  if (rate >= 75) return 'text-sky-700';
  if (rate >= 50) return 'text-amber-700';
  return 'text-rose-700';
}

function AttendanceStatusDropdown({
  status,
  onChange,
  lessonId,
}: {
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  lessonId: string;
}) {
  const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const normalizedStatus = (status === 'NOT_MARKED' ? 'PLANNED' : status) as AttendanceStatus;
  const currentOption = ATTENDANCE_STATUS_OPTIONS.find(o => o.value === normalizedStatus);

  // The menu is rendered in a portal with fixed coordinates: inside the table's
  // scroll container it was clipped on the last rows. It opens upward when
  // there is not enough room below the button.
  const toggle = () => {
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = ATTENDANCE_STATUS_OPTIONS.length * 34 + 8;
    const left = rect.left + rect.width / 2;
    if (window.innerHeight - rect.bottom < menuHeight + 8 && rect.top > menuHeight + 8) {
      setMenuPos({ left, bottom: window.innerHeight - rect.top + 4 });
    } else {
      setMenuPos({ left, top: rect.bottom + 4 });
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`w-full rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-all hover:brightness-95 ${ATTENDANCE_STATUS_COLORS[normalizedStatus] || ATTENDANCE_STATUS_COLORS.PLANNED}`}
      >
        <span className="block leading-3">
          {currentOption?.label || normalizedStatus}
        </span>
      </button>

      {menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuPos(null)}
            onWheel={() => setMenuPos(null)}
          />
          <div
            className="fixed z-50 min-w-[140px] -translate-x-1/2 rounded-lg border border-[#e4eaf0] bg-white py-1 shadow-lg"
            style={{ left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom }}
          >
            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-[#f6f8fa] ${
                  option.value === status ? 'bg-[#eef4ff] text-[#467aff]' : 'text-[#273142]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setMenuPos(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export function AttendanceMonthlyTable({
  monthLabel,
  groupName,
  totalLessons,
  lessonDaysCount,
  totalStudents,
  lessonColumns,
  rows,
  onStatusChange,
  onRedListAction,
}: AttendanceMonthlyTableProps) {
  return (
    <div className="crm-table-wrap overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] border-collapse">
          <thead className="crm-table-head">
            <tr>
              <th className="crm-table-th sticky left-0 z-20 min-w-[180px] bg-[#f6f8fa] border border-[#e4eaf0]">
                Ученик
              </th>
              {lessonColumns.map((col) => (
                <th
                  key={col.lessonId}
                  className={`crm-table-th min-w-[80px] text-center border border-[#e4eaf0] ${
                    col.substituteTeacherName
                      ? 'bg-amber-100 text-amber-900'
                      : col.isCurrentDate
                        ? 'bg-[#eef4ff] text-[#315fd0]'
                        : ''
                  }`}
                  title={col.substituteTeacherName ? `Замена: ${col.substituteTeacherName}` : undefined}
                >
                  <Link prefetch={false}
                    href={`/attendance/${col.lessonId}`}
                    className="flex flex-col items-center gap-1 transition-colors hover:text-[#467aff]"
                    title="Перейти к уроку"
                  >
                    <span className="text-sm font-semibold">{col.dayNumber}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em]">
                      {col.weekdayLabel}
                    </span>
                    {col.substituteTeacherName ? (
                      <span className="max-w-[76px] truncate text-[9px] font-semibold text-amber-800">
                        {col.substituteTeacherName}
                      </span>
                    ) : null}
                  </Link>
                </th>
              ))}
              <th className="crm-table-th min-w-[70px] bg-[#f6f8fa] border border-[#e4eaf0]">
                Посетил
              </th>
              <th className="crm-table-th min-w-[70px] bg-[#f6f8fa] border border-[#e4eaf0]">
                Отмечено
              </th>
              <th className="crm-table-th min-w-[70px] bg-[#f6f8fa] border border-[#e4eaf0]">
                Ритм
              </th>
            </tr>
          </thead>

          <tbody className="crm-table-body">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.studentId} className="crm-table-row">
                  <td className="crm-table-cell sticky left-0 z-10 bg-[#fbfcfd] border border-[#e4eaf0]">
                    <div className="flex min-w-[180px] flex-col items-start gap-1">
                      <Link prefetch={false}
                        href={`/students/${row.studentId}`}
                        className="font-semibold leading-5 text-[#467aff] hover:underline"
                      >
                        {row.fullName}
                      </Link>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${STUDENT_STATUS_COLORS[row.studentStatus]}`}
                      >
                        {STUDENT_STATUS_LABELS[row.studentStatus]}
                      </span>
                      {onRedListAction ? (
                        <button
                          type="button"
                          className={`text-[11px] font-medium hover:underline ${
                            row.openRedList ? 'text-[#467aff]' : 'text-[#8a93a3] hover:text-red-600'
                          }`}
                          onClick={() => onRedListAction(row)}
                          title={row.openRedList ? `В редлисте с ${formatRedListDate(row.openRedList.fromDate)}` : undefined}
                        >
                          {row.openRedList ? 'Вывести из редлиста' : 'Добавить в редлист'}
                        </button>
                      ) : null}
                    </div>
                  </td>

                  {row.cells.map((cell) => (
                    <td
                      key={`${row.studentId}-${cell.lessonId}`}
                      className="crm-table-cell border border-[#e4eaf0] p-1 text-center"
                    >
                      {cell.redList ? (
                        <RedListChip compact fromDate={cell.redList.fromDate} toDate={cell.redList.toDate} />
                      ) : cell.status && cell.isEligible !== false ? (
                        <AttendanceStatusDropdown
                          status={cell.status}
                          lessonId={cell.lessonId}
                          onChange={(newStatus) =>
                            onStatusChange(row.studentId, cell.lessonId, newStatus)
                          }
                        />
                      ) : (
                        <span className="text-slate-300 font-bold block py-1.5 select-none" title="Ученик не был зачислен на дату урока">—</span>
                      )}
                    </td>
                  ))}

                  <td className="crm-table-cell border border-[#e4eaf0] text-center">
                    <span className="font-semibold text-[#273142]">
                      {row.presentCount} / {row.totalLessons}
                    </span>
                  </td>
                  <td className="crm-table-cell border border-[#e4eaf0] bg-[#f8fafc] text-center">
                    <span className="font-semibold text-[#273142]">
                      {row.markedCount} / {row.totalLessons}
                    </span>
                  </td>
                  <td className="crm-table-cell border border-[#e4eaf0] bg-[#f8fafc] text-center">
                    <span className={`font-semibold ${toRateToneClass(row.attendanceRate)}`}>
                      {row.attendanceRate}%
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="crm-table-row">
                <td
                  colSpan={lessonColumns.length + 4}
                  className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]"
                >
                  Для выбранного месяца нет данных по ученикам.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AttendanceTotals monthly statuses={rows.flatMap((row) => row.cells.filter((cell) => cell.isEligible !== false).map((cell) => cell.status))} />
    </div>
  );
}
