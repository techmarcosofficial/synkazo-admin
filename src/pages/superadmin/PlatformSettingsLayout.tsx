import { Navigate, Outlet } from 'react-router-dom';

import SettingsHeader from '@/pages/settings/SettingsHeader';
import SectionTabStrip from '@/components/layout/SectionTabStrip';
import StickyDetailHeader from '@/components/shared/StickyDetailHeader';
import { Card } from '@/components/ui/card';
import { useSectionTabs } from '@/hooks/useSectionTabs';
import { SectionAccessProvider } from '@/lib/sectionAccess';
import { SUPER_ADMIN_SETTINGS_SECTION } from '@/lib/sectionTabs';

/** Platform settings uses the same identity-card and attached tabs as tenant settings. */
export default function PlatformSettingsLayout() {
  const { tabs, active, fallbackPath, access } =
    useSectionTabs(SUPER_ADMIN_SETTINGS_SECTION);

  if (!active || !access) return <Navigate to={fallbackPath} replace />;

  return (
    <StickyDetailHeader
      backLabel="Back to Overview"
      backTo="/super-admin/overview"
      header={
        <Card className="gap-0 space-y-3 overflow-hidden py-0">
          <SettingsHeader />
          <div className="px-5">
            <SectionTabStrip
              tabs={tabs}
              activeId={active.id}
              basePath={SUPER_ADMIN_SETTINGS_SECTION.basePath}
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
