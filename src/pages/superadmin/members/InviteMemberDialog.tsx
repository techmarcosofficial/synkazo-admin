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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteMemberRole = 'editor' | 'org_admin';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: {
    email: string;
    role: InviteMemberRole;
    message?: string;
  }) => void;
}

// Separate from LifecycleConfirmDialog because the fields are different
// (email + role) and the intent is not a typed-name confirmation. Kept
// small — every invariant lives server-side (role allowlist, email
// uniqueness, suspended-org rejection).
export default function InviteMemberDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteMemberRole>('editor');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setEmail('');
      setRole('editor');
      setMessage('');
    }
  }, [open]);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const canSubmit = emailValid && !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      email: email.trim().toLowerCase(),
      role,
      message: message.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            The invitee gets an email with a signed link. Tokens are never
            shown here — revoking removes access even if the email was
            forwarded.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={email.length > 0 && !emailValid}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as InviteMemberRole)}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="org_admin">Org admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-message">
              Message
              <span className="text-muted-foreground ml-1 text-xs">
                (optional, shown in the invite email)
              </span>
            </Label>
            <Textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add any context the invitee should see"
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
            {isSubmitting ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
