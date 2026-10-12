import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import { NavUser } from './nav-user';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { findSuperAdminNavItem } from '@/lib/superAdminNav';
import type { WorkspaceKind } from '@/lib/workspace';

const TenantHeaderTools = lazy(() => import('./tenant-header-tools'));
const GlobalSearch = lazy(() => import('./global-search'));

export default function SiteHeader({ kind }: { kind: WorkspaceKind }) {
  const location = useLocation();
  const platform = kind === 'platform';
  const title =
    location.pathname === '/super-admin/profile'
      ? 'Profile'
      : (findSuperAdminNavItem(location.pathname)?.item.title ??
        'Platform admin');

  return (
    <header className="bg-card sticky top-0 z-40 flex h-(--app-shell-header-height) items-center border-b px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <SidebarTrigger className="h-9 w-9 rounded-3xl" />
        {platform ? (
          <span className="truncate text-sm font-medium">{title}</span>
        ) : (
          <div className="max-w-xs flex-1 sm:max-w-sm">
            <Suspense fallback={null}>
              <GlobalSearch />
            </Suspense>
          </div>
        )}
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2 sm:ml-6">
        {!platform && (
          <Suspense fallback={null}>
            <TenantHeaderTools />
          </Suspense>
        )}
        <Separator
          orientation="vertical"
          className="h-6 data-vertical:self-center"
        />
        <NavUser
          variant="avatar"
          settingsPath={platform ? '/super-admin/profile' : '/settings'}
        />
      </div>
    </header>
  );
}
