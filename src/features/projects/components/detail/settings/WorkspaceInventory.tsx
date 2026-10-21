import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectEnvironmentsQuery } from '@/queries/useProjects';

export default function WorkspaceInventory({
  projectId,
}: {
  projectId: string;
}) {
  const { data, isPending, isError } = useProjectEnvironmentsQuery(projectId);

  return (
    <section aria-label="Workspace inventory" className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Workspace inventory</h3>
        <p className="text-muted-foreground text-xs">
          Counts include only data assigned to a workspace. Historical data
          awaiting classification appears separately.
        </p>
      </div>

      {isPending && (
        <p className="text-muted-foreground text-sm">
          Loading workspace counts…
        </p>
      )}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Workspace counts are unavailable. Try refreshing this page.
          </AlertDescription>
        </Alert>
      )}
      {data && (
        <>
          {data.workspaces.length === 0 ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                No workspace records are available yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.workspaces.map((workspace) => (
                <Card key={workspace.id} className="gap-0 py-0">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{workspace.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {workspace.lifecycleStatus}
                        </p>
                      </div>
                      {workspace.active && <Badge size="xs">Selected</Badge>}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground text-xs">Jobs</dt>
                        <dd className="font-semibold">{workspace.jobs}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Connections
                        </dt>
                        <dd className="font-semibold">
                          {workspace.connections}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Runs</dt>
                        <dd className="font-semibold">{workspace.runs}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Run logs
                        </dt>
                        <dd className="font-semibold">{workspace.runLogs}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {(data.legacyUnassigned.jobs > 0 ||
            data.legacyUnassigned.connections > 0 ||
            data.legacyUnassigned.runs > 0 ||
            data.legacyUnassigned.runLogs > 0) && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                Unclassified legacy data — saved jobs:{' '}
                {data.legacyUnassigned.jobs}; connections:{' '}
                {data.legacyUnassigned.connections}; runs:{' '}
                {data.legacyUnassigned.runs}; run logs:{' '}
                {data.legacyUnassigned.runLogs}. These are excluded from
                workspace counts. Old shared jobs require manual recreation in
                each workspace at cutover; historical records need separate
                reconciliation.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </section>
  );
}
