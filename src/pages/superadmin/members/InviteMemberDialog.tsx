import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const MIN_REASON = 10;

export type InviteMemberRole = 'editor' | 'org_admin';

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255),
  role: z.enum(['editor', 'org_admin'] as const),
  message: z.string().trim().max(2000).optional(),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Audit reason must be at least ${MIN_REASON} characters`),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: {
    email: string;
    role: InviteMemberRole;
    message?: string;
    reason: string;
  }) => void;
}

// Separate from LifecycleConfirmDialog because the fields are different
// (email + role + reason) and the intent is not a typed-name
// confirmation. Reason (SA-504) is recorded on the audit row for every
// SA-triggered invite; server enforces the min length.
export default function InviteMemberDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: InviteMemberDialogProps) {
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      role: 'editor',
      message: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: '',
        role: 'editor',
        message: '',
        reason: '',
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (errorMessage) {
      if (/email|member|invited|assigned|exists/i.test(errorMessage)) {
        form.setError('email', { type: 'server', message: errorMessage });
      }
    }
  }, [errorMessage, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit({
      email: values.email.trim().toLowerCase(),
      role: values.role,
      message: values.message?.trim() || undefined,
      reason: values.reason.trim(),
    });
  });

  const reasonValue = form.watch('reason') ?? '';
  const isEmailServerError =
    Boolean(errorMessage) &&
    /email|member|invited|assigned|exists/i.test(errorMessage ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Invite a new member to this organisation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="invite-email">
                Email <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <FieldContent>
                <Select
                  value={form.watch('role')}
                  onValueChange={(v) =>
                    form.setValue('role', v as InviteMemberRole, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="org_admin">Org admin</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
              <FieldError>{form.formState.errors.role?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="invite-message">
                Message
                <span className="text-muted-foreground ml-1 text-xs">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="invite-message"
                  rows={3}
                  placeholder="Optional invitation note"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.message}
                  {...form.register('message')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.message?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="invite-reason">
                Reason <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="invite-reason"
                  rows={2}
                  placeholder="Reason for invitation"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.reason}
                  {...form.register('reason')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                {reasonValue.trim().length}/{MIN_REASON} characters
              </div>
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>

            {errorMessage && !isEmailServerError ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
