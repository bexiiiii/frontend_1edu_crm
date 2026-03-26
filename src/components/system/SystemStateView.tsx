import Link from 'next/link';
import { ArrowLeft, Home, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemPageAction, SystemPageTone } from '@/constants/system-pages';

type SystemStateViewProps = {
  code?: string;
  badge: string;
  title: string;
  description: string;
  note?: string;
  icon: LucideIcon;
  spinIcon?: boolean;
  tone: SystemPageTone;
  actions?: SystemPageAction[];
};

const toneClasses: Record<SystemPageTone, { badge: string; iconWrap: string; icon: string }> = {
  accent: {
    badge: 'border-[#b9ece7] bg-[#e9faf7] text-[#138f86]',
    iconWrap: 'bg-[#e9faf7]',
    icon: 'text-[#138f86]',
  },
  warning: {
    badge: 'border-[#f1deba] bg-[#fff7e9] text-[#b17b2f]',
    iconWrap: 'bg-[#fff7e9]',
    icon: 'text-[#b17b2f]',
  },
  danger: {
    badge: 'border-[#f4caca] bg-[#fff1f1] text-[#c34c4c]',
    iconWrap: 'bg-[#fff1f1]',
    icon: 'text-[#c34c4c]',
  },
  neutral: {
    badge: 'border-[#dbe2e8] bg-[#eef3f7] text-[#5f6a7a]',
    iconWrap: 'bg-[#eef3f7]',
    icon: 'text-[#5f6a7a]',
  },
};

const toActionClass = (variant: SystemPageAction['variant']) =>
  variant === 'primary'
    ? 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25c4b8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1eb3a8]'
    : 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#dbe2e8] bg-white px-4 text-sm font-semibold text-[#3d4756] transition-colors hover:bg-[#f4f7f9]';

export function SystemStateView({
  code,
  badge,
  title,
  description,
  note,
  icon: Icon,
  spinIcon = false,
  tone,
  actions,
}: SystemStateViewProps) {
  const toneClass = toneClasses[tone];
  const resolvedActions = actions && actions.length > 0
    ? actions
    : [
        { label: 'На главную', href: '/', variant: 'primary' as const },
        { label: 'Назад к разделам', href: '/system', variant: 'secondary' as const },
      ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-4xl items-center justify-center">
      <div className="crm-surface w-full p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex rounded-lg border px-3 py-1 text-xs font-semibold', toneClass.badge)}>
            {badge}
          </span>
          {code ? (
            <span className="inline-flex rounded-lg border border-[#dbe2e8] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#5f6a7a]">
              Код {code}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-start gap-4">
          <span className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', toneClass.iconWrap)}>
            <Icon className={cn('h-6 w-6', toneClass.icon, spinIcon && 'animate-spin')} />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-[#202938]">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7786]">{description}</p>
            {note ? (
              <p className="mt-2 text-sm font-medium text-[#4f5c6c]">{note}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {resolvedActions.map((action) => {
            const IconComponent = action.href === '/' ? Home : ArrowLeft;
            return (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={toActionClass(action.variant)}
              >
                <IconComponent className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
