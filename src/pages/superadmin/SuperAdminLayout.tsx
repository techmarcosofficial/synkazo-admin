import { Component, type ReactNode } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import GlobalLoader, { PageLoader } from '@/components/shared/GlobalLoader';
import { SynkazoWordmark } from '@/components/branding/SynkazoMark';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { findSuperAdminNavItem, SUPER_ADMIN_NAV } from '@/lib/superAdminNav';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

// Class component because React error boundaries still require it. Keeps the
// blast radius of a failed nested page inside the workspace shell rather than
// blanking the whole document.
class SuperAdminErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('SuperAdmin page crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="text-lg font-semibold text-red-900">
            This platform admin page failed to render
          </div>
          <p className="text-sm text-red-800">
            {this.state.error.message ||
              'An unexpected error occurred. Reload the page or return to the workspace overview.'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link to="/super-admin/overview">Back to overview</Link>
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SuperAdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Platform admin">
              <Link to="/super-admin/overview">
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
        <NavMain groups={SUPER_ADMIN_NAV} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

function SuperAdminHeader() {
  const location = useLocation();
  const match = findSuperAdminNavItem(location.pathname);
  const title = match?.item.title ?? 'Platform admin';

  return (
    <header className="bg-card sticky top-0 z-40 flex h-(--app-shell-header-height) items-center border-b px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <SidebarTrigger className="h-9 w-9 rounded-3xl" />
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-2 sm:ml-6">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" aria-hidden />
            Return to workspace
          </Link>
        </Button>
        <Separator
          orientation="vertical"
          className="h-6 data-vertical:self-center"
        />
        <NavUser variant="avatar" />
      </div>
    </header>
  );
}

export default function SuperAdminLayout() {
  const { currentUser, isLoading } = useSynkazoAuth();

  if (isLoading) return <GlobalLoader />;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset className="[--app-shell-header-height:--spacing(16)]">
        <SuperAdminHeader />

        {/* Recognisable visual context (SA-107) so an operator never confuses a
            platform action with a tenant action. Distinct color, distinct copy. */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 sm:px-6">
          <div className="container mx-auto flex items-center gap-2 text-xs text-amber-900">
            <Shield className="size-3.5 shrink-0" aria-hidden />
            <span>
              You are operating as a Synkazo platform admin. Changes here affect
              every organisation. Return to your own workspace when finished.
            </span>
          </div>
        </div>

        <main className="container mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <SuperAdminErrorBoundary>
            <PageSuspense>
              <Outlet />
            </PageSuspense>
          </SuperAdminErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PageSuspense({ children }: { children: ReactNode }) {
  // Router-level route splitting is not in use in this app, so no real
  // Suspense boundary is needed today. The wrapper keeps a single place to
  // add one later without touching every SuperAdmin page.
  return <>{children}</>;
}

// Exposed so tests can render just the loading state without the sidebar.
export { PageLoader };
