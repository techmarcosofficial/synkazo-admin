import { createContext, useContext, type ReactNode } from 'react';

import type { SectionTabDef } from '@/lib/sectionTabs';

export interface SectionAccessValue {
  /** The tab def resolved for the current route. */
  tab: SectionTabDef;
  /**
   * False when the viewer may read the tab but not change it. Render the
   * content and omit the Save/Edit/Delete controls entirely — do not render
   * them disabled. A disabled control means "temporarily unavailable" (the form
   * is pristine, a request is in flight), which is a different thing and would
   * read as a bug the user could fix.
   */
  canEdit: boolean;
  /** Short explanation shown in place of the Save control. '' when canEdit. */
  readOnlyNote: string;
}

const SectionAccessContext = createContext<SectionAccessValue | null>(null);

// Tab components are route elements rendered through <Outlet />, so the layout
// cannot hand them props. useOutletContext would not survive the second
// <Outlet /> at the billing level, nor reach deep children such as the member
// row action cells, so this follows ProjectDetailProvider and shares it via
// context instead.
export function SectionAccessProvider({
  value,
  children,
}: {
  value: SectionAccessValue;
  children: ReactNode;
}) {
  return (
    <SectionAccessContext.Provider value={value}>
      {children}
    </SectionAccessContext.Provider>
  );
}

export function useSectionAccess(): SectionAccessValue {
  const ctx = useContext(SectionAccessContext);
  if (!ctx)
    throw new Error('useSectionAccess must be used within SectionTabsLayout');
  return ctx;
}
