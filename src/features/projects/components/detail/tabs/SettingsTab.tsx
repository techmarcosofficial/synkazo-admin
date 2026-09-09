import { CalendarClock, Layers3, Link2, Lock, Settings2 } from 'lucide-react';
import { lazy, Suspense, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useProjectDetailContext } from '../context';
import {
  DangerZoneCard,
  GeneralSettingsCard,
  ProjectContextCard,
} from '../settings';

import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      <aside className="min-w-0" aria-label="Project settings">
        <Card
          size="sm"
          className="top-[calc(var(--detail-sticky-top)+var(--detail-header-height)+(--spacing(4)))] gap-0 py-0 lg:sticky"
        >
          <CardHeader className="px-3.5 py-3">
            <CardTitle className="text-sm font-semibold">
              Project settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 pb-2.5">
            <div className="space-y-2 lg:hidden">
              <label
                htmlFor="project-settings-section"
                className="text-sm font-medium"
              >
                Settings section
              </label>
              <Select
                value={activeSection.id}
                onValueChange={(value) =>
                  handleSectionChange(value as ProjectSettingsSectionId)
                }
              >
                <SelectTrigger
                  id="project-settings-section"
                  className="w-full"
                  aria-label="Settings section"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => {
                    const Icon = SECTION_ICONS[section.id];
                    return (
                      <SelectItem key={section.id} value={section.id}>
                        <Icon />
                        {section.label}
                        {section.locked && <Lock className="ml-auto" />}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <nav className="hidden space-y-1 lg:block">
              {sections.map((section) => {
                const Icon = SECTION_ICONS[section.id];
                const active = section.id === activeSection.id;
                return (
                  <Button
                    key={section.id}
                    asChild
                    variant={active ? 'secondary' : 'ghost'}
                    className="h-8 w-full justify-start px-2.5 text-xs"
                  >
                    <Link
                      to={sectionHref(section.id)}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {section.label}
                      </span>
                      {section.locked && (
                        <Lock className="text-muted-foreground" />
                      )}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      {activeSection.id === 'associations' ? (
        <section className="min-w-0" aria-label="Associations settings">
          {sectionBody}
        </section>
      ) : (
        <Card
          className="min-w-0 gap-0 py-0"
          aria-labelledby="project-settings-section-title"
        >
          <CardHeader className="gap-0 px-4 py-3">
            <h2
              id="project-settings-section-title"
              className="font-heading text-lg font-semibold tracking-tight"
            >
              {activeSection.label}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {activeSection.description}
            </p>
          </CardHeader>

          <CardContent className="px-3.5 pt-2.5 pb-3.5 sm:px-4 sm:pb-4">
            {sectionBody}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
