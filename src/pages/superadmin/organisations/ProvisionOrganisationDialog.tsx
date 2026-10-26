import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

export const provisionOrganisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organisation name is required')
    .max(255, 'Organisation name must not exceed 255 characters'),
  slug: z
    .string()
    .trim()
    .max(100)
    .refine((val) => !val || SLUG_PATTERN.test(val), {
      message:
        'Slug must contain only lowercase letters, digits, and single hyphens',
    })
    .optional(),
  description: z.string().trim().max(1000).optional(),
  ownerEmail: z
    .string()
    .trim()
    .min(1, 'Owner email is required')
    .email('Please enter a valid email address')
    .max(255),
  invitationMessage: z.string().trim().max(2000).optional(),
  reason: z
    .string()
    .trim()
    .min(10, 'Audit reason must be at least 10 characters'),
});

export type ProvisionOrganisationFormValues = z.infer<
  typeof provisionOrganisationSchema
>;

export interface ProvisionOrganisationValues {
  name: string;
  slug?: string;
  description?: string;
  ownerEmail: string;
  invitationMessage?: string;
  reason: string;
}

interface ProvisionOrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ProvisionOrganisationValues) => void;
}

export default function ProvisionOrganisationDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: ProvisionOrganisationDialogProps) {
  const [slugEdited, setSlugEdited] = useState(false);

  const form = useForm<ProvisionOrganisationFormValues>({
    resolver: zodResolver(provisionOrganisationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      ownerEmail: '',
      invitationMessage: '',
      reason: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSlugEdited(false);
    }
  }, [open, form]);

  // Auto-generate slug from name until the operator manually edits it
  const nameValue = form.watch('name');
  useEffect(() => {
    if (!slugEdited) {
      form.setValue('slug', slugify(nameValue ?? ''), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }, [nameValue, slugEdited, form]);

  // Bind server errors to the appropriate field or alert.
  // When an email conflict error arrives, setting it on 'ownerEmail' means that
  // as soon as the user modifies the input with mode: 'onChange', react-hook-form
  // automatically clears the error!
  useEffect(() => {
    if (errorMessage) {
      if (/assigned|owner email|email/i.test(errorMessage)) {
        form.setError('ownerEmail', {
          type: 'server',
          message: errorMessage,
        });
      }
    }
  }, [errorMessage, form]);

  const generalError =
    errorMessage && !/assigned|owner email|email/i.test(errorMessage)
      ? errorMessage
      : null;

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      description: values.description?.trim() || undefined,
      ownerEmail: values.ownerEmail.trim().toLowerCase(),
      invitationMessage: values.invitationMessage?.trim() || undefined,
      reason: values.reason.trim(),
    });
  });

  const reasonValue = form.watch('reason') ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Provision a new organisation</DialogTitle>
            <DialogDescription>
              Create a new customer organisation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="provision-name">
                Organisation name <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="provision-name"
                  placeholder="Acme Corp"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register('name')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="provision-slug">
                Slug
                <span className="text-muted-foreground ml-1 text-xs">
                  (auto-generated)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="provision-slug"
                  placeholder="acme-corp"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.slug}
                  {...form.register('slug', {
                    onChange: () => setSlugEdited(true),
                  })}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.slug?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="provision-description">
                Description
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="provision-description"
                  rows={2}
                  placeholder="Organisation description"
                  disabled={isSubmitting}
                  {...form.register('description')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="provision-owner-email">
                Owner email <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="provision-owner-email"
                  type="email"
                  placeholder="owner@acme.example"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.ownerEmail}
                  {...form.register('ownerEmail')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.ownerEmail?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="provision-invitation-message">
                Invitation message
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="provision-invitation-message"
                  rows={2}
                  placeholder="Note attached to the invite email"
                  disabled={isSubmitting}
                  {...form.register('invitationMessage')}
                />
              </FieldContent>
              <FieldError>
                {form.formState.errors.invitationMessage?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="provision-reason">
                Reason <span className="text-destructive ml-0.5">*</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  (audit — min 10 characters)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="provision-reason"
                  rows={2}
                  placeholder="Why is this organisation being provisioned?"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.reason}
                  {...form.register('reason')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                {reasonValue.trim().length}/10 characters
              </div>
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>

            {generalError ? (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning…' : 'Provision'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
