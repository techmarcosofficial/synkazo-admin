import { Navigate, Outlet } from 'react-router-dom';

import OrganizationHeader from './OrganizationHeader';

import SectionTabStrip from '@/components/layout/SectionTabStrip';
import StickyDetailHeader from '@/components/shared/StickyDetailHeader';
import { Card } from '@/components/ui/card';
import { useSectionTabs } from '@/hooks/useSectionTabs';
import { SectionAccessProvider } from '@/lib/sectionAccess';
import { ORGANIZATION_SECTION } from '@/lib/sectionTabs';

/**
 * The Organization workspace, composed like the refined Project and Sync Job
 * detail pages: a back tongue above one header card that carries identity,
 * status and the tab strip together, both rows sticky as the page scrolls.
 *
 * The tab strip lives inside the card so the tenant's context stays attached to
 * the navigation rather than floating above it, and because the card never
 * unmounts, moving between tabs — including through Billing's own
 * sub-navigation one level deeper — leaves the header and active tab in place.
 *
 * Note there is deliberately no `animate-fade-in-up` wrapper here: its
 * keyframes leave a transform on the element even at rest, which would make it
 * a containing block and break the two sticky rows inside. ProjectDetailPage
 * omits it for the same reason, using it only in its loading branch.
 */
export default function OrganizationLayout() {
  const { tabs, active, fallbackPath, access } = useSectionTabs(
    ORGANIZATION_SECTION,
    'That area is only available to organization admins.',
  );

  if (!active || !access) return <Navigate to={fallbackPath} replace />;

  return (
    <StickyDetailHeader
      backLabel="Back to Dashboard"
      backTo="/dashboard"
      header={
        <Card className="gap-0 space-y-3 overflow-hidden py-0">
          <OrganizationHeader />
          <div className="px-5">
            <SectionTabStrip
              tabs={tabs}
              activeId={active.id}
              basePath={ORGANIZATION_SECTION.basePath}
            />
          </div>
        </Card>
      }
    >
      <SectionAccessProvider value={access}>
        <Outlet />
      </SectionAccessProvider>
    </StickyDetailHeader>
  );
}
