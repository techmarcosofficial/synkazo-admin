import { Navigate, Outlet } from 'react-router-dom';

import SectionTabStrip from './SectionTabStrip';

import PageHeader from '@/components/shared/PageHeader';
import { useSectionTabs } from '@/hooks/useSectionTabs';
import { SectionAccessProvider } from '@/lib/sectionAccess';
import type { SectionDef } from '@/lib/sectionTabs';

/**
 * Plain section workspace: page header, tab strip, routed content. Used by
 * Settings, whose tabs are all personal and need no surrounding context.
 *
 * Organization uses OrganizationLayout instead — a richer detail-style header —
 * and Billing uses BillingLayout. All three share useSectionTabs, so the role
 * rule is stated once regardless of how each one is drawn.
 */
export default function SectionTabsLayout({
  section,
}: {
  section: SectionDef;
}) {
  const { tabs, active, fallbackPath, access } = useSectionTabs(section);

  if (!active || !access) return <Navigate to={fallbackPath} replace />;

  return (
    <div className="animate-fade-in-up flex flex-col gap-6">
      <PageHeader
        backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
        title={section.title}
        description={section.description}
      />

      <SectionTabStrip
        tabs={tabs}
        activeId={active.id}
        basePath={section.basePath}
      />

      <SectionAccessProvider value={access}>
        <Outlet />
      </SectionAccessProvider>
    </div>
  );
}
