import { Check, ChevronRight, Circle } from 'lucide-react';

import type { AssociationRule } from '@/api/associations';
import ListRow from '@/components/shared/list/ListRow';
import type {
  ConnectionExt,
  JobExt,
  ProjectExt,
} from '@/features/projects/hooks';
import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import { hasBothConnections as checkBothConnections } from '@/features/projects/lib/projectSetupState';
import { cn } from '@/lib/utils';

interface ProjectConfigChecklistProps {
  project: ProjectExt;
  connections: ConnectionExt[];
  jobs: JobExt[];
  associationRules: AssociationRule[];
  onNavigate: (tab: ProjectDetailTabId) => void;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  description: string;
  tab: ProjectDetailTabId;
  optional?: boolean;
}

export default function ProjectConfigChecklist({
  project,
  connections,
  jobs,
  associationRules,
  onNavigate,
}: ProjectConfigChecklistProps) {
  const bothConnected = checkBothConnections(connections);
  const hasEnabledJob = jobs.some((j) => j.isEnabled);
  const hasSchedule = jobs.some(
    (j) =>
      (j.scheduleTimes?.length ?? 0) > 0 || (j.scheduleDays?.length ?? 0) > 0,
  );

  const items: ChecklistItem[] = [
    {
      label: 'Connections',
      done: bothConnected,
      description: bothConnected
        ? 'Source and destination connected'
        : 'Connect source & destination',
      tab: 'connections',
    },
    {
      label: 'Sync Jobs',
      done: hasEnabledJob,
      description: hasEnabledJob
        ? `${jobs.filter((j) => j.isEnabled).length} active sync job(s)`
        : 'Create a sync job',
      tab: 'sync-rules',
    },
    {
      // No field-mapping-completeness signal exists in the data already
      // fetched for this page (listFieldMappings is a separate, non-bundled
      // call), so this row is always actionable rather than falsely
      // reporting "done" once a job exists.
      label: 'Field Mapping',
      done: false,
      description:
        jobs.length > 0
          ? `Configure field mapping for ${jobs.length} sync job(s)`
          : 'Create a sync job first',
      tab: 'sync-rules',
    },
    {
      label: 'Scheduler',
      done: hasSchedule,
      description: hasSchedule
        ? 'Sync schedule configured'
        : 'Set up a sync schedule',
      tab: 'scheduler',
    },
    {
      label: 'Associations',
      done: associationRules.length > 0,
      description:
        associationRules.length > 0
          ? `${associationRules.length} rule(s) configured`
          : 'Add association rules',
      tab: 'associations',
      optional: true,
    },
    {
      label: 'Environment Sync',
      done: !!project.activeEnvironment,
      description: project.activeEnvironment
        ? `${project.activeEnvironment} active`
        : 'Activate an environment',
      tab: 'environment-sync',
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  return (
    <div className="bg-card overflow-hidden rounded-4xl border">
      <div className="bg-muted flex flex-row items-center justify-between border-b px-3 py-2">
        <h3 className="text-md font-bold">Configuration</h3>
        <span className="text-muted-foreground text-xs">
          {completedCount} of {items.length} complete
        </span>
      </div>
      {items.map((item) => (
        <ListRow key={item.label} asChild>
          <button
            type="button"
            className="w-full"
            onClick={() => onNavigate(item.tab)}
          >
            {item.done ? (
              <Check className="text-success size-4 shrink-0" />
            ) : (
              <Circle
                className={cn(
                  'size-4 shrink-0',
                  item.optional ? 'text-muted-foreground' : 'text-warning',
                )}
              />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium">
                {item.label}
                {item.optional && (
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    (optional)
                  </span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {item.description}
              </p>
            </div>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </button>
        </ListRow>
      ))}
    </div>
  );
}
