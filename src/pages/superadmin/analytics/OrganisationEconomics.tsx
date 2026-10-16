import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useOrganisationAnalytics } from '@/queries/usePlatformAnalytics';
import type {
  AnalyticsFilters,
  OrganisationAnalyticsFilters,
} from '@/types/platformAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalyticsSection, EmptyChart } from './AnalyticsSection';
import {
  chartMoney,
  compactNumber,
  fullNumber,
  hours,
  moneyLabel,
  percentage,
  runHoursPerHundred,
} from './analyticsDisplay';

export default function OrganisationEconomics({
  filters,
  enabled,
  refreshVersion,
}: {
  filters: AnalyticsFilters;
  enabled: boolean;
  refreshVersion: number;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] =
    useState<OrganisationAnalyticsFilters['sort']>('duration');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'table' | 'scatter'>('table');
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const query = useOrganisationAnalytics(
    {
      ...filters,
      page,
      limit: 10,
      sort,
      direction,
      search: debouncedSearch || undefined,
    },
    enabled,
  );
  const { refetch } = query;
  useEffect(() => {
    if (refreshVersion) void refetch();
  }, [refreshVersion, refetch]);
  const data = query.data;
  const chartData = (data?.data ?? []).flatMap((row) => {
    const collections = chartMoney(row.collectedMinor, filters.currency);
    return collections == null || row.missingDurationRuns > 0
      ? []
      : [
          {
            name: row.name,
            collections,
            runHours: row.durationMs / 3600000,
            runs: row.runs,
          },
        ];
  });
  return (
    <AnalyticsSection
      title="Organisation economics"
      description="Collections beside workload for the selected period. Run time measures work, not infrastructure cost."
      loading={query.isLoading && enabled}
      error={
        query.isError
          ? 'Organisation analytics could not be loaded. Refresh to retry.'
          : undefined
      }
      action={
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            onClick={() => setView('table')}
          >
            Table
          </Button>
          <Button
            size="sm"
            variant={view === 'scatter' ? 'secondary' : 'ghost'}
            onClick={() => setView('scatter')}
          >
            Compare
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search organisations"
          placeholder="Search organisations…"
          className="w-full sm:w-64"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as OrganisationAnalyticsFilters['sort']);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Rank organisations by" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">Run time</SelectItem>
            <SelectItem value="runs">Sync runs</SelectItem>
            <SelectItem value="records">Records written</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            {data?.quality.status === 'reconciled' && (
              <SelectItem value="collections">Collections</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label={
            direction === 'desc' ? 'Sort ascending' : 'Sort descending'
          }
          onClick={() => {
            setDirection((value) => (value === 'desc' ? 'asc' : 'desc'));
            setPage(1);
          }}
        >
          <ArrowDown className={direction === 'asc' ? 'rotate-180' : ''} />
        </Button>
        <p className="text-muted-foreground text-xs sm:ml-auto">
          Includes archived organisations · {filters.currency} payments
        </p>
      </div>
      {view === 'scatter' ? (
        chartData.length ? (
          <>
            <ChartContainer
              config={{
                runHours: { label: 'Run hours', color: 'var(--chart-1)' },
              }}
              className="aspect-auto h-72 w-full"
              aria-label="Organisation collections versus run hours"
            >
              <ScatterChart
                margin={{ top: 12, right: 20, bottom: 25, left: 0 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  type="number"
                  dataKey="collections"
                  name={`Collections (${filters.currency})`}
                  tickFormatter={compactNumber}
                  label={{
                    value: `Collected payments (${filters.currency})`,
                    position: 'insideBottom',
                    offset: -15,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="runHours"
                  name="Run hours"
                  tickFormatter={compactNumber}
                />
                <ZAxis
                  type="number"
                  dataKey="runs"
                  range={[48, 360]}
                  name="Runs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter
                  data={chartData}
                  fill="var(--color-runHours)"
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ChartContainer>
            <p className="text-muted-foreground text-xs">
              Current page only; rows with incomplete duration or unavailable
              collections are excluded. Bubble size represents sync runs. Switch
              to the table for exact values and organisation links.
            </p>
          </>
        ) : (
          <EmptyChart>
            Comparison needs reconciled collections and complete duration
            measurements. Workload remains available in the table.
          </EmptyChart>
        )
      ) : !data?.data.length ? (
        <EmptyChart>No organisations match these filters.</EmptyChart>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Collections</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Records written</TableHead>
                <TableHead className="text-right">Run time</TableHead>
                <TableHead className="text-right">Success</TableHead>
                {data.quality.status === 'reconciled' && (
                  <TableHead
                    className="text-right"
                    title="Measured run hours per 100 collected currency units in the selected period. Unavailable when duration measurements are incomplete."
                  >
                    Run h / 100 {filters.currency}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.organisationId}>
                  <TableCell>
                    {row.status === 'deleted' ? (
                      <span className="font-medium">{row.name}</span>
                    ) : (
                      <Link
                        className="group flex items-center gap-2 font-medium hover:underline"
                        to={`/super-admin/organisations/${row.organisationId}`}
                      >
                        <span className="max-w-56 truncate">{row.name}</span>
                        <ArrowUpRight
                          aria-hidden
                          className="text-muted-foreground size-3.5"
                        />
                      </Link>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {row.planName}
                      {row.archived ? ' · Archived' : ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      title={
                        row.collectedMinor == null
                          ? 'Provider reconciliation required'
                          : undefined
                      }
                    >
                      {moneyLabel(row.collectedMinor, filters.currency)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fullNumber(row.runs)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fullNumber(row.recordsWritten)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {hours(row.durationMs)}
                    {row.missingDurationRuns > 0 && (
                      <p className="text-warning text-xs">
                        {row.missingDurationRuns} unmeasured
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {percentage(row.successRate)}
                  </TableCell>
                  {data.quality.status === 'reconciled' && (
                    <TableCell className="text-right tabular-nums">
                      {runHoursPerHundred(
                        row.durationMs,
                        row.missingDurationRuns,
                        row.collectedMinor,
                        filters.currency,
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {fullNumber(data.total)} organisations · Page {page} of{' '}
              {Math.max(1, Math.ceil(data.total / 10))}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon-sm"
                variant="outline"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((value) => value - 1)}
                aria-label="Previous organisations"
              >
                <ChevronLeft />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={page * 10 >= data.total || query.isFetching}
                onClick={() => setPage((value) => value + 1)}
                aria-label="Next organisations"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
      {data?.quality.status !== 'reconciled' && (
        <p className="text-muted-foreground mt-3 text-xs">
          Collection amounts remain unavailable until provider reconciliation.
          Workload is not an estimate of profit or cost.
        </p>
      )}
    </AnalyticsSection>
  );
}
