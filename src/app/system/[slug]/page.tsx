import type { Metadata } from 'next';
import {
  AlertTriangle,
  CloudOff,
  Clock3,
  Gauge,
  Loader2,
  LockKeyhole,
  ServerCrash,
  ShieldAlert,
  Wrench,
  Construction,
  type LucideIcon,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { SystemStateView } from '@/components/system/SystemStateView';
import {
  SYSTEM_PAGE_ITEMS,
  SYSTEM_PAGES_BY_SLUG,
  type SystemPageIcon,
} from '@/constants/system-pages';

type SystemPageProps = {
  params: Promise<{ slug: string }>;
};

const iconMap: Record<SystemPageIcon, LucideIcon> = {
  alert: AlertTriangle,
  shield: ShieldAlert,
  lock: LockKeyhole,
  clock: Clock3,
  gauge: Gauge,
  server: ServerCrash,
  'cloud-off': CloudOff,
  wrench: Wrench,
  construction: Construction,
  loader: Loader2,
};

export function generateStaticParams() {
  return SYSTEM_PAGE_ITEMS.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: SystemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = SYSTEM_PAGES_BY_SLUG[slug];

  if (!config) {
    return { title: 'Страница не найдена | 1edu crm' };
  }

  return {
    title: `${config.badge} | 1edu crm`,
    description: config.description,
  };
}

export default async function SystemStatePage({ params }: SystemPageProps) {
  const { slug } = await params;
  const config = SYSTEM_PAGES_BY_SLUG[slug];

  if (!config) {
    notFound();
  }

  const Icon = iconMap[config.icon] ?? AlertTriangle;

  return (
    <SystemStateView
      code={config.code}
      badge={config.badge}
      title={config.title}
      description={config.description}
      note={config.note}
      icon={Icon}
      spinIcon={config.spinIcon}
      tone={config.tone}
      actions={config.actions}
    />
  );
}
