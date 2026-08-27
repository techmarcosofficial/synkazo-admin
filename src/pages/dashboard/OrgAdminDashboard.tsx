import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  Building2,
  FolderOpen,
  type LucideIcon,
  Mail,
  Plus,
  Shield,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import EditPermissionsDialog from '@/components/organisation/EditPermissionsDialog';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERMISSION_GROUPS, roleLabel } from '@/lib/permissions';
import { useSBAuth } from '@/lib/syncbridgeAuth';
import { useInvitationsQuery } from '@/queries/useInvitations';
import { useMyOrgQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import { useUsersQuery } from '@/queries/useUsers';
import type { User, UserRole } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{label}</span>
          <Icon className={`size-4 ${tone}`} />
        </div>
        <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function OrgAdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonStatGrid />
      <Card className="p-0">
        <SkeletonList count={4} />
      </Card>
    </div>
  );
}

export default function OrgAdminDashboard() {
  const { currentUser } = useSBAuth();
  const projectsQuery = useProjectsQuery();
  const usersQuery = useUsersQuery(currentUser?.organisationId);
  const invitationsQuery = useInvitationsQuery();
  const orgQuery = useMyOrgQuery();

  const isLoading =
    projectsQuery.isLoading ||
    usersQuery.isLoading ||
    invitationsQuery.isLoading ||
    orgQuery.isLoading;

  const projects = projectsQuery.data ?? [];
  const orgMembers = (usersQuery.data ?? []).filter(
    (m) => m.id !== currentUser?.id,
  );
  const invitations = (invitationsQuery.data ?? []).filter(
    (i) => i.status === 'pending',
  );
  const organisation = orgQuery.data ?? null;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const openPermEditor = (member: User) => setEditingUser(member);

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title={organisation?.name || 'Organisation Dashboard'}
      description={`Organisation Admin · ${currentUser?.email}`}
      actions={
        <Button asChild>
          <Link to="/invitations">
            <Mail /> Invite Member
          </Link>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <OrgAdminDashboardSkeleton />
      </div>
    );
  }

  if (!organisation) {
    return (
      <EmptyState
        icon={Building2}
        title="No Organisation Yet"
        description="You need to create an organisation before you can manage your team and projects."
        action={
          <Button asChild>
            <Link to="/setup-organisation">
              Set Up Organisation <ArrowRight />
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <Tabs defaultValue="Overview">
        <TabsList>
          <TabsTrigger value="Overview">Overview</TabsTrigger>
          <TabsTrigger value="Team">Team</TabsTrigger>
          <TabsTrigger value="Permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="Overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Projects"
              value={projects.length}
              icon={FolderOpen}
              tone="text-primary"
            />
            <StatCard
              label="Team Members"
              value={orgMembers.length}
              icon={Users}
              tone="text-success"
            />
            <StatCard
              label="Pending Invites"
              value={invitations.length}
              icon={Mail}
              tone="text-warning"
            />
            <StatCard
              label="Active Projects"
              value={projects.filter((p) => p.status === 'active').length}
              icon={Shield}
              tone="text-paused"
            />
          </div>

          <Card className="gap-0 py-0">
            <CardHeader className="bg-muted/40 flex flex-row items-center justify-between border-b py-3!">
              <CardTitle>Projects</CardTitle>
              <Button asChild variant="secondary" size="sm">
                <Link to="/projects?new=1">
                  <Plus /> New Project
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No projects yet"
                  description="Create your first project to get started."
                  action={
                    <Button asChild>
                      <Link to="/projects?new=1">
                        <Plus /> Create one
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div>
                  {projects.map((p) => (
                    <ListRow key={p.id} asChild className="justify-between">
                      <Link to={`/projects/${p.id}`}>
                        <span className="text-sm font-medium">{p.name}</span>
                        <StatusBadge status={p.status} size="sm" />
                      </Link>
                    </ListRow>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Team" className="space-y-3">
          {orgMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Invite your first editor to get started."
              action={
                <Button asChild>
                  <Link to="/invitations">
                    <Mail /> Invite your first editor
                  </Link>
                </Button>
              }
            />
          ) : (
            <Card className="gap-0 py-0">
              <CardHeader className="bg-muted/40 border-b py-3!">
                <CardTitle>Members ({orgMembers.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div>
                  {orgMembers.map((member) => (
                    <ListRow key={member.id} className="justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                            {member.fullName?.charAt(0)?.toUpperCase() ||
                              member.email?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.fullName || member.email}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {member.email} · {roleLabel(member.role)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === 'editor' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openPermEditor(member)}
                          >
                            Edit Permissions
                          </Button>
                        )}
                        <StatusBadge
                          status={
                            (member as User & { isActive?: boolean })
                              .isActive !== false
                              ? 'active'
                              : 'idle'
                          }
                          size="sm"
                        />
                      </div>
                    </ListRow>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {invitations.length > 0 && (
            <Card className="gap-0 py-0">
              <CardHeader className="bg-muted/40 border-b py-3!">
                <CardTitle className="text-warning">
                  Pending Invitations ({invitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div>
                  {invitations.map((inv) => (
                    <ListRow key={inv.id} className="justify-between">
                      <div>
                        <p className="text-sm">{inv.email}</p>
                        <p className="text-muted-foreground text-xs">
                          Invited as {roleLabel(inv.role as UserRole)} · expires{' '}
                          {inv.expiresAt
                            ? formatDistanceToNow(new Date(inv.expiresAt), {
                                addSuffix: true,
                              })
                            : '—'}
                        </p>
                      </div>
                      <StatusBadge status="pending" size="sm" />
                    </ListRow>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="Permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Select an editor from the Team tab to manage their specific
                permissions.
              </p>
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.perms.map((perm) => (
                      <Badge key={perm} variant="outline" className="font-mono">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditPermissionsDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  );
}
