import { RotateCcw, Save, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import {
  useResetTwoWaySyncIntervalMutation,
  useSetTwoWaySyncIntervalMutation,
  useTwoWaySyncIntervalsQuery,
} from '@/queries/useTwoWaySync';

// Super-admin "Two-Way Sync Time" — per source platform polling interval. This
// is the only place two-way sync cadence can be tuned; regular users cannot
// schedule two-way sync at all (item 5).
export default function TwoWaySyncSettingsCard() {
  const query = useTwoWaySyncIntervalsQuery();
  const setMutation = useSetTwoWaySyncIntervalMutation();
  const resetMutation = useResetTwoWaySyncIntervalMutation();

  // Local edit buffer keyed by platformId so each row edits independently.
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setDrafts(
      Object.fromEntries(
        query.data.map((r) => [r.platformId, r.intervalMinutes]),
      ),
    );
  }, [query.data]);

  const save = async (platformId: string) => {
    const minutes = drafts[platformId];
    if (!Number.isFinite(minutes) || minutes < 1) {
      showToast.error('Interval must be at least 1 minute.');
      return;
    }
    setPending(platformId);
    try {
      await setMutation.mutateAsync({
        platformId,
        intervalMinutes: Math.round(minutes),
      });
      showToast.success('Interval saved.');
    } catch {
      showToast.error('Failed to save interval. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const reset = async (platformId: string) => {
    setPending(platformId);
    try {
      await resetMutation.mutateAsync(platformId);
      showToast.success('Reset to system default.');
    } catch {
      showToast.error('Failed to reset interval. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Timer className="size-4" />
          Two-Way Sync Time
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Two-way syncs run on a fixed, automatic interval — users can't
          schedule them. Override the polling interval per source platform here.
          The default is 2 minutes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <SkeletonList count={3} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <div className="space-y-3">
            {(query.data ?? []).map((row) => {
              const draft = drafts[row.platformId] ?? row.intervalMinutes;
              const dirty = draft !== row.intervalMinutes;
              const busy = pending === row.platformId;
              return (
                <div
                  key={row.platformId}
                  className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-4xl border p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.label}</span>
                    {row.isDefault && (
                      <Badge className="bg-muted text-muted-foreground">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.platformId]: Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          ),
                        }))
                      }
                      className="w-24 font-mono"
                      aria-label={`${row.label} interval in minutes`}
                    />
                    <span className="text-muted-foreground text-sm">min</span>
                    <Button
                      size="sm"
                      onClick={() => save(row.platformId)}
                      disabled={busy || !dirty}
                    >
                      {busy ? <Spinner /> : <Save />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reset(row.platformId)}
                      disabled={busy || row.isDefault}
                      title="Reset to system default (2 min)"
                    >
                      <RotateCcw />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
