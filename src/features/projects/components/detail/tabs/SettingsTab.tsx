import { CalendarClock, Layers3, Link2, Lock, Settings2 } from 'lucide-react';
import { lazy, Suspense, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';
import ProjectSettingsNavigation from '../ProjectSettingsNavigation';
import { EnvironmentHeaderActionContext } from '../settings/EnvironmentHeaderActionContext';
import {
  DangerZoneCard,
  GeneralSettingsCard,
  ProjectContextCard,
} from '../settings';

import EmptyState from '@/components/shared/EmptyState';
import HeadingPair from '@/components/shared/HeadingPair';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProjectSettingsSections,
  type ProjectSettingsSectionView,
} from '@/features/projects/hooks';
import type { ProjectSettingsSectionId } from '@/features/projects/lib/projectSettingsSections';

const SchedulerSection = lazy(() => import('./SchedulerTab'));
const AssociationsSection = lazy(() => import('./AssociationsTab'));
const EnvironmentsSection = lazy(() => import('./EnvironmentSyncTab'));

const SECTION_ICONS: Record<
  ProjectSettingsSectionId,
  ComponentType<{ className?: string }>
> = {
  general: Settings2,
  schedule: CalendarClock,
  associations: Link2,
  environments: Layers3,
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
  if (id === 'schedule') return <SchedulerSection />;
  if (id === 'associations') return <AssociationsSection />;
  return <EnvironmentsSection />;
}

function LockedSection({ section }: { section: ProjectSettingsSectionView }) {
  const { hasBothConnections, handleTabChange } = useProjectDetailContext();
  const needsConnections = !hasBothConnections;

  return (
    <Card size="sm">
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

export default function SettingsTab() {
  const { hasBothConnections, hasJobs } = useProjectDetailContext();
  const [environmentActionHost, setEnvironmentActionHost] =
    useState<HTMLDivElement | null>(null);
  const { activeSection, sections, handleSectionChange, sectionHref } =
    useProjectSettingsSections({ hasBothConnections, hasJobs });

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
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <ProjectSettingsNavigation
        activeId={activeSection.id}
        items={sections.map((section) => ({
          id: section.id,
          label: section.label,
          icon: SECTION_ICONS[section.id],
          locked: section.locked,
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

      {activeSection.id === 'associations' ? (
        <section className="min-w-0" aria-label="Associations settings">
          {sectionBody}
        </section>
      ) : (
        <Card
          className="min-w-0 gap-0 py-0"
          aria-labelledby="project-settings-section-title"
        >
          <CardHeader className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <HeadingPair
              titleId="project-settings-section-title"
              title={activeSection.label}
              subtitle={activeSection.description}
            />
            {activeSection.id === 'environments' && (
              <div ref={setEnvironmentActionHost} className="shrink-0" />
            )}
          </CardHeader>

          <CardContent className="px-3.5 pt-2.5 pb-3.5 sm:px-4 sm:pb-4">
            <EnvironmentHeaderActionContext.Provider value={environmentActionHost}>
              {sectionBody}
            </EnvironmentHeaderActionContext.Provider>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
