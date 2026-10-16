import { useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganisationAnalytics } from '@/queries/usePlatformAnalytics';
import type { AnalyticsFilters } from '@/types/platformAnalytics';
import { AnalyticsSection } from './AnalyticsSection';
import { fullNumber, percentage } from './analyticsDisplay';

const billingLabels: Record<string, string> = {
  active: 'Active subscription',
  trialing: 'Trial',
  past_due: 'Past due',
  unpaid: 'Unpaid',
  canceled: 'Canceled',
  none: 'No subscription',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  paused: 'Paused',
  pending_cancel: 'Ending',
};
export default function TopOrganisations({
  filters,
  valid,
  refreshVersion,
}: {
  filters: AnalyticsFilters;
  valid: boolean;
  refreshVersion: number;
}) {
  const result = useOrganisationAnalytics(
    { ...filters, page: 1, limit: 5, sort: 'records', direction: 'desc' },
    valid,
  );
  const { refetch } = result;
  useEffect(() => {
    if (refreshVersion > 0 && valid) void refetch();
  }, [refreshVersion, valid, refetch]);
  return (
    <AnalyticsSection
      title="Top organisations"
      icon={Building2}
      description="Ranked by records processed in the selected period. Billing status is current."
      loading={result.isLoading && valid}
      error={
        !valid
          ? 'Choose a valid date range to compare organisations.'
          : result.isError
            ? 'Organisations could not be loaded. Refresh to retry.'
            : undefined
      }
      action={
        <Button size="sm" variant="outline" asChild>
          <Link to="/super-admin/organisations">
            View organisations
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      {!result.data?.data.length ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No organisations to compare in this period.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Records processed</TableHead>
              <TableHead className="text-right">Sync runs</TableHead>
              <TableHead className="text-right">Success rate</TableHead>
              <TableHead>Billing status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.data.map((row) => (
              <TableRow key={row.organisationId}>
                <TableCell className="font-medium">
                  {row.status === 'deleted' ? (
                    row.name
                  ) : (
                    <Link
                      className="focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm outline-none hover:underline focus-visible:ring-2"
                      to={`/super-admin/organisations/${row.organisationId}/overview`}
                    >
                      {row.name}
                      <ArrowUpRight className="text-muted-foreground size-3" />
                    </Link>
                  )}
                  {row.archived && row.status !== 'deleted' && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      Archived
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge size="xs" variant="secondary">
                    {row.planName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fullNumber(row.recordsWritten)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fullNumber(row.runs)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {percentage(row.successRate)}
                </TableCell>
                <TableCell>
                  {row.status === 'deleted' ? (
                    <span className="text-muted-foreground text-xs">
                      Unavailable
                    </span>
                  ) : (
                    <Link
                      to={`/super-admin/organisations/${row.organisationId}/billing`}
                    >
                      <Badge
                        size="xs"
                        variant={
                          row.subscriptionStatus === 'past_due' ||
                          row.subscriptionStatus === 'unpaid'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {row.subscriptionStatus
                          ? (billingLabels[row.subscriptionStatus] ?? 'Unknown')
                          : 'Unavailable'}
                      </Badge>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AnalyticsSection>
  );
}
