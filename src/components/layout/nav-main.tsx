'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  minRole: UserRole;
  tourId?: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function NavMain({
  groups,
  className,
}: {
  groups: NavGroup[];
  className?: string;
}) {
  const location = useLocation();
  const { hasRole } = useSynkazoAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {groups.map((group) => {
        const visible = group.items.filter((item) => hasRole(item.minRole));
        if (visible.length === 0) return null;

        // const hasActiveItem = visible.some((item) => isActive(item.url))

        return (
          <Collapsible
            key={group.label}
            defaultOpen={true}
            className={cn('group/collapsible', className)}
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex cursor-pointer items-center select-none">
                  {group.label}
                  <ChevronDown className="ml-auto size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarMenu>
                  {visible.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                        className="data-[active=true]:before:bg-primary data-[active=true]:text-primary relative data-[active=true]:before:absolute data-[active=true]:before:top-1/2 data-[active=true]:before:left-0 data-[active=true]:before:h-6 data-[active=true]:before:w-1 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full"
                      >
                        <Link to={item.url} data-tour={item.tourId}>
                          <item.icon />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="bg-sidebar-primary text-sidebar-primary-foreground ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
