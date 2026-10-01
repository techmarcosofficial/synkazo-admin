import { formatDistanceToNow } from 'date-fns';
import { Plus, Shield, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createIdempotencyKey } from '@/lib/idempotency';
import { showToast } from '@/lib/toast';
import {
  useCreateSuperAdminMutation,
  useDeactivateSuperAdminMutation,
  useReactivateSuperAdminMutation,
  useSuperAdminDirectoryQuery,
} from '@/queries/useSuperAdmin';
import type { SuperAdminDirectoryEntry } from '@/types';

// CAP-006 / CAP-007 — Super Admin directory. Create captures a transient
// initial password + reason; deactivate requires typed-email confirm +
// reason; reactivate reason-only.

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'The request failed. Try again.';
}

const MIN_REASON = 10;
const MIN_PASSWORD = 12;

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: {
    email: string;
    fullName: string;
    initialPassword: string;
    reason: string;
  }) => void;
}

function CreateSuperAdminDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CreateDialogProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = fullName.trim().length > 0;
  const pwOk = password.length >= MIN_PASSWORD;
  const reasonOk = reason.trim().length >= MIN_REASON;
  const canSubmit = emailOk && nameOk && pwOk && reasonOk && !isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setEmail('');
          setFullName('');
          setPassword('');
          setReason('');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create super admin</DialogTitle>
          <DialogDescription>
            The invitee signs in with this email + password immediately. Share
            the password through a secure channel; it is not stored in plaintext
            server-side.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sa-email">Email</Label>
            <Input
              id="sa-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sa-name">Full name</Label>
            <Input
              id="sa-name"
              autoComplete="off"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sa-password">Initial password</Label>
            <Input
              id="sa-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="text-muted-foreground text-xs">
              Min {MIN_PASSWORD} characters.
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sa-reason">Reason</Label>
            <Textarea
              id="sa-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="text-muted-foreground text-xs">
              {reason.trim().length}/{MIN_REASON} characters
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
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                email: email.trim().toLowerCase(),
                fullName: fullName.trim(),
                initialPassword: password,
                reason: reason.trim(),
              })
            }
          >
            {isSubmitting ? 'Creating…' : 'Create super admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperAdminsPage() {
  const query = useSuperAdminDirectoryQuery();
  const createMutation = useCreateSuperAdminMutation();
  const deactivateMutation = useDeactivateSuperAdminMutation();
  const reactivateMutation = useReactivateSuperAdminMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<SuperAdminDirectoryEntry | null>(null);
  const [reactivateTarget, setReactivateTarget] =
    useState<SuperAdminDirectoryEntry | null>(null);

  const rows = query.data ?? [];
  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <div className="animate-fade-in-up flex flex-col gap-6">
      <PageHeader
        title="Super Admins"
        description="Manage platform-administrator accounts. The last active super admin can never be deactivated."
      />

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {activeCount} active · {rows.length - activeCount} inactive
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
          New super admin
        </Button>
      </div>

      {query.isLoading ? (
        <SkeletonList count={3} />
      ) : query.isError ? (
        <ErrorState
          title="Could not load super admins"
          description={extractErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No super admins"
          description="Create the first platform administrator account."
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-40 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.fullName}</TableCell>
                  <TableCell className="text-sm">{row.email}</TableCell>
                  <TableCell>
                    {row.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-900">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(row.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeactivateTarget(row)}
                      >
                        <ShieldAlert className="size-3.5" aria-hidden />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReactivateTarget(row)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateSuperAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMutation.isPending}
        errorMessage={
          createMutation.isError
            ? extractErrorMessage(createMutation.error)
            : null
        }
        onSubmit={(values) =>
          createMutation.mutate(
            { dto: values, idempotencyKey: createIdempotencyKey() },
            {
              onSuccess: () => {
                showToast.success(`Super admin ${values.email} created.`);
                setCreateOpen(false);
              },
            },
          )
        }
      />

      <LifecycleConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(o) => (o ? undefined : setDeactivateTarget(null))}
        title="Deactivate super admin"
        description={
          deactivateTarget
            ? `Deactivates ${deactivateTarget.email}. The last active super admin is blocked server-side.`
            : 'Deactivate super admin'
        }
        actionLabel="Deactivate"
        tone="danger"
        organisationName={deactivateTarget?.email ?? ''}
        requiresNameConfirm={true}
        minReasonLength={10}
        reasonPlaceholder="Why is this super admin being deactivated?"
        isSubmitting={deactivateMutation.isPending}
        errorMessage={
          deactivateMutation.isError
            ? extractErrorMessage(deactivateMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!deactivateTarget) return;
          deactivateMutation.mutate(
            {
              userId: deactivateTarget.id,
              dto: { reason, confirmEmail: deactivateTarget.email },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Super admin deactivated.');
                setDeactivateTarget(null);
              },
            },
          );
        }}
      />

      <LifecycleConfirmDialog
        open={reactivateTarget !== null}
        onOpenChange={(o) => (o ? undefined : setReactivateTarget(null))}
        title="Reactivate super admin"
        description={
          reactivateTarget
            ? `Restores super-admin access for ${reactivateTarget.email}.`
            : 'Reactivate super admin'
        }
        actionLabel="Reactivate"
        tone="warning"
        organisationName=""
        requiresNameConfirm={false}
        minReasonLength={10}
        reasonPlaceholder="Why is this super admin being reactivated?"
        isSubmitting={reactivateMutation.isPending}
        errorMessage={
          reactivateMutation.isError
            ? extractErrorMessage(reactivateMutation.error)
            : null
        }
        onSubmit={({ reason }) => {
          if (!reactivateTarget) return;
          reactivateMutation.mutate(
            {
              userId: reactivateTarget.id,
              dto: { reason },
              idempotencyKey: createIdempotencyKey(),
            },
            {
              onSuccess: () => {
                showToast.success('Super admin reactivated.');
                setReactivateTarget(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
