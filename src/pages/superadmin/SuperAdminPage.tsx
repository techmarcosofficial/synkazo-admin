import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FolderOpen,
  ListChecks,
  Percent,
  RefreshCw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Terminal,
  Timer,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';

import ErrorState from '@/components/shared/ErrorState';
import ModuleCard, {
  type ModuleCardMetric,
} from '@/components/shared/ModuleCard';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import SkeletonStatGrid from '@/components/shared/skeletons/SkeletonStatGrid';
import StatCardGrid from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLAN_FEATURE_FIELDS } from '@/pages/admin/planFeatureFields';
import { usePlatformAuditLogsQuery } from '@/queries/useAudit';
import {
  useAdminCouponsQuery,
  useAdminDiscountRulesQuery,
  useAdminDiscountSettingsQuery,
  useAdminPlansQuery,
} from '@/queries/useBilling';
import { useOrgsQuery } from '@/queries/useOrganisations';
import { useProjectsQuery } from '@/queries/useProjects';
import { useSystemLogsQuery } from '@/queries/useSystemLogs';
import { useTwoWaySyncIntervalsQuery } from '@/queries/useTwoWaySync';
import { useUsersQuery } from '@/queries/useUsers';
import type { AuditLog } from '@/types/audit';

const DEFAULT_TWO_WAY_SYNC_MINUTES = 2;

function countSince(items: { createdAt?: string }[], since: Date) {
  return items.filter((i) => i.createdAt && new Date(i.createdAt) >= since)
    .length;
}

function SuperAdminSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonStatGrid />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-0">
            <SkeletonList count={3} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const orgsQuery = useOrgsQuery();
  const usersQuery = useUsersQuery();
  const auditQuery = usePlatformAuditLogsQuery(1, 100);
  const systemLogsQuery = useSystemLogsQuery(1, 100);
  const projectsQuery = useProjectsQuery();

  // Secondary, non-blocking data — powers module card metrics only. The hub's
  // primary loading/error gate below never waits on these; a card just renders
  // without its metrics section until its own query resolves.
  const plansQuery = useAdminPlansQuery();
  const couponsQuery = useAdminCouponsQuery();
  const discountRulesQuery = useAdminDiscountRulesQuery();
  const discountSettingsQuery = useAdminDiscountSettingsQuery();
  const twoWaySyncQuery = useTwoWaySyncIntervalsQuery();

  const isLoading =
    orgsQuery.isLoading ||
    usersQuery.isLoading ||
    auditQuery.isLoading ||
    projectsQuery.isLoading;
  const hasNoData =
    (orgsQuery.isError && orgsQuery.data === undefined) ||
    (usersQuery.isError && usersQuery.data === undefined) ||
    (auditQuery.isError && auditQuery.data === undefined) ||
    (projectsQuery.isError && projectsQuery.data === undefined);

  const organisations = orgsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const auditRes = auditQuery.data;
  const auditLogs = (
    Array.isArray(auditRes) ? auditRes : (auditRes?.data ?? [])
  ) as AuditLog[];
  const projects = projectsQuery.data ?? [];

  const refreshAll = () => {
    orgsQuery.refetch();
    usersQuery.refetch();
    auditQuery.refetch();
    systemLogsQuery.refetch();
    projectsQuery.refetch();
    plansQuery.refetch();
    couponsQuery.refetch();
    discountRulesQuery.refetch();
    discountSettingsQuery.refetch();
    twoWaySyncQuery.refetch();
  };

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
      title="Super Admin Console"
      description="Manage and monitor the synkazo platform."
      actions={
        <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
          <RefreshCw className={cn(isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <SuperAdminSkeleton />
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState onRetry={refreshAll} />
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const orgsThisMonth = countSince(organisations, startOfMonth);
  const usersThisMonth = countSince(users, startOfMonth);
  const projectsThisMonth = countSince(projects, startOfMonth);
  const eventsToday = countSince(auditLogs, startOfToday);

  const activeOrgs = organisations.filter(
    (o) => (o as { status?: string }).status !== 'suspended',
  ).length;
  const suspendedOrgs = organisations.length - activeOrgs;

  const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
  const orgAdminCount = users.filter((u) => u.role === 'org_admin').length;

  const plans = plansQuery.data;
  const planMetrics: ModuleCardMetric[] = plans
    ? [
        {
          icon: CreditCard,
          label: `${plans.filter((p) => p.isActive).length} Active Plans`,
        },
        { icon: ListChecks, label: `${PLAN_FEATURE_FIELDS.length} Features` },
        {
          icon: RefreshCw,
          label: `${plans.filter((p) => p.stripeProductId).length} Synced to Stripe`,
        },
      ]
    : [];

  const coupons = couponsQuery.data;
  const discountRules = discountRulesQuery.data;
  const discountSettings = discountSettingsQuery.data;
  const discountMetrics: ModuleCardMetric[] =
    coupons && discountRules && discountSettings
      ? [
          { icon: Tag, label: `${coupons.length} Coupons` },
          { icon: Percent, label: `${discountRules.length} Auto Rules` },
          {
            icon: discountSettings.discountsEnabled ? ToggleRight : ToggleLeft,
            label: discountSettings.discountsEnabled ? 'Active' : 'Disabled',
          },
        ]
      : [];

  const intervals = twoWaySyncQuery.data;
  const defaultInterval =
    intervals?.find((r) => r.isDefault)?.intervalMinutes ??
    intervals?.[0]?.intervalMinutes ??
    DEFAULT_TWO_WAY_SYNC_MINUTES;
  const systemMetrics: ModuleCardMetric[] = intervals
    ? [
        { icon: Server, label: `${intervals.length} Platforms` },
        {
          icon: Timer,
          label: `${defaultInterval} min Default Interval`,
        },
        {
          icon: SlidersHorizontal,
          label: `${intervals.filter((r) => !r.isDefault).length} Customized`,
        },
      ]
    : [];

  const systemLogsRes = systemLogsQuery.data;
  const systemLogs = (
    Array.isArray(systemLogsRes) ? systemLogsRes : (systemLogsRes?.data ?? [])
  ) as { severity?: string }[];
  const criticalEvents =
    auditLogs.filter((l) => l.severity === 'critical').length +
    systemLogs.filter((l) => l.severity === 'critical').length;
  const auditMetrics: ModuleCardMetric[] = [
    { icon: ClipboardList, label: `${auditLogs.length} Audit Events` },
    { icon: Terminal, label: `${systemLogs.length} System Events` },
    { icon: AlertTriangle, label: `${criticalEvents} Critical` },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}

      <StatCardGrid
        stats={[
          {
            label: 'Organisations',
            value: organisations.length,
            icon: Building2,
            tone: 'bg-primary/10 text-primary',
            delta: {
              value: `+${orgsThisMonth}`,
              positive: true,
              label: 'this month',
            },
          },
          {
            label: 'Users',
            value: users.length,
            icon: Users,
            tone: 'bg-info/10 text-info',
            delta: {
              value: `+${usersThisMonth}`,
              positive: true,
              label: 'this month',
            },
          },
          {
            label: 'Projects',
            value: projects.length,
            icon: FolderOpen,
            tone: 'bg-success/10 text-success',
            delta: {
              value: `+${projectsThisMonth}`,
              positive: true,
              label: 'this month',
            },
          },
          {
            label: 'Platform Activity',
            value: eventsToday,
            icon: Activity,
            tone: 'bg-warning/10 text-warning',
          },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Management Modules
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Access and manage all platform-level configurations and data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Organizations"
          description="View and manage all tenant organizations on the platform."
          icon={Building2}
          to="/super-admin/organisations"
          tone="primary"
          metrics={[
            { icon: Building2, label: `${organisations.length} Organisations` },
            { icon: CheckCircle2, label: `${activeOrgs} Active` },
            { icon: XCircle, label: `${suspendedOrgs} Suspended` },
          ]}
        />
        <ModuleCard
          title="Projects"
          description="View all projects across every organisation on the platform."
          icon={FolderOpen}
          to="/super-admin/projects"
          tone="success"
          metrics={[
            { icon: FolderOpen, label: `${projects.length} Total Projects` },
            {
              icon: CheckCircle2,
              label: `${projects.filter((p) => p.status === 'active').length} Active`,
            },
            {
              icon: XCircle,
              label: `${projects.filter((p) => p.status === 'error').length} Errored`,
            },
          ]}
        />
        <ModuleCard
          title="Users"
          description="Manage platform users, roles, and access permissions."
          icon={Users}
          to="/super-admin/users"
          tone="info"
          metrics={[
            { icon: Users, label: `${users.length} Total Users` },
            { icon: ShieldCheck, label: `${superAdminCount} Super Admins` },
            { icon: UserCog, label: `${orgAdminCount} Org Admins` },
          ]}
        />
        <ModuleCard
          title="Plans"
          description="Manage subscription plans, limits and pricing."
          icon={CreditCard}
          to="/super-admin/plans"
          tone="success"
          metrics={planMetrics}
        />
        <ModuleCard
          title="Discounts"
          description="Manage coupons and automatic discount rules."
          icon={Percent}
          to="/super-admin/discounts"
          tone="warning"
          metrics={discountMetrics}
        />
        <ModuleCard
          title="Platform Settings"
          description="Configure global sync settings and system preferences."
          icon={Server}
          to="/super-admin/system"
          tone="paused"
          metrics={systemMetrics}
        />
        <ModuleCard
          title="Platform Audit"
          description="Review platform-wide administrative, security, and organization activity across synkazo."
          icon={ClipboardList}
          to="/super-admin/audit-log"
          tone="primary"
          metrics={auditMetrics}
        />
      </div>
    </div>
  );
}
