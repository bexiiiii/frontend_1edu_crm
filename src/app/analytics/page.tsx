import Link from 'next/link';
import { ANALYTICS_REPORTS } from '@/constants/analytics';

export default function AnalyticsIndexPage() {
  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <p className="text-sm text-[#6e7787]">
          Выберите нужный отчет аналитики из списка ниже или через меню в сайдбаре.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ANALYTICS_REPORTS.map((report) => (
          <Link
            key={report.slug}
            href={`/analytics/${report.slug}`}
            className="crm-surface block rounded-2xl border border-[#e2e8ee] p-5 transition-colors hover:bg-[#f7fbfb]"
          >
            <p className="text-base font-semibold text-[#202938]">{report.label}</p>
            <p className="mt-2 text-sm text-[#7f8794]">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
