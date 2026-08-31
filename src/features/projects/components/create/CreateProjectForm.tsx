import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject, usePlatforms } from '@/features/projects/hooks';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import { PlatformId } from '@/types/connection';

const CreateProjectForm = forwardRef<
  CreateProjectFormRef,
  CreateProjectFormProps
>(({ onSuccess }, ref) => {
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

  const submit = form.handleSubmit(async (values) => {
    try {
      const project = await createProject.mutateAsync({
        ...values,
        sourcePlatformId: values.sourcePlatformId as any,
        destPlatformId: values.destPlatformId as any,
      });

      form.reset();

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
    <form onSubmit={submit} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name" required>
            Project Name
          </FieldLabel>

          <FieldContent>
            <Input
              id="name"
              placeholder="My Sync Project"
              {...form.register('name')}
            />
          </FieldContent>

          <FieldDescription>
            This name is shown throughout synkazo.
          </FieldDescription>

          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>

          <FieldContent>
            <Textarea
              id="description"
              rows={4}
              placeholder="Optional description..."
              {...form.register('description')}
            />
          </FieldContent>

          <FieldDescription>
            Optional notes about this integration.
          </FieldDescription>

          <FieldError>{form.formState.errors.description?.message}</FieldError>
        </Field>
      </FieldGroup>

      <PlatformPairField
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
    </form>
  );
});
CreateProjectForm.displayName = 'CreateProjectForm';
export default CreateProjectForm;
