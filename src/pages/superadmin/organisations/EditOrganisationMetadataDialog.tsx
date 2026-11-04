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

// Allowlisted metadata edit dialog. Name and description are editable here.
// Lifecycle transitions, plan changes, payment holds have their own dedicated
// routes.

export interface EditOrganisationMetadataInitial {
  name: string;
  description: string | null;
  logoUrl?: string | null;
  defaultCurrency?: string | null;
}

interface EditOrganisationMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EditOrganisationMetadataInitial;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (dto: SuperAdminUpdateOrganisationDto) => void;
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
    },
  });

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      form.reset({
        name: initial.name,
        description: initial.description ?? '',
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
