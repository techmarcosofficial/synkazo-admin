import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useProjectGeneralSettings,
  type ProjectExt,
} from '@/features/projects/hooks';
import { cn } from '@/lib/utils';
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
  className,
}: {
  project: ProjectExt;
  onUpdated: (updated: ProjectExt) => void;
  className?: string;
}) {
  const { updateProjectInfo } = useProjectGeneralSettings();
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

  const saving = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      const updated = await updateProjectInfo(project.id, values);
      showToast.success('Project updated.');
      onUpdated(updated);
      form.reset(values);
    } catch {
      form.setError('root', {
        message: 'Your changes could not be saved. Please try again.',
      });
      showToast.error('Something went wrong. Please try again.');
    }
  });

  return (
    <Card className={cn('gap-0 border py-0', className)}>
      <CardHeader className="gap-0 px-4 py-3">
        <CardTitle className="text-sm font-semibold">
          Project information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup className="gap-4">
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
                  rows={2}
                  placeholder="Optional notes about this integration."
                  {...form.register('description')}
                />
              </FieldContent>
              <FieldError>
                {form.formState.errors.description?.message}
              </FieldError>
            </Field>
          </FieldGroup>

          {form.formState.errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !form.formState.isDirty}>
              {saving ? (
                'Saving…'
              ) : form.formState.isSubmitSuccessful &&
                !form.formState.isDirty ? (
                <>
                  <Check /> Saved
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
