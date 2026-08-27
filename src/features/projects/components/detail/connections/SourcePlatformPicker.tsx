import { useMemo, useState } from 'react';

import { PlatformIcon } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SyncModeField } from '@/features/projects/components/create';
import { usePlatforms } from '@/features/projects/hooks';
import { showToast } from '@/lib/toast';
import { useUpdateProjectMutation } from '@/queries/useProjects';
import type { PlatformId } from '@/types/connection';
import type { ProjectSyncMode } from '@/types/project';

interface SourcePlatformPickerProps {
  projectId: string;
}

/**
 * One-time source-platform selection, rendered by ConnectionBoard in place of the
 * source card while a project has no source platform yet (a fresh HubSpot
 * Marketplace install). Once a source is chosen it is persisted and immutable —
 * this control never renders again for that project, and the source card takes
 * its place. Mirrors the forced SourceSetupDialog, for users who navigate
 * straight to Connections.
 */
export default function SourcePlatformPicker({
  projectId,
}: SourcePlatformPickerProps) {
  const { data: platforms = [], isLoading } = usePlatforms();
  const updateProject = useUpdateProjectMutation();
  const [selected, setSelected] = useState<PlatformId | ''>('');
  const [syncMode, setSyncMode] = useState<ProjectSyncMode | ''>('');

  const sourcePlatforms = useMemo(
    () => platforms.filter((p) => p.platformId !== 'hubspot'),
    [platforms],
  );

  const handleSave = () => {
    if (!selected || !syncMode) return;
    updateProject.mutate(
      { id: projectId, data: { sourcePlatformId: selected, syncMode } },
      {
        onSuccess: () => showToast.success('Source platform set.'),
        onError: () => showToast.error('Failed to set source platform.'),
      },
    );
  };

  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <PlatformIcon
            platformId={selected || 'hubspot'}
            size={40}
            className={selected ? '' : 'opacity-40'}
          />
          <div>
            <div className="text-sm font-semibold">
              Choose a source platform
            </div>
            <div className="text-muted-foreground text-xs">
              Pick which platform feeds this project. This is a one-time choice.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source-platform" required>
            Source platform
          </Label>
          <Select
            value={selected}
            onValueChange={(v) => setSelected(v as PlatformId)}
            disabled={isLoading || updateProject.isPending}
          >
            <SelectTrigger id="source-platform" className="w-full">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {sourcePlatforms.map((p) => (
                <SelectItem key={p.platformId} value={p.platformId}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SyncModeField
          value={syncMode}
          onChange={setSyncMode}
          disabled={isLoading || updateProject.isPending}
        />

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!selected || !syncMode || updateProject.isPending}
        >
          {updateProject.isPending ? 'Saving…' : 'Set source'}
        </Button>
      </CardContent>
    </Card>
  );
}
