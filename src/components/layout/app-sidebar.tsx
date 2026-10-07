'use client';

import {
  Building2,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

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
import {
  SETTINGS_SECTION,
  sectionMinRole,
} from '@/lib/sectionTabs';

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
        title: 'This organization',
        url: '/organization',
        icon: Building2,
        minRole: 'org_admin',
      },
      {
        title: 'Audit log',
        url: '/audit-logs',
        icon: ClipboardList,
        minRole: 'org_admin',
      },
      {
        title: 'Synkazo management',
        url: '/super-admin',
        icon: Shield,
        minRole: 'super_admin',
        openInNewTab: true,
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Synkazo"
              className="h-12 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! [&_svg]:size-auto"
            >
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center"
              >
                <SynkazoMark
                  variant="badge"
                  className="size-8! rounded-lg shadow-xs shrink-0 drop-shadow-[0_2px_8px_rgba(255,107,57,0.25)]"
                />
                <span className="text-lg font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                  synkazo
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={NAV_GROUPS} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
