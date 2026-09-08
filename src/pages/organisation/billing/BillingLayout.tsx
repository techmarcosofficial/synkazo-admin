import { Navigate, NavLink, Outlet } from 'react-router-dom';

import BillingSectionShell from './BillingSectionShell';

import { Card } from '@/components/ui/card';
import { useSectionTabs } from '@/hooks/useSectionTabs';
import { SectionAccessProvider } from '@/lib/sectionAccess';
import { BILLING_SECTION, type SectionTabDef } from '@/lib/sectionTabs';
import { cn } from '@/lib/utils';

function BillingNavList({
  tabs,
  orientation,
}: {
  tabs: SectionTabDef[];
  orientation: 'vertical' | 'horizontal';
}) {
  const vertical = orientation === 'vertical';

  return (
    <ul
      className={cn(
        'flex gap-1',
        vertical ? 'flex-col' : 'min-w-max items-center',
      )}
    >
      {tabs.map((tab) => (
        <li key={tab.id}>
          <NavLink
            to={`${BILLING_SECTION.basePath}/${tab.id}`}
            className={({ isActive }) =>
              cn(
                'relative flex items-center rounded-3xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
                isActive
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                // Same active marker the main sidebar uses (see nav-main), so a
                // selected item reads the same way everywhere in the app. Only
                // in the rail — a left bar means nothing on a horizontal row.
                vertical &&
                  isActive &&
                  'before:bg-primary before:absolute before:top-1/2 before:left-0 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full',
              )
            }
          >
            {tab.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * Billing's own navigation, one level below the Organization tabs.
 *
 * These five are sub-views of a single area rather than peers of General or
 * Members, so they are deliberately not drawn as a second underlined tab row —
 * two stacked strips would read as competing hierarchies. On large screens they
 * become a rail beside the content; below `lg` the rail would take the width the
 * tables need, so it collapses to a horizontally scrollable row above the
 * content. The Organization tabs stay visible either way.
 */
export default function BillingLayout() {
  const { tabs, active, fallbackPath, access } =
    useSectionTabs(BILLING_SECTION);

  if (!active || !access) return <Navigate to={fallbackPath} replace />;

  return (
    <BillingSectionShell>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        <Card size="sm" className="gap-0 p-2 lg:hidden">
          {/* Card clips its own overflow, so the scroll lives on the nav. */}
          <nav aria-label="Billing sections" className="overflow-x-auto">
            <BillingNavList tabs={tabs} orientation="horizontal" />
          </nav>
        </Card>

        {/* Sticks below the Organization header once the page scrolls, using the
            height StickyDetailHeader publishes — the header's own height changes
            with its content, so this cannot be a fixed offset. */}
        <Card
          size="sm"
          className="top-[calc(var(--detail-sticky-top)+var(--detail-header-height)+(--spacing(4)))] hidden shrink-0 gap-0 p-2 lg:sticky lg:block lg:w-56"
        >
          <nav aria-label="Billing sections">
            <BillingNavList tabs={tabs} orientation="vertical" />
          </nav>
        </Card>

        {/* min-w-0 so a wide table scrolls inside its own container rather than
            stretching the row and pushing the page sideways. */}
        <div className="min-w-0 flex-1">
          <SectionAccessProvider value={access}>
            <Outlet />
          </SectionAccessProvider>
        </div>
      </div>
    </BillingSectionShell>
  );
}
