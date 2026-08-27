import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { projectsApi } from '@/api/projects';
import { PlatformIcon } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePlatforms } from '@/features/projects/hooks';
import type { ProjectExt } from '@/features/projects/hooks';
import { showToast } from '@/lib/toast';

// Only the name/description are editable here. Source and destination platforms
// are a one-time choice made at project creation (or, for HubSpot Marketplace
// installs, via the post-install source-setup popup) and can never be changed —
// they're shown read-only below.
const generalSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters.')
    .max(100, 'Project name cannot exceed 100 characters.'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters.')
    .optional()
    .or(z.literal('')),
});

type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettingsCard({
  project,
  onUpdated,
}: {
  project: ProjectExt;
  onUpdated: (updated: ProjectExt) => void;
}) {
  const { data: platforms = [] } = usePlatforms();

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      name: project.name,
      description: project.description || '',
    },
  });

  // Keep the form in sync if the underlying project changes out from under us
  // (e.g. refetch after another tab's mutation) while the user hasn't touched it yet.
  useEffect(() => {
    if (form.formState.isDirty) return;
    form.reset({
      name: project.name,
      description: project.description || '',
    });
  }, [project.id, project.name, project.description, form]);

  const labelFor = useMemo(
    () => (platformId: string | null) =>
      platformId
        ? (platforms.find((p) => p.platformId === platformId)?.label ??
          platformId)
        : null,
    [platforms],
  );
  const sourcePlatformLabel = labelFor(project.sourcePlatformId);
  const destPlatformLabel = labelFor(project.destPlatformId);

  const saving = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await projectsApi.updateProject(
        project.id,
        values as Partial<ProjectExt>,
      );
      showToast.success('Project updated.');
      onUpdated(updated as ProjectExt);
      form.reset(values);
    } catch {
      showToast.error('Something went wrong. Please try again.');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="proj-name" required>
                Project Name
              </FieldLabel>
              <FieldContent>
                <Input id="proj-name" {...form.register('name')} />
              </FieldContent>
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="proj-desc">Description</FieldLabel>
              <FieldContent>
                <Textarea
                  id="proj-desc"
                  rows={3}
                  {...form.register('description')}
                />
              </FieldContent>
              <FieldDescription>
                Optional notes about this integration.
              </FieldDescription>
              <FieldError>
                {form.formState.errors.description?.message}
              </FieldError>
            </Field>
          </FieldGroup>

          <div className="space-y-3">
            <div>
              <CardTitle>Platforms</CardTitle>
              <p className="text-muted-foreground text-xs">
                Source and destination are fixed for the life of the project and
                can't be changed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <PlatformIcon
                  platformId={project.sourcePlatformId ?? ''}
                  size={32}
                />
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="font-medium">
                    {sourcePlatformLabel ?? 'Not selected yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border p-4">
                <PlatformIcon platformId={project.destPlatformId} size={32} />
                <div>
                  <p className="text-muted-foreground text-xs">Destination</p>
                  <p className="font-medium">
                    {destPlatformLabel ?? project.destPlatformId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving || !form.formState.isDirty}>
            {saving ? (
              'Saving…'
            ) : form.formState.isSubmitSuccessful && !form.formState.isDirty ? (
              <>
                <Check /> Saved
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
