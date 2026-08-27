'use client';

import {
  Activity,
  BarChart2,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Plug,
  RefreshCw,
  Settings,
  Shield,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

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
      {
        title: 'Metrics',
        url: '/metrics',
        icon: BarChart2,
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
        title: 'Organization',
        url: '/organization',
        icon: Building2,
        minRole: 'org_admin',
      },
      {
        title: 'Invitations',
        url: '/invitations',
        icon: Mail,
        minRole: 'org_admin',
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
  { title: 'Settings', url: '/settings', icon: Settings, minRole: 'editor' },
  {
    title: 'Super Admin',
    url: '/super-admin',
    icon: Shield,
    minRole: 'super_admin',
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser } = useSynkazoAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Synkazo">
              <Link to="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <RefreshCw className="size-4" />
                </div>
                <span className="text-base font-bold tracking-tight">
                  Synkazo
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={NAV_GROUPS} />
        <NavSecondary items={ACCOUNT_ITEMS} className="mt-auto" />
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
