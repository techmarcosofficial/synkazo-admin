import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { PlatformPair } from '@/components/platform';
import ErrorState from '@/components/shared/ErrorState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import PlatformPairField from '@/features/projects/components/create/PlatformPairField';
import { usePlatforms } from '@/features/projects/hooks/usePlatforms';
import type { CreateProjectFormValues } from '@/features/projects/types';
import { createProjectSchema } from '@/features/projects/utils';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import { useCreateSuperAdminProjectMutation } from '@/queries/useSuperAdmin';
import type { PlatformId } from '@/types/connection';

/** Mounted only while open; all project writes use the selected-org API. */
export default function CreateOrganisationProjectDialog({
  organisationId,
  organisationName,
  onClose,
}: {
  organisationId: string;
  organisationName: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const platforms = usePlatforms();
  const create = useCreateSuperAdminProjectMutation(organisationId);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      sourcePlatformId: '',
      destPlatformId: 'hubspot',
    },
  });
  const source = form.watch('sourcePlatformId') as PlatformId | '';
  const mode = form.watch('syncMode');
  const options = platforms.data ?? [];
  const sources = options.filter(
    (platform) => platform.platformId !== 'hubspot',
  );
  const destinations = options.filter(
    (platform) => platform.platformId === 'hubspot',
  );
  const unavailable =
    platforms.isLoading ||
    platforms.isError ||
    !sources.length ||
    !destinations.length;
  const busy = create.isPending || form.formState.isSubmitting;
  const close = () => {
    if (!busy) onClose();
  };
  const submit = form.handleSubmit(async (values) => {
    if (busy || unavailable) return;
    setError(null);
    try {
      const project = await create.mutateAsync(values);
      showToast.success('Project created');
      onClose();
      navigate(
        `/super-admin/organisations/${organisationId}/projects/${project.id}`,
      );
    } catch (err) {
      setError(
        isAxiosError<{ message?: string; code?: string }>(err) ||
          err instanceof Error
          ? getUserFriendlyError(err)
          : 'Could not create this project. Try again.',
      );
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        padding="none"
        showCloseButton={!busy}
        className="flex max-h-[85dvh] w-full flex-col gap-0 sm:max-w-4xl"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-4 pr-14">
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a synchronization project for {organisationName}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <form
            id="create-organisation-project"
            onSubmit={submit}
            className="space-y-6"
          >
            <fieldset disabled={busy} className="min-w-0 space-y-6">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sa-project-name" required>
                    Project Name
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="sa-project-name"
                      placeholder="This name is shown throughout Synkazo."
                      {...form.register('name')}
                      aria-invalid={!!form.formState.errors.name}
                    />
                  </FieldContent>
                  <FieldError>{form.formState.errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sa-project-description">
                    Optional Note
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="sa-project-description"
                      placeholder="Optional notes about this integration."
                      {...form.register('description')}
                      aria-invalid={!!form.formState.errors.description}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.description?.message}
                  </FieldError>
                </Field>
              </FieldGroup>

              {platforms.isError || (!platforms.isLoading && unavailable) ? (
                <ErrorState
                  title="Could not load project platforms"
                  description="The available source and destination platforms are required to create a project."
                  onRetry={() => platforms.refetch()}
                />
              ) : (
                <PlatformPairField
                  compact
                  stackOnMobile
                  sourceValue={source}
                  destValue="hubspot"
                  platforms={options}
                  sourcePlatforms={sources}
                  destPlatforms={destinations}
                  disabled={busy || unavailable}
                  onSourceChange={(value) =>
                    form.setValue('sourcePlatformId', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onDestChange={(value) =>
                    form.setValue('destPlatformId', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  sourceError={form.formState.errors.sourcePlatformId?.message}
                  destError={form.formState.errors.destPlatformId?.message}
                />
              )}
              <Field>
                <FieldLabel required>Sync Direction</FieldLabel>
                <FieldContent>
                  <RadioGroup
                    value={mode ?? ''}
                    onValueChange={(value) => {
                      if (value === 'one_way' || value === 'two_way')
                        form.setValue('syncMode', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                    }}
                    disabled={busy}
                    className="grid gap-3 sm:grid-cols-2"
                    aria-label="Sync direction"
                  >
                    <ChoiceCardItem
                      id="sa-project-one-way"
                      value="one_way"
                      title="One Way"
                      description="Source → HubSpot"
                    />
                    <ChoiceCardItem
                      id="sa-project-two-way"
                      value="two_way"
                      title="Two Way"
                      description="Source ↔ HubSpot"
                    />
                  </RadioGroup>
                </FieldContent>
                <FieldDescription>
                  {mode === 'two_way'
                    ? 'Changes can sync in both directions. HubSpot must use OAuth for real-time updates.'
                    : 'Records flow from the source platform into HubSpot.'}{' '}
                  Sync direction cannot be changed after creation.
                </FieldDescription>
                <FieldError>
                  {form.formState.errors.syncMode?.message}
                </FieldError>
              </Field>
            </fieldset>
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </div>

        <DialogFooter className="bg-muted/40 shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t p-4">
          {source && mode ? (
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <PlatformPair
                sourcePlatformId={source}
                destPlatformId="hubspot"
                variant="icon-text"
                size="sm"
                direction={mode}
              />
              <span className="text-muted-foreground">
                {mode === 'two_way' ? 'Two Way' : 'One Way'}
              </span>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-organisation-project"
              disabled={unavailable}
              loading={busy}
            >
              {busy ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
