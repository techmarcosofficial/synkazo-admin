import { useEffect, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const URL_PATTERN =
  /^https?:\/\/[^\s]+$/i;

function normaliseCurrency(value: string): string {
  return value.trim().toUpperCase();
}

export default function EditOrganisationMetadataDialog({
  open,
  onOpenChange,
  initial,
  isSubmitting,
  errorMessage,
  onSubmit,
}: EditOrganisationMetadataDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setLogoUrl(initial.logoUrl ?? '');
      setDefaultCurrency(initial.defaultCurrency ?? '');
    }
  }, [open, initial]);

  const nameValid = name.trim().length > 0 && name.trim().length <= 255;
  const descriptionValid = description.length <= 2000;
  const logoUrlValid =
    logoUrl.trim().length === 0 || URL_PATTERN.test(logoUrl.trim());
  const currencyValid =
    defaultCurrency.trim().length === 0 ||
    /^[A-Za-z]{3}$/.test(defaultCurrency.trim());
  const canSubmit =
    nameValid &&
    descriptionValid &&
    logoUrlValid &&
    currencyValid &&
    !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    // Build a delta DTO — only the fields that changed. Sending
    // `undefined` keeps the server side no-op-safe (its updateMetadata
    // ignores absent fields).
    const dto: SuperAdminUpdateOrganisationDto = {};
    if (name.trim() !== initial.name) dto.name = name.trim();
    if (description !== (initial.description ?? '')) {
      dto.description = description;
    }
    if (logoUrl.trim() !== (initial.logoUrl ?? '')) {
      dto.logoUrl = logoUrl.trim();
    }
    const normalisedCurrency = normaliseCurrency(defaultCurrency);
    if (normalisedCurrency !== (initial.defaultCurrency ?? '')) {
      // Merge into settings so we never clobber other keys.
      dto.settings = { defaultCurrency: normalisedCurrency || null };
    }
    onSubmit(dto);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit organisation</DialogTitle>
          <DialogDescription>
            Update safe organisation metadata. Status changes, plan
            assignment, and payment holds live under separate actions on
            this page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-org-name">Name</Label>
            <Input
              id="edit-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              aria-invalid={name.length > 0 && !nameValid}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-org-description">
              Description
              <span className="text-muted-foreground ml-1 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="edit-org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              aria-invalid={description.length > 0 && !descriptionValid}
            />
            <div className="text-muted-foreground text-xs">
              {description.length}/2000
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-org-logo">
              Logo URL
              <span className="text-muted-foreground ml-1 text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-org-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              aria-invalid={logoUrl.length > 0 && !logoUrlValid}
            />
            <span className="text-muted-foreground text-xs">
              Must start with https:// (or http:// for local testing).
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-org-currency">
              Default currency
              <span className="text-muted-foreground ml-1 text-xs">
                (ISO 4217, e.g. USD, GBP)
              </span>
            </Label>
            <Input
              id="edit-org-currency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              maxLength={3}
              placeholder="USD"
              aria-invalid={defaultCurrency.length > 0 && !currencyValid}
            />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
