export function countAttendance(statuses: Array<string | null | undefined>) {
  return statuses.reduce((total, status) => {
    if (['ATTENDED', 'AUTO_ATTENDED', 'ONE_TIME_VISIT', 'TRIAL', 'PRESENT'].includes(status || '')) total.present++;
    else if (['ABSENT', 'SICK', 'VACATION'].includes(status || '')) total.absent++;
    else if (!status || status === 'PLANNED' || status === 'NOT_MARKED') total.unmarked++;
    return total;
  }, { present: 0, absent: 0, unmarked: 0 });
}

export function AttendanceTotals({ statuses, monthly = false }: { statuses: Array<string | null | undefined>; monthly?: boolean }) {
  const total = countAttendance(statuses);
  return <div aria-live="polite" className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-[#e6ebf0] bg-[#f8fafc] px-6 py-4 text-sm">
    {monthly && <span className="text-[#8a93a3]">За месяц · отметок посещаемости</span>}
    <span className="text-emerald-700">Пришло: <strong>{total.present}</strong></span>
    <span className="text-rose-700" title="Пропустил, болел или отпуск">Не пришло: <strong>{total.absent}</strong></span>
    <span className="text-[#8a93a3]">Не отмечено: <strong>{total.unmarked}</strong></span>
  </div>;
}
