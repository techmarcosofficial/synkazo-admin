import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSuperAdminActivityQuery } from '@/queries/useSuperAdmin';

type SeverityFilter = 'all' | 'INFO' | 'WARNING' | 'ERROR';

export default function OrganisationActivityPage() {
  const { organisationId = '' } = useParams<{ organisationId: string }>();
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const actionPrefix = useDebouncedValue(action.trim(), 300);
  const query = useSuperAdminActivityQuery(organisationId, {
    page,
    limit: pageSize,
    action: actionPrefix || undefined,
    severity: severity === 'all' ? undefined : severity,
  });
  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <HeadingPair
              title="Audit trail"
              subtitle="Review actions, actors, and severity without exposing raw event payloads."
            />
            <ManagementToolbar
              searchValue={action}
              onSearchChange={(value) => {
                setAction(value);
                setPage(1);
              }}
              searchPlaceholder="Filter by action prefix…"
              filters={
                <Select
                  value={severity}
                  onValueChange={(value: SeverityFilter) => {
                    setSeverity(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="bg-muted sm:w-40"
                    aria-label="Filter activity by severity"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severity</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>

          {query.isLoading ? (
            <SkeletonList count={5} />
          ) : query.isError ? (
            <ErrorState
              title="Could not load activity"
              onRetry={() => query.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={
                action || severity !== 'all'
                  ? 'No matching activity'
                  : 'No activity yet'
              }
              description="Try another action or severity filter."
            />
          ) : (
            <div className="overflow-x-auto rounded-3xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.action}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.resource ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.actor?.email ?? 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.severity === 'ERROR'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {entry.severity}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground text-sm"
                        title={entry.createdAt}
                      >
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {total > 0 && (
        <PaginationBar
          page={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
