import { Tabs } from '@/components/ui/vercel-tabs';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'activity', label: 'Activity' },
  { id: 'domains', label: 'Domains' },
  { id: 'usage', label: 'Usage' },
  { id: 'monitoring', label: 'Monitoring' },
];

export function VercelTabsDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Tabs tabs={tabs} onTabChange={(tabId) => console.log(`Tab changed to: ${tabId}`)} />
    </div>
  );
}

