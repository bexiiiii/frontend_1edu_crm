import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  STAFF_ROLE_LABELS,
  STAFF_SALARY_TYPE_LABELS,
  STAFF_STATUS_COLORS,
  STAFF_STATUS_LABELS,
} from '@/constants/employee';
import { TRANSACTION_STATUS_COLORS, TRANSACTION_STATUS_LABELS } from '@/constants/finance';
import type { StaffSalaryHistoryDto } from '@/lib/api';

interface SalaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: StaffSalaryHistoryDto | null;
  loading: boolean;
  error: string | null;
  position?: string;
  onRecordPayment?: () => void;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₸`;
}

function formatMonthLabel(month: string): string {
  if (!month) return '—';

  return new Date(`${month}-01T00:00:00`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const SalaryHistoryModal = ({
  isOpen,
  onClose,
  history,
  loading,
  error,
  position,
  onRecordPayment,
}: SalaryHistoryModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={history ? `Зарплата: ${history.fullName}` : 'История зарплаты'}
      footer={
        <>
          {onRecordPayment ? (
            <Button variant="secondary" onClick={onRecordPayment} disabled={loading || !history}>
              Зафиксировать выплату
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : history ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8ee] bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Сотрудник</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">{history.fullName}</p>
              <p className="text-sm text-[#5f6b7b]">{position || '—'}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8ee] bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Роль и статус</p>
              <p className="mt-1 text-base font-semibold text-[#1f2530]">{STAFF_ROLE_LABELS[history.role]}</p>
              <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${STAFF_STATUS_COLORS[history.status]}`}>
                {STAFF_STATUS_LABELS[history.status]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Схема оплаты</p>
              <p className="mt-1 text-sm font-semibold text-[#1f2530]">
                {STAFF_SALARY_TYPE_LABELS[history.salaryType]}
              </p>
              <p className="mt-1 text-xs text-[#5f6b7b]">
                {history.salaryType === 'FIXED'
                  ? formatMoney(history.fixedSalary)
                  : history.salaryPercentage !== null
                    ? `${history.salaryPercentage}%`
                    : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Начислено</p>
              <p className="mt-1 text-sm font-semibold text-[#1f2530]">{formatMoney(history.totalDue)}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a93a3]">Остаток</p>
              <p className="mt-1 text-sm font-semibold text-[#c24141]">{formatMoney(history.totalOutstanding)}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Разбивка по месяцам</h3>
            <div className="overflow-x-auto rounded-2xl border border-[#e2e8ee] bg-white">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Активные ученики</th>
                    <th className="crm-table-th">База</th>
                    <th className="crm-table-th">Начислено</th>
                    <th className="crm-table-th">Выплачено</th>
                    <th className="crm-table-th">Остаток</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {history.months.length > 0 ? (
                    history.months.map((month) => (
                      <tr key={month.month} className="crm-table-row">
                        <td className="crm-table-cell">{formatMonthLabel(month.month)}</td>
                        <td className="crm-table-cell">{month.activeStudentCount}</td>
                        <td className="crm-table-cell">{formatMoney(month.percentageBaseAmount)}</td>
                        <td className="crm-table-cell">{formatMoney(month.dueAmount)}</td>
                        <td className="crm-table-cell text-green-600">{formatMoney(month.paidAmount)}</td>
                        <td className="crm-table-cell text-red-600">{formatMoney(month.outstandingAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={6} className="crm-table-cell py-8 text-center text-sm text-[#8a93a3]">
                        История по месяцам пока пуста
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#1f2530]">Выплаты</h3>
            <div className="overflow-x-auto rounded-2xl border border-[#e2e8ee] bg-white">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">Месяц</th>
                    <th className="crm-table-th">Дата</th>
                    <th className="crm-table-th">Сумма</th>
                    <th className="crm-table-th">Статус</th>
                    <th className="crm-table-th">Заметка</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {history.payments.length > 0 ? (
                    history.payments.map((payment) => (
                      <tr key={payment.transactionId} className="crm-table-row">
                        <td className="crm-table-cell">{formatMonthLabel(payment.salaryMonth)}</td>
                        <td className="crm-table-cell">{formatDate(payment.paymentDate)}</td>
                        <td className="crm-table-cell">{formatMoney(payment.amount)}</td>
                        <td className="crm-table-cell">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${TRANSACTION_STATUS_COLORS[payment.status]}`}>
                            {TRANSACTION_STATUS_LABELS[payment.status]}
                          </span>
                        </td>
                        <td className="crm-table-cell">{payment.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="crm-table-cell py-8 text-center text-sm text-[#8a93a3]">
                        Выплат пока нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] px-4 py-6 text-center text-sm text-[#8a93a3]">
          Выберите сотрудника, чтобы посмотреть историю зарплаты
        </div>
      )}
    </Modal>
  );
};
