'use client';

import {
  Building2,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

import { SynkazoMark } from '@/components/branding/SynkazoMark';
import { NavMain, type NavGroup } from '@/components/layout/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { SETTINGS_SECTION, sectionMinRole } from '@/lib/sectionTabs';
import { SUPER_ADMIN_NAV } from '@/lib/superAdminNav';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { WorkspaceKind } from '@/lib/workspace';
import { useMyOrgQuery } from '@/queries/useOrganisations';

const ORGANIZATION_URL = '/organization';

const TENANT_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        minRole: 'editor',
      },
      {
        title: 'Projects',
        url: '/projects',
        icon: FolderOpen,
        minRole: 'editor',
        tourId: 'projects',
      },
      {
        title: SETTINGS_SECTION.title,
        url: SETTINGS_SECTION.basePath,
        icon: Settings,
        minRole: sectionMinRole(SETTINGS_SECTION),
      },
    ],
  },
  {
    label: 'Administrator',
    items: [
      {
        // Replaced with the organization's own name at render time.
        title: 'Organization',
        url: ORGANIZATION_URL,
        icon: Building2,
        minRole: 'org_admin',
      },
      {
        title: 'Audit log',
        url: '/audit-logs',
        icon: ClipboardList,
        minRole: 'org_admin',
      },
    ],
  },
];

export function AppSidebar({
  kind,
  ...props
}: React.ComponentProps<typeof Sidebar> & { kind: WorkspaceKind }) {
  const platform = kind === 'platform';
  const { hasRole } = useSynkazoAuth();
  const { data: org } = useMyOrgQuery({
    enabled: !platform && hasRole('org_admin'),
  });
  const orgName = org?.name?.trim();

  // The organization item reads as the org's name ("Acme HVAC"), falling
  // back to "Organization" while it loads.
  const tenantNav = React.useMemo<NavGroup[]>(
    () =>
      orgName
        ? TENANT_NAV.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.url === ORGANIZATION_URL
                ? { ...item, title: orgName }
                : item,
            ),
          }))
        : TENANT_NAV,
    [orgName],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={platform ? 'Platform Admin' : 'Synkazo'}
              className="h-12 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! [&_svg]:size-auto"
            >
              <Link
                to={platform ? '/super-admin/overview' : '/dashboard'}
                className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <SynkazoMark
                  variant="badge"
                  className="size-8! shrink-0 rounded-lg shadow-xs drop-shadow-[0_2px_8px_rgba(255,107,57,0.25)]"
                />
                <span className="text-foreground text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                  synkazo
                </span>
                {platform && (
                  <Badge
                    variant="secondary"
                    tone="warning"
                    size="xs"
                    className="text-[10px] font-semibold tracking-wider uppercase group-data-[collapsible=icon]:hidden"
                  >
                    Admin
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={platform ? SUPER_ADMIN_NAV : tenantNav} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
