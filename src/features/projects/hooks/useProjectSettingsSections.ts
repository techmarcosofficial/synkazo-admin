import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  buildProjectSettingsSearchParams,
  DEFAULT_PROJECT_SETTINGS_SECTION,
  isProjectSettingsSectionId,
  isProjectSettingsSectionLocked,
  legacyProjectSettingsSectionForTab,
  PROJECT_SETTINGS_SECTION_DEFS,
  projectSettingsSectionLockReason,
  resolveProjectSettingsSection,
  type ProjectSettingsSectionId,
} from '@/features/projects/lib/projectSettingsSections';

export interface ProjectSettingsSectionView {
  id: ProjectSettingsSectionId;
  label: string;
  description: string;
  locked: boolean;
  lockReason: string;
}

interface UseProjectSettingsSectionsInput {
  hasBothConnections: boolean;
  hasJobs: boolean;
}

export function useProjectSettingsSections(
  input: UseProjectSettingsSectionsInput,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const requestedSection = searchParams.get('section');
  const legacySection = legacyProjectSettingsSectionForTab(requestedTab);
  const activeSectionId =
    legacySection ?? resolveProjectSettingsSection(requestedSection);

  const sections: ProjectSettingsSectionView[] =
    PROJECT_SETTINGS_SECTION_DEFS.map((section) => ({
      ...section,
      locked: isProjectSettingsSectionLocked(
        section,
        input.hasBothConnections,
        input.hasJobs,
      ),
      lockReason: projectSettingsSectionLockReason(
        section,
        input.hasBothConnections,
        input.hasJobs,
      ),
    }));

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  const handleSectionChange = (
    id: ProjectSettingsSectionId,
    options?: { replace?: boolean },
  ) => {
    setSearchParams(buildProjectSettingsSearchParams(searchParams, id), {
      replace: options?.replace,
    });
  };

  const sectionHref = (id: ProjectSettingsSectionId) =>
    `?${buildProjectSettingsSearchParams(searchParams, id).toString()}`;

  // Canonicalize direct Settings URLs and invalid section values. Legacy tabs
  // are canonicalized by useProjectDetailTabs so both hooks never compete to
  // update the same URL during the same render.
  useEffect(() => {
    if (
      requestedTab !== 'settings' ||
      isProjectSettingsSectionId(requestedSection)
    )
      return;
    setSearchParams(
      buildProjectSettingsSearchParams(
        searchParams,
        DEFAULT_PROJECT_SETTINGS_SECTION,
      ),
      { replace: true },
    );
  }, [requestedTab, requestedSection, searchParams, setSearchParams]);

  return {
    activeSection,
    sections,
    handleSectionChange,
    sectionHref,
  };
}
