'use client';

import {
  Activity,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Plug,
  Settings,
  Shield,
} from 'lucide-react';
import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SynkazoWordmark } from '@/components/branding/SynkazoMark';
import { NavMain, type NavGroup } from '@/components/layout/nav-main';
import {
  NavSecondary,
  type NavSecondaryItem,
} from '@/components/layout/nav-secondary';
import { NavUser } from '@/components/layout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  ORGANIZATION_SECTION,
  SETTINGS_SECTION,
  sectionMinRole,
} from '@/lib/sectionTabs';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        minRole: 'editor',
      },
    ],
  },
  {
    label: 'Projects',
    items: [
      {
        title: 'Projects',
        url: '/projects',
        icon: FolderOpen,
        minRole: 'editor',
        tourId: 'projects',
      },
    ],
  },
  {
    label: 'Synchronization',
    items: [
      {
        title: 'Live Activity',
        url: '/active-syncs',
        icon: Activity,
        minRole: 'editor',
        tourId: 'jobs',
      },
      {
        title: 'All Jobs',
        url: '/jobs',
        icon: Briefcase,
        minRole: 'editor',
      },
      {
        title: 'Scheduler',
        url: '/scheduler',
        icon: CalendarClock,
        minRole: 'editor',
      },
      {
        title: 'Connections',
        url: '/connections',
        icon: Plug,
        minRole: 'org_admin',
      },
      {
        title: 'Sync History',
        url: '/logs',
        icon: Clock,
        minRole: 'editor',
        tourId: 'logs',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        title: ORGANIZATION_SECTION.title,
        url: ORGANIZATION_SECTION.basePath,
        icon: Building2,
        // Derived, never restated — an editor reaches General and Members, so
        // the nav entry must appear for them too. Invitations and Billing are
        // hidden by the tab strip itself (see lib/sectionTabs).
        minRole: sectionMinRole(ORGANIZATION_SECTION),
      },
      {
        title: 'Audit Log',
        url: '/audit-logs',
        icon: ClipboardList,
        minRole: 'org_admin',
      },
    ],
  },
];

const ACCOUNT_ITEMS: NavSecondaryItem[] = [
  {
    title: SETTINGS_SECTION.title,
    url: SETTINGS_SECTION.basePath,
    icon: Settings,
    minRole: sectionMinRole(SETTINGS_SECTION),
  },
  {
    title: 'Super Admin',
    url: '/super-admin',
    icon: Shield,
    minRole: 'super_admin',
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser } = useSynkazoAuth();
  const location = useLocation();
  const isSuperAdminPage = location.pathname.startsWith('/super-admin');
  const accountItems = isSuperAdminPage
    ? [
        ...ACCOUNT_ITEMS,
        {
          title: 'Marketing',
          url: '/super-admin/marketing',
          icon: Megaphone,
          minRole: 'super_admin' as const,
        },
      ]
    : ACCOUNT_ITEMS;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="synkazo">
              <Link to="/dashboard">
                <SynkazoWordmark
                  className="text-foreground h-7! w-auto!"
                  tone="auto"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={NAV_GROUPS} />
        <NavSecondary items={accountItems} className="mt-auto" />
      </SidebarContent>

      {currentUser && (
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
