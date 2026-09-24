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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

export interface ProvisionOrganisationValues {
  name: string;
  slug?: string;
  description?: string;
  ownerEmail?: string;
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

// SA-401..404 — provisioning form. Fields mirror the backend
// ProvisionOrganisationDto exactly so validation is easy to reason
// about; the server re-validates every field so the client just
// guards the submit button.
export default function ProvisionOrganisationDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: ProvisionOrganisationDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setSlugEdited(false);
      setDescription('');
      setOwnerEmail('');
      setInvitationMessage('');
      setReason('');
    }
  }, [open]);

  // Auto-generate slug from name until the operator edits it directly.
  // Once they touch it, we stop overwriting — respects their choice.
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const nameValid = name.trim().length > 0 && name.trim().length <= 255;
  const slugValid = !slug || SLUG_PATTERN.test(slug);
  const emailValid = !ownerEmail || EMAIL_PATTERN.test(ownerEmail.trim());
  const reasonValid = reason.trim().length >= 10;
  const canSubmit =
    nameValid && slugValid && emailValid && reasonValid && !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      slug: slug || undefined,
      description: description.trim() || undefined,
      ownerEmail: ownerEmail.trim().toLowerCase() || undefined,
      invitationMessage: invitationMessage.trim() || undefined,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Provision a new organisation</DialogTitle>
          <DialogDescription>
            Creates a fresh customer organisation on the platform. If you
            supply an owner email, an org-admin invitation is sent —
            otherwise the org starts ownerless and stays that way until
            you invite a member from its Members page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provision-name">Organisation name</Label>
            <Input
              id="provision-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provision-slug">
              Slug
              <span className="text-muted-foreground ml-1 text-xs">
                (auto-generated — edit if needed)
              </span>
            </Label>
            <Input
              id="provision-slug"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="acme-corp"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={slug.length > 0 && !slugValid}
            />
            <span className="text-muted-foreground text-xs">
              Lowercase letters, digits, single hyphens. Idempotency key —
              a repeat submission with the same slug returns the existing
              org.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provision-description">
              Description
              <span className="text-muted-foreground ml-1 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="provision-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short label so operators can distinguish this org later"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provision-owner-email">
              Owner email
              <span className="text-muted-foreground ml-1 text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="provision-owner-email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@acme.example"
              autoComplete="off"
              aria-invalid={ownerEmail.length > 0 && !emailValid}
            />
            <span className="text-muted-foreground text-xs">
              Leave blank to create an ownerless org — you can invite the
              owner from the Members page later.
            </span>
          </div>

          {ownerEmail ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provision-invitation-message">
                Invitation message
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="provision-invitation-message"
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                rows={2}
                placeholder="Note attached to the invite email"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provision-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (audit — min 10 characters)
              </span>
            </Label>
            <Textarea
              id="provision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this organisation being provisioned?"
              aria-invalid={reason.length > 0 && !reasonValid}
            />
            <div className="text-muted-foreground text-xs">
              {reason.trim().length}/10 characters
            </div>
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
            {isSubmitting ? 'Provisioning…' : 'Provision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
