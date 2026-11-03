import { LifeBuoy, Mail, ShieldCheck, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import OrganisationNotesCard from '@/pages/superadmin/organisations/OrganisationNotesCard';
import { useSuperAdminOrganisationQuery } from '@/queries/useSuperAdmin';

export default function OrganisationSupportPage() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);

  if (!organisationId) {
    return (
      <EmptyState
        icon={LifeBuoy}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  if (orgQuery.isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  const org = orgQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        {/* Customer Escalation & Support Card */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" aria-hidden="true" />
              Support &amp; Escalation
            </CardTitle>
            <CardDescription className="text-xs">
              Primary tenant contact for support inquiries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-xl bg-muted/40 p-3 space-y-2">
              <span className="text-muted-foreground font-medium block">Primary Contact</span>
              {org?.owner ? (
                <div>
                  <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {org.owner.fullName || 'Workspace Owner'}
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate">
                    {org.owner.email}
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2.5 w-full h-7 gap-1.5 text-xs"
                  >
                    <a href={`mailto:${org.owner.email}?subject=Synkazo Support for ${encodeURIComponent(org.name)}`}>
                      <Mail className="size-3" aria-hidden="true" />
                      Email Customer
                    </a>
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground">No contact assigned</span>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Support Tier</span>
                <span className="font-semibold text-foreground">{org?.plan.name ?? 'Standard'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Status</span>
                {org && (
                  <StatusBadge
                    status={org.status}
                    label={org.status}
                    className="capitalize text-xs"
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operational Hold</span>
                <span className="font-semibold text-foreground">
                  {org?.syncHealth?.isWorkHeld ? 'Active (Held)' : 'None (Active)'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/70">
              <Button asChild variant="ghost" size="sm" className="w-full justify-start h-8 px-2 text-xs">
                <Link to={`/super-admin/organisations/${organisationId}/activity`}>
                  <ShieldCheck className="size-3.5 mr-1.5 text-muted-foreground" aria-hidden="true" />
                  View Organisation Audit Trail
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operator Support Notes */}
        <div>
          <OrganisationNotesCard
            organisationId={organisationId}
            category="support"
          />
        </div>
      </div>
    </div>
  );
}
