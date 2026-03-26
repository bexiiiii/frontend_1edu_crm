import Link from 'next/link';
import { SYSTEM_ERROR_ITEMS, SYSTEM_STATUS_ITEMS } from '@/constants/system-pages';

export default function SystemPagesIndex() {
  return (
    <div className="space-y-4">
      <div className="crm-surface p-5">
        <h2 className="text-2xl font-semibold text-[#202938]">Системные страницы</h2>
        <p className="mt-2 text-sm text-[#7f8794]">
          Набор служебных экранов в едином стиле CRM: частые коды ошибок, загрузка, техобслуживание и статусы сервиса.
        </p>
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Частые коды ошибок</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SYSTEM_ERROR_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={`/system/${item.slug}`}
              className="crm-surface-soft rounded-xl p-4 transition-colors hover:bg-[#f2f7fa]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7a8391]">{item.badge}</p>
              <p className="mt-2 text-base font-semibold text-[#273142]">{item.title}</p>
              <p className="mt-1 text-sm text-[#6f7786]">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="crm-surface p-5">
        <h3 className="text-lg font-semibold text-[#202938]">Состояния сервиса</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SYSTEM_STATUS_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={`/system/${item.slug}`}
              className="crm-surface-soft rounded-xl p-4 transition-colors hover:bg-[#f2f7fa]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7a8391]">{item.badge}</p>
              <p className="mt-2 text-base font-semibold text-[#273142]">{item.title}</p>
              <p className="mt-1 text-sm text-[#6f7786]">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

