import { ArrowRight, Clock, Lock } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import ActionTooltip from './ActionTooltip';
import { clearDraftSyncJob } from '../draftSyncJob';
import { resolveActiveDraft, type ActiveDraftResolution } from '../journeySelectors';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useProjectsQuery } from '@/queries/useProjects';

export interface DraftResumptionBannerProps {
  projectId?: string;
  onResume?: () => void;
  className?: string;
}

export default function DraftResumptionBanner({
  projectId,
  onResume,
  className,
}: DraftResumptionBannerProps) {
  const navigate = useNavigate();
  const { hasRole } = useSynkazoAuth();
  const projectsQuery = useProjectsQuery();
  const [dismissed, setDismissed] = useState(false);

  const userRole = hasRole('org_admin')
    ? 'org_admin'
    : hasRole('super_admin')
      ? 'super_admin'
      : 'editor';

  const draftResolution: ActiveDraftResolution | null = resolveActiveDraft(
    projectsQuery.data ?? [],
    projectId,
    userRole,
  );

  const handleDiscard = useCallback(() => {
    if (draftResolution?.projectId) {
      clearDraftSyncJob(draftResolution.projectId);
      setDismissed(true);
    }
  }, [draftResolution?.projectId]);

  const handleResume = useCallback(() => {
    if (onResume) {
      onResume();
    } else if (draftResolution?.returnUrl) {
      navigate(draftResolution.returnUrl);
    }
  }, [onResume, draftResolution?.returnUrl, navigate]);

  if (dismissed || !draftResolution) {
    return null;
  }

  const { draft, stepLabel, isBlocked, blockerReason, projectName } =
    draftResolution;

  const flowName =
    draft.config?.name ||
    (draft.config?.sourceObject && draft.config?.destObject
      ? `${draft.config.sourceObject} → ${draft.config.destObject}`
      : 'Sync Flow Draft');

  return (
    <Card
      className={`border-info/30 bg-info/5 rounded-3xl p-4 shadow-xs transition-all ${className ?? ''}`}
      data-testid="draft-resumption-banner"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-info/10 text-info flex size-9 shrink-0 items-center justify-center rounded-2xl">
            <Clock className="size-4" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-semibold">
              Unfinished sync setup in progress
            </h4>
            <p className="text-muted-foreground text-xs">
              {projectName ? `${projectName} · ` : ''}
              <span className="text-foreground font-medium">{flowName}</span> (
              {stepLabel}) — your configuration was safely preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDiscard}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Discard
          </Button>

          <ActionTooltip tooltip={blockerReason} disabled={isBlocked}>
            <Button
              size="sm"
              onClick={handleResume}
              disabled={isBlocked}
              className="gap-1.5 text-xs font-semibold"
            >
              {isBlocked ? <Lock className="size-3.5" /> : null}
              <span>Resume Setup</span>
              {!isBlocked && <ArrowRight className="size-3.5" />}
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </Card>
  );
}
