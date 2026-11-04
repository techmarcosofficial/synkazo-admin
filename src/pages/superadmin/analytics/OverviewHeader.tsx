import { RefreshCw } from 'lucide-react';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { inclusiveEnd } from './OverviewDateRangePicker';

export { inclusiveEnd };

export default function OverviewHeader({
  refresh,
  refreshing,
  valid,
}: {
  refresh: () => void;
  refreshing: boolean;
  valid: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <HeadingPair
        level="h1"
        title="Platform overview"
        subtitle="Your organisations, billing and platform health at a glance."
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!valid || refreshing}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
