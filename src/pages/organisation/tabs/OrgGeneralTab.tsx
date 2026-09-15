import { Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSectionAccess } from '@/lib/sectionAccess';
import { showToast } from '@/lib/toast';
import {
  useMyOrgQuery,
  useUpdateOrgMutation,
} from '@/queries/useOrganisations';
import type { Organisation } from '@/types';

const CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD'];

type OrgExtended = Organisation & {
  logoUrl?: string;
  slug?: string;
  settings?: Record<string, string>;
};

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  defaultCurrency: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  logoUrl: '',
  defaultCurrency: 'USD',
};

const formFor = (org: OrgExtended | undefined): FormState =>
  org
    ? {
        name: org.name || '',
        description: org.description || '',
        logoUrl: org.logoUrl || '',
        defaultCurrency: org.settings?.defaultCurrency || 'USD',
      }
    : EMPTY_FORM;

/**
 * The organisation's own details. Every role may read this so a member can tell
 * which tenant they belong to; only org admins may change it, in which case the
 * Save control is omitted entirely rather than shown disabled.
 *
 * Plan is deliberately absent — it used to render here as a footer row inside
 * the form, which read as an editable organisation field. It belongs under
 * Billing & Usage.
 */
export default function OrgGeneralTab() {
  const orgQuery = useMyOrgQuery();
  const updateOrgMutation = useUpdateOrgMutation();
  const org = orgQuery.data as OrgExtended | undefined;
  const { canEdit, readOnlyNote } = useSectionAccess();

  const saved = useMemo(() => formFor(org), [org]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => setForm(saved), [saved]);

  const isDirty = (Object.keys(saved) as (keyof FormState)[]).some(
    (key) => form[key] !== saved[key],
  );

  const handleSave = async () => {
    if (!org) return;
    try {
      await updateOrgMutation.mutateAsync({
        id: org.id,
        data: {
          name: form.name,
          description: form.description,
          logoUrl: form.logoUrl,
          settings: {
            ...(org.settings || {}),
            defaultCurrency: form.defaultCurrency,
          },
        } as Partial<OrgExtended>,
      });
      showToast.success('Organisation updated.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast.error(e.response?.data?.message ?? 'Failed to save changes');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="text-muted-foreground size-4" /> Organization
          Information
        </CardTitle>
        <CardDescription>
          Shared settings visible to everyone in this organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orgQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-40" />
          </div>
        ) : orgQuery.isError ? (
          <ErrorState onRetry={() => orgQuery.refetch()} />
        ) : (
          <FieldGroup className="gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="org-name">Organization Name</FieldLabel>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  readOnly={!canEdit}
                  disabled={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-logo">
                  Logo URL{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="org-logo"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logoUrl: e.target.value }))
                  }
                  placeholder="https://…"
                  readOnly={!canEdit}
                  disabled={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Default Currency</FieldLabel>
                <Select
                  value={form.defaultCurrency}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, defaultCurrency: v }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Applied to financial sync objects when no per-job override is
                  set.
                </p>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="org-desc">
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FieldLabel>
              <Textarea
                id="org-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="What does your organisation use synkazo for?"
                readOnly={!canEdit}
                disabled={!canEdit}
              />
            </Field>

            {org &&
              (canEdit ? (
                <Button
                  className="w-fit"
                  onClick={handleSave}
                  loading={updateOrgMutation.isPending}
                  disabled={!isDirty}
                >
                  Save Changes
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">{readOnlyNote}</p>
              ))}
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}
