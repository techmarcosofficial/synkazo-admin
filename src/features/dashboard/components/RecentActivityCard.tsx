import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { OrgSyncLog } from '../types';

import { PlatformPair } from '@/components/platform';
import ListRow from '@/components/shared/list/ListRow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LOG_TONE: Record<string, string> = {
  info: 'bg-info',
  warn: 'bg-warning',
  error: 'bg-destructive',
  success: 'bg-success',
};

const STATUS_LABEL: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-success', label: 'Success' },
  partial: { dot: 'bg-warning', label: 'Partial' },
  failed: { dot: 'bg-destructive', label: 'Failed' },
  cancelled: { dot: 'bg-muted-foreground', label: 'Stopped' },
};

export interface RecentActivityCardProps {
  logs: OrgSyncLog[];
}

export default function RecentActivityCard({ logs }: RecentActivityCardProps) {
  return (
    <div className="bg-card overflow-hidden rounded-4xl border">
      <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
        <h3 className="text-md font-semibold">Recent activity</h3>
        <Button asChild variant="link" size="sm">
          <Link to="/logs">
            History <ArrowRight />
          </Link>
        </Button>
      </div>
      {logs.length === 0 ? (
        <div className="text-muted-foreground p-10 text-center text-sm">
          No activity yet
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {logs.map((log, i) => {
            const title = log.jobRunId ? `Run ID: ${log.jobRunId}` : undefined;
            return (
              <ListRow key={log.id ?? i} className="items-start" title={title}>
                <span
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    LOG_TONE[log.level ?? ''] ?? 'bg-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {log.metadata?.projectName && (
                      <span className="text-sm font-medium">
                        {log.metadata.projectName}
                      </span>
                    )}
                    {log.metadata?.sourcePlatformId &&
                      log.metadata?.destPlatformId && (
                        <PlatformPair
                          sourcePlatformId={log.metadata.sourcePlatformId}
                          destPlatformId={log.metadata.destPlatformId}
                          variant="text"
                          size="sm"
                        />
                      )}
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {log.message}
                  </p>
                </div>
                {log.createdAt && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </ListRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
