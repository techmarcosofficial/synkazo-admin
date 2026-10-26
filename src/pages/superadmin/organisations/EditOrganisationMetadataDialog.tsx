import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
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

import type { SuperAdminUpdateOrganisationDto } from '@/types';

// GAP-001 / SA-407 — allowlisted metadata edit dialog. Mirrors the API
// DTO exactly: name / description / logoUrl / settings.defaultCurrency.
// Every other field on the organisation entity has its own dedicated
// route (lifecycle transitions, plan changes, payment holds), so those
// are deliberately absent here.

export interface EditOrganisationMetadataInitial {
  name: string;
  description: string | null;
  logoUrl: string | null;
  defaultCurrency: string | null;
}

interface EditOrganisationMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EditOrganisationMetadataInitial;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (dto: SuperAdminUpdateOrganisationDto) => void;
}

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function normaliseCurrency(value: string): string {
  return value.trim().toUpperCase();
}

export const editOrganisationMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organisation name is required')
    .max(255, 'Organisation name must not exceed 255 characters'),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  logoUrl: z
    .string()
    .trim()
    .refine((val) => !val || URL_PATTERN.test(val), {
      message: 'Must start with https:// (or http:// for local testing)',
    })
    .optional(),
  defaultCurrency: z
    .string()
    .trim()
    .refine((val) => !val || /^[A-Za-z]{3}$/.test(val), {
      message: 'Must be a 3-letter currency code (e.g. USD, EUR)',
    })
    .optional(),
});

export type EditOrganisationMetadataFormValues = z.infer<
  typeof editOrganisationMetadataSchema
>;

export default function EditOrganisationMetadataDialog({
  open,
  onOpenChange,
  initial,
  isSubmitting,
  errorMessage,
  onSubmit,
}: EditOrganisationMetadataDialogProps) {
  const form = useForm<EditOrganisationMetadataFormValues>({
    resolver: zodResolver(editOrganisationMetadataSchema),
    mode: 'onChange',
    defaultValues: {
      name: initial.name,
      description: initial.description ?? '',
      logoUrl: initial.logoUrl ?? '',
      defaultCurrency: initial.defaultCurrency ?? '',
    },
  });

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      form.reset({
        name: initial.name,
        description: initial.description ?? '',
        logoUrl: initial.logoUrl ?? '',
        defaultCurrency: initial.defaultCurrency ?? '',
      });
    }
    prevOpenRef.current = open;
  }, [open, initial, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    // Build a delta DTO — only the fields that changed. Sending
    // `undefined` keeps the server side no-op-safe (its updateMetadata
    // ignores absent fields).
    const dto: SuperAdminUpdateOrganisationDto = {};
    if (values.name.trim() !== initial.name) dto.name = values.name.trim();
    if ((values.description ?? '') !== (initial.description ?? '')) {
      dto.description = values.description ?? '';
    }
    if ((values.logoUrl?.trim() ?? '') !== (initial.logoUrl ?? '')) {
      dto.logoUrl = values.logoUrl?.trim() ?? '';
    }
    const normalisedCurrency = normaliseCurrency(values.defaultCurrency ?? '');
    if (normalisedCurrency !== (initial.defaultCurrency ?? '')) {
      // Merge into settings so we never clobber other keys.
      dto.settings = { defaultCurrency: normalisedCurrency || null };
    }
    onSubmit(dto);
  });

  const descriptionValue = form.watch('description') ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit organisation</DialogTitle>
            <DialogDescription>
              Update organisation metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="edit-org-name">
                Name <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-org-name"
                  maxLength={255}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register('name')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-org-description">
                Description
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="edit-org-description"
                  rows={3}
                  maxLength={2000}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.description}
                  {...form.register('description')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                {descriptionValue.length}/2000
              </div>
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-org-logo">
                Logo URL
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-org-logo"
                  placeholder="https://cdn.example.com/logo.png"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.logoUrl}
                  {...form.register('logoUrl')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.logoUrl?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-org-currency">
                Default currency
                <span className="text-muted-foreground ml-1 text-xs">
                  (ISO 4217, e.g. USD, GBP)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-org-currency"
                  maxLength={3}
                  placeholder="USD"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.defaultCurrency}
                  {...form.register('defaultCurrency')}
                />
              </FieldContent>
              <FieldError>
                {form.formState.errors.defaultCurrency?.message}
              </FieldError>
            </Field>

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
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
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
