'use client';

import { useState } from 'react';
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
} from '@/constants/attendance';
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '@/constants/student';
import type { AttendanceStatus, StudentStatus } from '@/lib/api/types';

export type AttendanceMonthlyLessonColumn = {
  lessonId: string;
  date: string;
  dayNumber: string;
  weekdayLabel: string;
  timeLabel: string;
  isCurrentDate: boolean;
};

export type AttendanceMonthlyStudentCell = {
  lessonId: string;
  status: AttendanceStatus;
  timeLabel: string;
  isCurrentLesson: boolean;
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
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = ATTENDANCE_STATUS_OPTIONS.find(o => o.value === status);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-all hover:brightness-95 ${ATTENDANCE_STATUS_COLORS[status]}`}
      >
        <span className="block leading-3">
          {currentOption?.label || status}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-1/2 z-50 min-w-[140px] -translate-x-1/2 rounded-lg border border-[#e4eaf0] bg-white py-1 shadow-lg">
            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-[#f6f8fa] ${
                  option.value === status ? 'bg-[#eef4ff] text-[#467aff]' : 'text-[#273142]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
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
                    col.isCurrentDate ? 'bg-[#eef4ff] text-[#315fd0]' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">{col.dayNumber}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em]">
                      {col.weekdayLabel}
                    </span>
                  </div>
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
                    <div>
                      <p className="font-semibold text-[#273142]">{row.fullName}</p>
                      <span
                        className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${STUDENT_STATUS_COLORS[row.studentStatus]}`}
                      >
                        {STUDENT_STATUS_LABELS[row.studentStatus]}
                      </span>
                    </div>
                  </td>

                  {row.cells.map((cell) => (
                    <td
                      key={`${row.studentId}-${cell.lessonId}`}
                      className="crm-table-cell border border-[#e4eaf0] p-1"
                    >
                      <AttendanceStatusDropdown
                        status={cell.status}
                        lessonId={cell.lessonId}
                        onChange={(newStatus) =>
                          onStatusChange(row.studentId, cell.lessonId, newStatus)
                        }
                      />
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
    </div>
  );
}
