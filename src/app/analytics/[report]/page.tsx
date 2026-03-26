import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ANALYTICS_REPORTS, getAnalyticsReportBySlug } from '@/constants/analytics';

type AnalyticsReportPageProps = {
  params: Promise<{ report: string }>;
};

const getTableRows = (reportLabel: string) => [
  { metric: 'Текущий показатель', value: '73%', trend: '+6.2%' },
  { metric: 'План на период', value: '80%', trend: '+2.1%' },
  { metric: 'Средний по центру', value: '68%', trend: '+1.5%' },
  { metric: `Фокус: ${reportLabel}`, value: '42', trend: '+9.0%' },
  { metric: 'Отклонение', value: '7%', trend: '-1.2%' },
];

export default async function AnalyticsReportPage({ params }: AnalyticsReportPageProps) {
  const { report } = await params;
  const reportConfig = getAnalyticsReportBySlug(report);

  if (!reportConfig) {
    notFound();
  }

  const tableRows = getTableRows(reportConfig.label);

  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#202938]">{reportConfig.label}</h2>
            <p className="mt-2 text-sm text-[#7f8794]">{reportConfig.description}</p>
          </div>

          <Link
            href="/analytics"
            className="inline-flex h-9 items-center rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm font-semibold text-[#3d4756] transition-colors hover:bg-[#f4f7f9]"
          >
            Все отчеты
          </Link>
        </div>
      </div>

      <div className="crm-table-wrap overflow-hidden">
        <div className="border-b border-[#e6ebf0] px-6 py-4">
          <p className="text-sm font-medium text-gray-700">Сводные метрики отчета</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="crm-table-head">
              <tr>
                <th className="crm-table-th">#</th>
                <th className="crm-table-th">Показатель</th>
                <th className="crm-table-th">Значение</th>
                <th className="crm-table-th">Тренд</th>
              </tr>
            </thead>
            <tbody className="crm-table-body">
              {tableRows.map((row, index) => (
                <tr key={row.metric} className="crm-table-row">
                  <td className="crm-table-cell">{index + 1}</td>
                  <td className="crm-table-cell font-medium text-[#273142]">{row.metric}</td>
                  <td className="crm-table-cell">{row.value}</td>
                  <td className="crm-table-cell">
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        row.trend.startsWith('+')
                          ? 'bg-[#e9faf7] text-[#148f85]'
                          : 'bg-[#fff1f1] text-[#c34c4c]'
                      }`}
                    >
                      {row.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="crm-surface p-5">
        <p className="text-sm text-[#6e7787]">
          Другие отчеты:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ANALYTICS_REPORTS.filter((item) => item.slug !== reportConfig.slug).map((item) => (
            <Link
              key={item.slug}
              href={`/analytics/${item.slug}`}
              className="rounded-lg border border-[#dbe2e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4c5665] transition-colors hover:bg-[#f4f7f9]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
