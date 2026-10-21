import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SyncFlowPanel({
  action,
  children,
  hasFlows,
}: {
  action?: ReactNode;
  children: ReactNode;
  hasFlows: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle visualLevel="section">Sync flows</CardTitle>
          <CardDescription visualLevel="section">
            View each data flow and expand a sync flow to review its recent
            performance.
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className={hasFlows ? 'space-y-3' : undefined}>
        {children}
      </CardContent>
    </Card>
  );
}
