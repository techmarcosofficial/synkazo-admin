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

import { SynkazoWordmark } from '@/components/branding/SynkazoMark';
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
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
