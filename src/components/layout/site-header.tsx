import { Link } from 'react-router-dom';

import GlobalSearch from './global-search';
import { NavUser } from './nav-user';
import NotificationsMenu from './NotificationsMenu';

import PlanBadge from '@/components/shared/PlanBadge';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePlanQuery } from '@/queries/useBilling';

export default function SiteHeader() {
  const { data: plan } = usePlanQuery();

  return (
    <header className="bg-card sticky top-0 z-30 flex h-16 items-center border-b px-6">
      {/* Left */}
      <div className="flex flex-1 items-center gap-4">
        <SidebarTrigger className="h-9 w-9 rounded-lg" />

        <div className="max-w-xl flex-1">
          <GlobalSearch />
        </div>
      </div>

      {/* Right */}
      <div className="ml-6 flex items-center gap-2">
        <div className="flex items-center">
          {plan && (
            <Link
              to="/settings?section=billing"
              className="hidden sm:block"
              title="Manage billing"
            >
              <PlanBadge planName={plan.planName} />
            </Link>
          )}
          <NotificationsMenu />

          <ThemeToggle />
        </div>
        <Separator
          orientation="vertical"
          className="h-6 data-vertical:self-center"
        />
        <NavUser variant="avatar" />
      </div>
    </header>
  );
}
