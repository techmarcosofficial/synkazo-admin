import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';

import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PageLoader } from '@/components/shared/GlobalLoader';
import { useHeaderStore } from '@/stores/useHeaderStore';
import type { WorkspaceKind } from '@/lib/workspace';
import { WorkspaceProvider } from '@/lib/workspace-context';

import { AppSidebar } from './app-sidebar';
import SiteHeader from './site-header';

class WorkspacePageBoundary extends Component<
  { children: ReactNode; home: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Workspace page crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-4 rounded-4xl border p-4">
        <HeadingPair
          tone="danger"
          title="This page failed to render"
          subtitle={this.state.error.message || 'An unexpected error occurred.'}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button asChild variant="outline">
            <Link to={this.props.home}>Back to overview</Link>
          </Button>
        </div>
      </div>
    );
  }
}

/** One shell structure; workspace scope selects navigation and header features. */
export default function WorkspaceShell({
  kind,
  children,
}: {
  kind: WorkspaceKind;
  children?: ReactNode;
}) {
  const clearActions = useHeaderStore((state) => state.clearActions);
  const location = useLocation();
  useEffect(() => clearActions, [clearActions, kind]);

  return (
    <WorkspaceProvider kind={kind}>
      <SidebarProvider
        data-admin-shell={kind === 'platform' ? 'platform' : 'workspace'}
      >
        {children}
        <AppSidebar kind={kind} />
        <SidebarInset className="max-w-full min-w-0 overflow-x-clip [--app-shell-header-height:--spacing(16)]">
          <SiteHeader kind={kind} />
          {/* {kind === 'platform' && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6">
              <div className="container mx-auto flex items-center gap-2 text-xs text-amber-900">
                <Shield className="size-3.5 shrink-0" aria-hidden />
                <span>
                  You are operating as a Synkazo platform admin. Changes here
                  may affect every organisation.
                </span>
              </div>
            </div>
          )} */}
          <main className="container mx-auto flex w-full max-w-full min-w-0 flex-1 flex-col gap-4 px-5 py-4 sm:px-7 sm:py-8 lg:px-10 xl:px-18">
            <WorkspacePageBoundary
              key={location.pathname}
              home={
                kind === 'platform' ? '/super-admin/overview' : '/dashboard'
              }
            >
              <Suspense fallback={<PageLoader label="Loading page" />}>
                <Outlet />
              </Suspense>
            </WorkspacePageBoundary>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
