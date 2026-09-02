import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import type { ExtJob } from '@/features/jobs/hooks';
import { showToast } from '@/lib/toast';

const jobSkipUpdateSchema = z.object({
  skipUpdateOnMatch: z.boolean(),
});

type JobSkipUpdateValues = z.infer<typeof jobSkipUpdateSchema>;

export default function JobSkipUpdateCard({
  projectId,
  job,
  onUpdated,
}: {
  projectId: string;
  job: ExtJob;
  onUpdated: (patch: Partial<ExtJob>) => void;
}) {
  const form = useForm<JobSkipUpdateValues>({
    resolver: zodResolver(jobSkipUpdateSchema),
    mode: 'onChange',
    defaultValues: {
      skipUpdateOnMatch: job.skipUpdateOnMatch ?? false,
    },
  });

  useEffect(() => {
    if (form.formState.isDirty) return;
    form.reset({
      skipUpdateOnMatch: job.skipUpdateOnMatch ?? false,
    });
  }, [job.id, job.skipUpdateOnMatch, form]);

  const saving = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await jobsApi.updateJob(projectId, job.id, values);
      showToast.success('Job updated.');
      onUpdated(values);
      form.reset(values);
    } catch {
      showToast.error('Something went wrong. Please try again.');
    }
  });

  return (
    <Card>
      <CardContent>
        <h3 className="mb-4 font-semibold">Matched Records</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="skip-update-on-match">
                Never update matched records
              </FieldLabel>
              <FieldDescription>
                When a record already exists in the destination, leave it
                completely untouched instead of updating it — only brand-new
                records get written.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="skip-update-on-match"
              checked={form.watch('skipUpdateOnMatch')}
              onCheckedChange={(checked) =>
                form.setValue('skipUpdateOnMatch', checked, {
                  shouldDirty: true,
                })
              }
            />
          </Field>

          <Button type="submit" disabled={saving || !form.formState.isDirty}>
            {saving
              ? 'Saving…'
              : form.formState.isSubmitSuccessful && !form.formState.isDirty
                ? 'Saved'
                : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
