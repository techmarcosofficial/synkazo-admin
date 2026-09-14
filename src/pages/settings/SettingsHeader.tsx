import { Building2, Settings2, UserRound } from 'lucide-react';

import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useMyOrgQuery } from '@/queries/useOrganisations';

function getInitials(fullName?: string, email?: string) {
  if (fullName) {
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return email?.charAt(0).toUpperCase() || '?';
}

/** Personal identity and account context kept visible while changing settings. */
export default function SettingsHeader() {
  const { currentUser } = useSynkazoAuth();
  const { data: org } = useMyOrgQuery();

  if (!currentUser) return null;

  const status =
    currentUser.status ??
    (currentUser.isActive === false ? 'suspended' : 'active');

  return (
    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <Avatar className="ring-background size-14 shrink-0 ring-4">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {currentUser.avatarInitials ||
              getInitials(currentUser.fullName, currentUser.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 space-y-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="text-muted-foreground size-4.5" />
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Manage your personal account and application preferences.
            </p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {currentUser.fullName || currentUser.email}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {currentUser.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
        <Badge className="bg-primary/10 text-primary">
          <UserRound />
          {roleLabel(currentUser.role)}
        </Badge>
        {org?.name && (
          <Badge variant="secondary">
            <Building2 />
            {org.name}
          </Badge>
        )}
        <StatusBadge status={status} size="sm" />
      </div>
    </div>
  );
}
