import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Shield, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';
import PeopleDirectory, {
  comparePeople,
  type PeopleSortKey,
  type PersonView,
} from './people/PeopleDirectory';
import PeopleToolbar from './people/PeopleToolbar';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { createIdempotencyKey } from '@/lib/idempotency';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
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

export const createSuperAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255),
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(255),
  password: z
    .string()
    .min(MIN_PASSWORD, `Password must be at least ${MIN_PASSWORD} characters`),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Audit reason must be at least ${MIN_REASON} characters`),
});

export type CreateSuperAdminFormValues = z.infer<typeof createSuperAdminSchema>;

export function CreateSuperAdminDialog({
  open,
  onOpenChange,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CreateDialogProps) {
  const form = useForm<CreateSuperAdminFormValues>({
    resolver: zodResolver(createSuperAdminSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: '',
        fullName: '',
        password: '',
        reason: '',
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (errorMessage) {
      if (/email|user|already exists|registered/i.test(errorMessage)) {
        form.setError('email', { type: 'server', message: errorMessage });
      } else if (/password/i.test(errorMessage)) {
        form.setError('password', { type: 'server', message: errorMessage });
      }
    }
  }, [errorMessage, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit({
      email: values.email.trim().toLowerCase(),
      fullName: values.fullName.trim(),
      initialPassword: values.password,
      reason: values.reason.trim(),
    });
  });

  const reasonValue = form.watch('reason') ?? '';
  const isFieldServerError =
    Boolean(errorMessage) &&
    /email|user|already exists|registered|password/i.test(errorMessage ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create super admin</DialogTitle>
            <DialogDescription>
              Create a new super admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="sa-email">
                Email <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sa-email"
                  type="email"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="sa-name">
                Full name <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sa-name"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.fullName}
                  {...form.register('fullName')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.fullName?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="sa-password">
                Initial password <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sa-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register('password')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                Min {MIN_PASSWORD} characters.
              </div>
              <FieldError>{form.formState.errors.password?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="sa-reason">
                Reason <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="sa-reason"
                  rows={2}
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

            {errorMessage && !isFieldServerError ? (
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
              {isSubmitting ? 'Creating…' : 'Create super admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperAdminsPage() {
  const { currentUser } = useSynkazoAuth();
  const query = useSuperAdminDirectoryQuery();
  const createMutation = useCreateSuperAdminMutation();
  const deactivateMutation = useDeactivateSuperAdminMutation();
  const reactivateMutation = useReactivateSuperAdminMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<SuperAdminDirectoryEntry | null>(null);
  const [reactivateTarget, setReactivateTarget] =
    useState<SuperAdminDirectoryEntry | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const activeCount = rows.filter((r) => r.isActive).length;
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!needle ||
          row.fullName.toLowerCase().includes(needle) ||
          row.email.toLowerCase().includes(needle)) &&
        (status === 'all' ||
          (status === 'active' ? row.isActive : !row.isActive)),
    );
  }, [rows, search, status]);
  const people: PersonView[] = filtered.map((row) => {
    const cannotDeactivate = row.id === currentUser?.id || activeCount <= 1;
    return {
      id: row.id,
      name: row.fullName,
      email: row.email,
      role: 'Super Admin',
      organisation: 'Platform',
      isActive: row.isActive,
      createdAt: row.createdAt,
      actions: row.isActive ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => setDeactivateTarget(row)}
          disabled={cannotDeactivate}
          title={
            row.id === currentUser?.id
              ? 'You cannot deactivate your own account'
              : activeCount <= 1
                ? 'At least one active super admin is required'
                : undefined
          }
        >
          <ShieldAlert className="size-3.5" aria-hidden /> Deactivate
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setReactivateTarget(row)}
        >
          Reactivate
        </Button>
      ),
    };
  });
  const { sorted, sortKey, direction, toggleSort } = useSort<
    PersonView,
    PeopleSortKey
  >(people, comparePeople);
  const { page, setPage, pageSize, setPageSize, totalPages, pageItems, total } =
    usePagination(sorted, 10);

  useEffect(() => {
    setPage(1);
  }, [search, status, setPage]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <HeadingPair
              title="Super Admins"
              subtitle={`${activeCount} active · ${rows.length - activeCount} inactive`}
            />
            <PeopleToolbar
              searchValue={search}
              onSearchChange={setSearch}
              filters={
                <>
                  <Select
                    value={status}
                    onValueChange={(value: typeof status) => setStatus(value)}
                  >
                    <SelectTrigger
                      className="bg-muted sm:w-36"
                      aria-label="Filter super admins by status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              }
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" aria-hidden />
                  New super admin
                </Button>
              }
            />
          </div>
          {query.isLoading ? (
            <SkeletonList count={3} />
          ) : query.isError ? (
            <ErrorState
              title="Could not load super admins"
              description={extractErrorMessage(query.error)}
              onRetry={() => query.refetch()}
            />
          ) : people.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={
                rows.length === 0
                  ? 'No super admins'
                  : 'No matching super admins'
              }
              description={
                rows.length === 0
                  ? 'Create the first platform administrator account.'
                  : 'Try a different search or status.'
              }
            />
          ) : (
            <PeopleDirectory
              people={pageItems}
              sortKey={sortKey}
              direction={direction}
              onSort={toggleSort}
            />
          )}
        </CardContent>
      </Card>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

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
            ? `Deactivate ${deactivateTarget.email}.`
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
            ? `Restore super-admin access for ${reactivateTarget.email}.`
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
