import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function PrioritySchedulerOverviewCard({
  enabled,
  onEnabledChange,
  disabled,
  schedule,
  status,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  schedule: ReactNode;
  status: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
        <CardTitle>Priority scheduler</CardTitle>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
          aria-label="Enable priority scheduler"
        />
      </CardHeader>
      <CardContent className={enabled ? 'p-0' : 'hidden'}>
        <div className="grid gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:divide-x">
          <div className="min-w-0">{schedule}</div>
          <div className="min-w-0 lg:pl-5">{status}</div>
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
