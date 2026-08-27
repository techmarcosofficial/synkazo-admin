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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ExtJob } from '@/features/jobs/hooks';
import { showToast } from '@/lib/toast';

const jobGeneralSchema = z.object({
  name: z.string().trim().min(1, 'Job Name is required.'),
});

type JobGeneralValues = z.infer<typeof jobGeneralSchema>;

export default function JobGeneralCard({
  projectId,
  job,
  onUpdated,
}: {
  projectId: string;
  job: ExtJob;
  onUpdated: (patch: Partial<ExtJob>) => void;
}) {
  const form = useForm<JobGeneralValues>({
    resolver: zodResolver(jobGeneralSchema),
    mode: 'onChange',
    defaultValues: {
      name: job.name,
    },
  });

  useEffect(() => {
    if (form.formState.isDirty) return;
    form.reset({
      name: job.name,
    });
  }, [job.id, job.name, form]);

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
        <h3 className="mb-4 font-semibold">General</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="job-name" required>
              Job Name
            </FieldLabel>
            <FieldContent>
              <Input id="job-name" {...form.register('name')} />
            </FieldContent>
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>

          <FieldGroup className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                Source Object
              </p>
              <div className="bg-muted text-muted-foreground truncate rounded-3xl px-3 py-2">
                {job.sourceObject}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                Destination Object
              </p>
              <div className="bg-muted text-muted-foreground truncate rounded-3xl px-3 py-2">
                {job.destObject}
              </div>
            </div>
          </FieldGroup>

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
