import {
  Activity,
  Layers3,
  Link2,
  Lock,
  Settings2,
} from 'lucide-react';
import { lazy, Suspense, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';
import ProjectSettingsNavigation from '../ProjectSettingsNavigation';
import {
  DangerZoneCard,
  GeneralSettingsCard,
  ProjectContextCard,
  RecordDeletionPolicyCard,
} from '../settings';

import ConnectionEnvDropdown from '@/components/connections/ConnectionEnvToggle';
import EmptyState from '@/components/shared/EmptyState';
import HeadingPair from '@/components/shared/HeadingPair';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProjectSettingsSections,
  type ProjectSettingsSectionView,
} from '@/features/projects/hooks';
import type { ProjectSettingsSectionId } from '@/features/projects/lib/projectSettingsSections';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { ProjectEnvironment } from '@/types';

const AssociationsSection = lazy(() => import('./AssociationsTab'));
const EnvironmentsSection = lazy(() => import('./EnvironmentSyncTab'));
const ActivitySection = lazy(() => import('./ActivityTab'));

const SECTION_ICONS: Record<
  ProjectSettingsSectionId,
  ComponentType<{ className?: string }>
> = {
  general: Settings2,
  associations: Link2,
  environments: Layers3,
  activity: Activity,
};

function SectionSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading project settings">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function GeneralSection({ environmentsHref }: { environmentsHref: string }) {
  const navigate = useNavigate();
  const { project, patchProject, projectActiveEnv } = useProjectDetailContext();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-7">
        <GeneralSettingsCard
          project={project}
          onUpdated={patchProject}
          className="h-full border"
        />
      </div>
      <div className="min-w-0 xl:col-span-5">
        <ProjectContextCard
          project={project}
          activeEnvironment={projectActiveEnv}
          environmentsHref={environmentsHref}
          className="h-full border"
        />
      </div>
      <div className="min-w-0 xl:col-span-12">
        <RecordDeletionPolicyCard project={project} onUpdated={patchProject} />
      </div>
      <div className="min-w-0 xl:col-span-12">
        <DangerZoneCard
          project={project}
          onDeleted={() => navigate('/projects')}
        />
      </div>
    </div>
  );
}

function SectionContent({
  id,
  environmentsHref,
}: {
  id: ProjectSettingsSectionId;
  environmentsHref: string;
}) {
  if (id === 'general') {
    return <GeneralSection environmentsHref={environmentsHref} />;
  }
  if (id === 'associations') return <AssociationsSection />;
  if (id === 'activity') return <ActivitySection />;
  return <EnvironmentsSection />;
}

function LockedSection({ section }: { section: ProjectSettingsSectionView }) {
  const { hasBothConnections, handleTabChange } = useProjectDetailContext();
  const needsConnections = !hasBothConnections;

  return (
    <EmptyState
      icon={Lock}
      title={`${section.label} is not ready yet`}
      description={section.lockReason}
      action={{
        label: needsConnections ? 'Go to Connections' : 'Go to Sync Jobs',
        onClick: () =>
          handleTabChange(needsConnections ? 'connections' : 'sync-rules'),
      }}
    />
  );
}

export default function SettingsTab() {
  const {
    hasBothConnections,
    hasJobs,
    projectActiveEnv,
    envHasAnyConnected,
    envFullyConnected,
    onActivateEnv,
  } = useProjectDetailContext();
  const { confirm } = useConfirmDialog();
  const { activeSection, sections, handleSectionChange, sectionHref } =
    useProjectSettingsSections({ hasBothConnections, hasJobs });

  const handleEnvSwitch = (targetEnv: ProjectEnvironment) => {
    if (targetEnv === projectActiveEnv) return;
    const targetLabel = targetEnv === 'sandbox' ? 'Sandbox' : 'Production';
    const currentLabel = projectActiveEnv
      ? projectActiveEnv === 'sandbox'
        ? 'Sandbox'
        : 'Production'
      : 'no active environment';

    confirm({
      variant: 'warning',
      title: `${projectActiveEnv ? 'Switch to' : 'Activate'} ${targetLabel}?`,
      description: `This changes the active sync environment from ${currentLabel} to ${targetLabel}.`,
      body: (
        <div className="space-y-2 text-sm">
          <p>
            Runs already queued or running keep the environment captured when
            they were queued. Newly queued syncs use {targetLabel}.
          </p>
          <p className="text-muted-foreground">
            This does not copy jobs, mappings, objects, or properties between
            environments.
          </p>
        </div>
      ),
      confirmLabel: projectActiveEnv
        ? `Switch to ${targetLabel}`
        : `Activate ${targetLabel}`,
      onConfirm: () => onActivateEnv(targetEnv),
    });
  };

  const sectionBody = activeSection.locked ? (
    <LockedSection section={activeSection} />
  ) : (
    <Suspense fallback={<SectionSkeleton />}>
      <SectionContent
        id={activeSection.id}
        environmentsHref={sectionHref('environments')}
      />
    </Suspense>
  );

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <ProjectSettingsNavigation
        activeId={activeSection.id}
        items={sections.map((section) => ({
          id: section.id,
          label: section.label,
          icon: SECTION_ICONS[section.id],
          locked: section.locked,
          groupLabel: section.group === 'activity' ? 'Activity' : undefined,
        }))}
        onSelect={(id) => handleSectionChange(id as ProjectSettingsSectionId)}
        renderLink={(item, children) => (
          <Link
            to={sectionHref(item.id as ProjectSettingsSectionId)}
            aria-current={item.id === activeSection.id ? 'page' : undefined}
          >
            {children}
          </Link>
        )}
      />

      {activeSection.id === 'associations' ||
      activeSection.id === 'activity' ? (
        <section
          className="min-w-0"
          aria-label={`${activeSection.label} settings`}
        >
          {sectionBody}
        </section>
      ) : (
        <div
          className="min-w-0 space-y-4"
          aria-labelledby="project-settings-section-title"
        >
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <HeadingPair
              titleId="project-settings-section-title"
              title={activeSection.label}
              subtitle={activeSection.description}
            />
            {activeSection.id === 'environments' && (
              <div className="shrink-0">
                <ConnectionEnvDropdown
                  activeEnv={projectActiveEnv ?? 'sandbox'}
                  onChange={(env) => handleEnvSwitch(env as ProjectEnvironment)}
                  projectActiveEnv={projectActiveEnv}
                  envHasAnyConnected={envHasAnyConnected}
                  envFullyConnected={envFullyConnected}
                  label="Active environment:"
                />
              </div>
            )}
          </div>

          <div>{sectionBody}</div>
        </div>
      )}
    </div>
  );
}
