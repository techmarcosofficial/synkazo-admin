import { AlertCircleIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PipelineItem } from '@/features/jobs/types';

interface PipelineStage {
  id: string;
  label: string;
  displayOrder?: number;
}

export default function StatusMappingStep({
  stStatuses,
  pipelines,
  destPipelineId,
  onPipelineChange,
  statusMapping,
  onStatusMappingChange,
  loading,
  error,
  onRetry,
}: {
  stStatuses: string[];
  pipelines: PipelineItem[];
  destPipelineId: string;
  onPipelineChange: (id: string) => void;
  statusMapping: Record<string, string | undefined>;
  onStatusMappingChange: (
    updater: (
      prev: Record<string, string | undefined>,
    ) => Record<string, string | undefined>,
  ) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const selectedPipeline = pipelines.find((p) => p.id === destPipelineId);
  const stages: PipelineStage[] = selectedPipeline?.stages ?? [];

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-3 py-20">
        <Spinner />
        <span className="text-sm">Loading pipeline data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">Pipeline Configuration</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Choose which HubSpot pipeline to use, then map each source status to a
          pipeline stage.
        </p>
      </div>

      <Field>
        <FieldLabel>HubSpot Pipeline</FieldLabel>
        {pipelines.length === 0 ? (
          <p className="text-destructive text-xs">
            No pipelines found for this object type. Create one in HubSpot
            first.
          </p>
        ) : (
          <Select value={destPipelineId} onValueChange={onPipelineChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      {stStatuses.length > 0 && stages.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-3 text-sm">
            Status → Stage Mapping
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Status</TableHead>
                <TableHead>HubSpot Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stStatuses.map((status) => (
                <TableRow key={status}>
                  <TableCell className="font-medium">{status}</TableCell>
                  <TableCell>
                    <Select
                      value={statusMapping[status] ?? '__unmapped'}
                      onValueChange={(v) =>
                        onStatusMappingChange((prev) => ({
                          ...prev,
                          [status]: v === '__unmapped' ? undefined : v,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unmapped">
                          — Not mapped —
                        </SelectItem>
                        {stages
                          .sort(
                            (a, b) =>
                              (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
                          )
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-muted-foreground mt-2 text-xs">
            Unmapped statuses will not update the pipeline stage in HubSpot.
          </p>
        </div>
      )}

      {stStatuses.length === 0 && (
        <Alert>
          <AlertCircleIcon />
          <AlertDescription>
            Could not load source statuses. You can still proceed — the pipeline
            will be set but stages won't be mapped.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
