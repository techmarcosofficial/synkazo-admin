'use client';

import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

export interface NavSecondaryItem {
  title: string;
  url: string;
  icon: LucideIcon;
  minRole: UserRole;
}

export function NavSecondary({
  items,
  className,
}: {
  items: NavSecondaryItem[];
  className?: string;
}) {
  const location = useLocation();
  const { hasRole } = useSynkazoAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Same role gate as NavMain: an item only renders if the current user's
  // role meets its minRole. This is what actually restores RBAC for
  // Settings/Super Admin now that they're outside the dropdown.
  const visible = items.filter((item) => hasRole(item.minRole));
  if (visible.length === 0) return null;

  return (
    <SidebarGroup className={cn(className)}>
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
