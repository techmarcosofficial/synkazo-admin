import { Clock, Eye, Mail, Megaphone, Plus, RefreshCw, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ManagementToolbar from '@/components/shared/ManagementToolbar';
import PageHeader from '@/components/shared/PageHeader';
import PaginationBar from '@/components/shared/PaginationBar';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useLeadNotificationSettingsQuery,
  useLeadsQuery,
  useUpdateLeadMutation,
  useUpdateLeadNotificationSettingsMutation,
} from '@/queries/useLeads';
import type { Lead, LeadStatus } from '@/types/lead';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  closed: 'Closed',
  spam: 'Spam',
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: 'bg-info/10 text-info',
  contacted: 'bg-warning/10 text-warning',
  qualified: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
  spam: 'bg-destructive/10 text-destructive',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function LeadDrawer({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus | undefined>();
  const [notes, setNotes] = useState<string | undefined>();
  const update = useUpdateLeadMutation();

  useEffect(() => {
    setStatus(undefined);
    setNotes(undefined);
  }, [lead?.id]);

  const save = async () => {
    if (!lead) return;
    try {
      await update.mutateAsync({
        id: lead.id,
        status: status ?? lead.status,
        adminNotes: notes ?? lead.adminNotes ?? '',
      });
      toast.success('Lead updated');
      onClose();
    } catch {
      toast.error('Could not update this lead. Please try again.');
    }
  };

  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle>{lead.name}</SheetTitle>
              <SheetDescription>{lead.email}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-6 pb-6">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Company</dt>
                  <dd className="mt-1 font-medium">{lead.company || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Platforms</dt>
                  <dd className="mt-1 font-medium">{lead.platforms || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="mt-1 font-medium">{lead.source}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(lead.createdAt)}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="text-muted-foreground text-sm">
                  What they want to sync
                </p>
                <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                  {lead.message || 'No details provided.'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lead-status">
                  Status
                </label>
                <Select
                  value={status ?? lead.status}
                  onValueChange={(value) => setStatus(value as LeadStatus)}
                >
                  <SelectTrigger id="lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lead-notes">
                  Internal notes
                </label>
                <textarea
                  id="lead-notes"
                  value={notes ?? lead.adminNotes ?? ''}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={5000}
                  className="border-input bg-background focus-visible:ring-ring min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  placeholder="Add internal context or next steps"
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LeadNotificationSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settingsQuery = useLeadNotificationSettingsQuery(open);
  const updateSettings = useUpdateLeadNotificationSettingsMutation();
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>(
    [],
  );
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!open || !settingsQuery.data) return;
    setAdditionalRecipients(settingsQuery.data.additionalRecipients);
    setEmail('');
    setEmailError('');
  }, [open, settingsQuery.data]);

  const addRecipient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recipient = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(recipient)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (settingsQuery.data?.defaultRecipients.includes(recipient)) {
      setEmailError('This active Super Admin already receives notifications.');
      return;
    }
    if (additionalRecipients.includes(recipient)) {
      setEmailError('This email address has already been added.');
      return;
    }
    if (additionalRecipients.length >= 20) {
      setEmailError('You can add up to 20 notification recipients.');
      return;
    }

    setAdditionalRecipients((current) => [...current, recipient].sort());
    setEmail('');
    setEmailError('');
  };

  const save = async () => {
    try {
      await updateSettings.mutateAsync(additionalRecipients);
      toast.success('Lead notification recipients updated');
      onOpenChange(false);
    } catch {
      toast.error(
        'Could not update notification recipients. Please try again.',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Lead notification emails</DialogTitle>
          <DialogDescription>
            Active Super Admins receive new leads only when no additional
            recipients are configured below.
          </DialogDescription>
        </DialogHeader>

        {settingsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading recipients…</p>
        ) : settingsQuery.isError ? (
          <p className="text-destructive text-sm">
            Could not load notification recipients. Close this dialog and try
            again.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Fallback recipients</p>
              {settingsQuery.data?.defaultRecipients.length ? (
                <ul className="text-muted-foreground space-y-1 text-sm">
                  {settingsQuery.data.defaultRecipients.map((recipient) => (
                    <li key={recipient}>{recipient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No active Super Admin email addresses are available for the
                  fallback list.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Notification recipients</p>
              <form className="flex gap-2" onSubmit={addRecipient}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError('');
                  }}
                  placeholder="name@company.com"
                  aria-describedby={
                    emailError ? 'lead-recipient-error' : undefined
                  }
                  aria-invalid={Boolean(emailError)}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!email.trim()}
                >
                  <Plus />
                  Add
                </Button>
              </form>
              {emailError && (
                <p
                  id="lead-recipient-error"
                  className="text-destructive text-sm"
                >
                  {emailError}
                </p>
              )}

              {additionalRecipients.length > 0 ? (
                <ul className="space-y-2" aria-label="Notification recipients">
                  {additionalRecipients.map((recipient) => (
                    <li
                      key={recipient}
                      className="bg-muted flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{recipient}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={() =>
                          setAdditionalRecipients((current) =>
                            current.filter(
                              (emailAddress) => emailAddress !== recipient,
                            ),
                          )
                        }
                        aria-label={`Remove ${recipient}`}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No notification recipients configured. Active Super Admins
                  will receive new leads.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={
              settingsQuery.isLoading ||
              settingsQuery.isError ||
              updateSettings.isPending
            }
          >
            {updateSettings.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketingPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] =
    useState(false);
  const leadsQuery = useLeadsQuery(
    page,
    pageSize,
    status === 'all' ? undefined : status,
    search.trim() || undefined,
  );
  const leads = leadsQuery.data?.data ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPage = () => setPage(1);

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
        title="Marketing"
        description="Review demo requests submitted through the marketing website."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setNotificationSettingsOpen(true)}
            >
              <Mail />
              Lead email settings
            </Button>
            <Button
              variant="outline"
              onClick={() => leadsQuery.refetch()}
              disabled={leadsQuery.isFetching}
            >
              <RefreshCw
                className={cn(leadsQuery.isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
          </>
        }
      />
      {leadsQuery.isLoading ? (
        <Card className="p-0">
          <SkeletonTable rows={8} columns={6} />
        </Card>
      ) : leadsQuery.isError && !leadsQuery.data ? (
        <ErrorState onRetry={() => leadsQuery.refetch()} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No demo requests yet"
          description="New website demo requests will appear here."
        />
      ) : (
        <Card>
          <CardContent className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Manage demo requests</h3>
                <p className="text-muted-foreground text-sm">
                  Requests submitted from the marketing website.
                </p>
              </div>
              <ManagementToolbar
                searchValue={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  resetPage();
                }}
                searchPlaceholder="Search demo requests…"
                filters={
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value as LeadStatus | 'all');
                      resetPage();
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-42">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
            </div>
            <div className="overflow-hidden overflow-x-auto rounded-4xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <TableHead>Contact</TableHead>
                    <TableHead>Company / platforms</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {lead.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{lead.company || '—'}</div>
                        <div className="text-muted-foreground text-sm">
                          {lead.platforms || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-72">
                        <p className="line-clamp-2">{lead.message || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {formatDate(lead.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLead(lead)}
                          aria-label={`View ${lead.name}`}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                resetPage();
              }}
              disabled={leadsQuery.isFetching}
            />
          </CardFooter>
        </Card>
      )}
      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <LeadNotificationSettingsDialog
        open={notificationSettingsOpen}
        onOpenChange={setNotificationSettingsOpen}
      />
    </div>
  );
}
