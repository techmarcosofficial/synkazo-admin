'use client';

import { ChevronsUpDown, LogOut, Settings, Shield, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { roleLabel } from '@/lib/permissions';
import { useSBAuth } from '@/lib/syncbridgeAuth';
interface UserMenuProps {
  variant?: 'sidebar' | 'avatar';
}
export function NavUser({ variant = 'sidebar' }: UserMenuProps) {
  const { currentUser, logout } = useSBAuth();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { confirm } = useConfirmDialog();
  const isAvatarOnly = variant === 'avatar';
  const side = isAvatarOnly ? 'bottom' : isMobile ? 'bottom' : 'right';

  const align = isAvatarOnly ? 'end' : isMobile ? 'end' : 'start';
  if (!currentUser) return null;

  const displayName = currentUser.fullName || currentUser.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            className="hover:bg-accent rounded-3xl px-2 py-1.5"
          >
            {isAvatarOnly ? (
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground rounded-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-bold">{displayName}</h4>
                  <p className="text-xs font-light">
                    {roleLabel(currentUser.role)}
                  </p>
                </div>
              </div>
            ) : (
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {currentUser.email}
                  </span>
                </div>

                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={side}
            align={align}
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {currentUser.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {currentUser.role === 'super_admin' && (
                <DropdownMenuItem asChild>
                  <Link to="/super-admin">
                    <Shield />
                    Super Admin
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link to="/settings?section=profile">
                  <User />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                confirm({
                  variant: 'warning',
                  title: 'Sign out?',
                  description:
                    "You'll need to sign in again to access your account.",
                  confirmLabel: 'Sign Out',
                  onConfirm: () => {
                    logout();
                    navigate('/login');
                  },
                });
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
