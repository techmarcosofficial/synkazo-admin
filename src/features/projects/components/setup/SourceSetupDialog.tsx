import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PlatformIcon } from '@/components/platform';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PlatformPairField,
  SyncModeField,
} from '@/features/projects/components/create';
import { usePlatforms } from '@/features/projects/hooks';
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { showToast } from '@/lib/toast';
import {
  useProjectsQuery,
  useUpdateProjectMutation,
} from '@/queries/useProjects';
import type { PlatformId } from '@/types/connection';
import type { ProjectSyncMode } from '@/types/project';

/**
 * Non-closable, one-time source-platform picker. Shown to an org admin as soon as
 * they land anywhere in the app with a project that has a HubSpot destination but
 * no source platform yet — i.e. a fresh HubSpot Marketplace install, after pricing
 * / checkout / login. The user MUST pick a source before doing anything else; on
 * Finish the choice is persisted (source is immutable thereafter) and they're
 * dropped onto that project's Connections tab to enter the source credentials.
 *
 * Mounted once in AppLayout, alongside SetupWizardDialog.
 */
export default function SourceSetupDialog() {
  const { hasRole } = useSBAuth();
  const navigate = useNavigate();
  const canManage = hasRole('org_admin');

  const { data: projects = [] } = useProjectsQuery({ enabled: canManage });
  const { data: platforms = [], isLoading: platformsLoading } = usePlatforms();
  const updateProject = useUpdateProjectMutation();

  const [source, setSource] = useState<PlatformId | ''>('');
  const [syncMode, setSyncMode] = useState<ProjectSyncMode | ''>('');

  // The first project still awaiting a source. Destination is always HubSpot, so
  // a missing source is the only thing that can be unset at this stage.
  const pendingProject = useMemo(
    () => projects.find((p) => !p.sourcePlatformId),
    [projects],
  );

  const platformOptions = useMemo(
    () => platforms.map((p) => ({ platformId: p.platformId, label: p.label })),
    [platforms],
  );
  // Many sources -> one HubSpot destination: source options exclude HubSpot,
  // destination is the single fixed HubSpot entry (already connected by install).
  const sourcePlatformOptions = useMemo(
    () => platformOptions.filter((p) => p.platformId !== 'hubspot'),
    [platformOptions],
  );
  const destPlatformOptions = useMemo(() => {
    const hubspot = platformOptions.find((p) => p.platformId === 'hubspot');
    return [hubspot ?? { platformId: 'hubspot' as const, label: 'HubSpot' }];
  }, [platformOptions]);

  if (!canManage || !pendingProject) return null;

  const handleFinish = () => {
    if (!source || !syncMode) return;
    updateProject.mutate(
      { id: pendingProject.id, data: { sourcePlatformId: source, syncMode } },
      {
        onSuccess: () => {
          showToast.success('Source platform set.');
          navigate(`/projects/${pendingProject.id}/connections`);
        },
        onError: () =>
          showToast.error(
            "Couldn't set the source platform. Please try again.",
          ),
      },
    );
  };

  return (
    <Dialog open>
      <DialogContent
        size="xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Choose your source platform</DialogTitle>
          <DialogDescription>
            HubSpot is connected as your destination. Pick the platform Synkazo
            should read records from to finish setting up{' '}
            <span className="text-foreground font-medium">
              {pendingProject.name}
            </span>
            . This choice is permanent.
          </DialogDescription>
        </DialogHeader>

        <PlatformPairField
          sourceValue={source}
          destValue="hubspot"
          platforms={platformOptions}
          sourcePlatforms={sourcePlatformOptions}
          destPlatforms={destPlatformOptions}
          disabled={platformsLoading}
          destDisabled
          onSourceChange={(value) => setSource(value)}
          onDestChange={() => {}}
        />

        <SyncModeField
          value={syncMode}
          onChange={setSyncMode}
          disabled={platformsLoading || updateProject.isPending}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <PlatformIcon platformId="hubspot" size={16} />
            <CheckCircle2 className="text-success size-3.5" /> HubSpot already
            connected
          </p>
          <Button
            onClick={handleFinish}
            disabled={!source || !syncMode || updateProject.isPending}
          >
            {updateProject.isPending ? 'Saving…' : 'Finish'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
