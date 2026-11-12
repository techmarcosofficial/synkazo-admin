import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import type {
  CreateProjectFormProps,
  CreateProjectFormRef,
  CreateProjectFormValues,
} from '../../types';
import { createProjectSchema } from '../../utils';

import PlatformPairField from './PlatformPairField';
import SyncModeField from './SyncModeField';

import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useGuideSpot, useGuideStore, type GuideSpot } from '@/features/guide';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCreateProject, usePlatforms } from '@/features/projects/hooks';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import { PlatformId } from '@/types/connection';

const CreateProjectForm = forwardRef<
  CreateProjectFormRef,
  CreateProjectFormProps
>(({ onSuccess, onSelectionChange }, ref) => {
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      sourcePlatformId: '',
      // Sync is many-sources -> one-destination: HubSpot is the only
      // destination, so it's pre-selected and never changes.
      destPlatformId: 'hubspot',
    },
  });

  const createProject = useCreateProject();
  const { data: platforms = [], isLoading } = usePlatforms();
  const sourcePlatformId = form.watch('sourcePlatformId') as '' | PlatformId;
  const destPlatformId = form.watch('destPlatformId') as '' | PlatformId;
  const syncMode = form.watch('syncMode') as
    '' | 'one_way' | 'two_way' | undefined;

  // First-run guide: the ring walks the form in order as each part is filled.
  // The name waits for a typing pause so the ring doesn't jump mid-word.
  const guiding = useGuideStore((s) => s.status === 'active' && !s.projectId);
  const settledName = useDebouncedValue(form.watch('name') ?? '', 700);
  let guideSpot: GuideSpot | null = null;
  if (guiding) {
    if (!settledName.trim()) {
      guideSpot = {
        id: 'project-name',
        target: '[data-guide="project-name"]',
        title: 'Name your project',
        body: 'Pick something your team will recognise, like the two systems it connects.',
      };
    } else if (!sourcePlatformId) {
      guideSpot = {
        id: 'project-source',
        target: '[data-guide="project-source"]',
        title: 'Choose where records come from',
        body: 'Select your source platform. HubSpot is already set as the destination.',
      };
    } else if (!syncMode) {
      guideSpot = {
        id: 'project-sync-mode',
        target: '[data-guide="project-sync-mode"]',
        title: 'Choose the sync direction',
        body: 'One way sends source records into HubSpot. Two way also writes HubSpot changes back.',
      };
    } else {
      guideSpot = {
        id: 'project-submit',
        target: '[data-guide="project-submit"]',
        title: 'Create the project',
        body: "That's everything. Next, you'll connect both platforms.",
      };
    }
  }
  useGuideSpot(
    guideSpot && { ...guideSpot, step: 'project', placement: 'top' },
  );

  useEffect(() => {
    onSelectionChange?.({
      sourcePlatformId,
      syncMode: syncMode ?? '',
    });
  }, [onSelectionChange, sourcePlatformId, syncMode]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const project = await createProject.mutateAsync({
        ...values,
        sourcePlatformId: values.sourcePlatformId as any,
        destPlatformId: values.destPlatformId as any,
      });

      form.reset();
      showToast.success('Project created');
      onSuccess?.(project);
    } catch (err) {
      // Surface API failures (e.g. PLAN_LIMIT_PROJECTS) instead of failing silently.
      showToast.error(getUserFriendlyError(err as never));
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      submit,

      reset() {
        form.reset();
      },
    }),
    [submit],
  );
  const platformOptions = useMemo(
    () =>
      platforms.map((platform) => ({
        platformId: platform.platformId,
        label: platform.label,
      })),
    [platforms],
  );

  // Destination is fixed to HubSpot (many sources -> one destination), so
  // source options exclude it and destination options are just the single
  // HubSpot entry — falling back to a static label if it isn't in the
  // fetched platform list yet.
  const sourcePlatformOptions = useMemo(
    () => platformOptions.filter((p) => p.platformId !== 'hubspot'),
    [platformOptions],
  );

  const destPlatformOptions = useMemo(() => {
    const hubspot = platformOptions.find((p) => p.platformId === 'hubspot');
    return [hubspot ?? { platformId: 'hubspot' as const, label: 'HubSpot' }];
  }, [platformOptions]);

  return (
    <form onSubmit={submit} className="space-y-6">
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field data-guide="project-name">
          <FieldLabel htmlFor="name" required>
            Project Name
          </FieldLabel>

          <FieldContent>
            <Input
              id="name"
              placeholder="This name is shown throughout synkazo."
              {...form.register('name')}
            />
          </FieldContent>

          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Optional Note</FieldLabel>

          <FieldContent>
            <Input
              id="description"
              placeholder="Optional notes about this integration."
              {...form.register('description')}
            />
          </FieldContent>

          <FieldError>{form.formState.errors.description?.message}</FieldError>
        </Field>
      </FieldGroup>

      <div data-guide="project-source">
      <PlatformPairField
        compact
        sourceValue={sourcePlatformId}
        destValue={destPlatformId}
        platforms={platformOptions}
        sourcePlatforms={sourcePlatformOptions}
        destPlatforms={destPlatformOptions}
        disabled={isLoading}
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
      </div>

      <div data-guide="project-sync-mode">
      <SyncModeField
        value={syncMode ?? ''}
        onChange={(value) =>
          form.setValue('syncMode', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        disabled={isLoading}
        error={form.formState.errors.syncMode?.message}
      />
      </div>
    </form>
  );
});
CreateProjectForm.displayName = 'CreateProjectForm';
export default CreateProjectForm;
