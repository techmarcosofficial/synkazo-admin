import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useProjectDetailTabs } from './useProjectDetailTabs';

afterEach(cleanup);

function Probe({
  hasBothConnections = true,
  hasJobs = true,
}: {
  hasBothConnections?: boolean;
  hasJobs?: boolean;
}) {
  const location = useLocation();
  const { activeTab, tabs } = useProjectDetailTabs({
    loading: false,
    hasBothConnections,
    hasJobs,
  });

  return (
    <>
      <output data-testid="active-tab">{activeTab}</output>
      <output data-testid="tabs">{tabs.map((tab) => tab.id).join(',')}</output>
      <output data-testid="search">{location.search}</output>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe('project detail tab navigation', () => {
  it('shows the approved five project-level tabs', () => {
    renderAt('/projects/project-1?tab=overview');

    expect(screen.getByTestId('tabs')).toHaveTextContent(
      'overview,connections,sync-rules,activity,settings',
    );
  });

  it.each([
    ['scheduler', 'schedule'],
    ['associations', 'associations'],
    ['environment-sync', 'environments'],
  ])('redirects legacy %s links to Settings/%s', async (legacy, section) => {
    renderAt(`/projects/project-1?tab=${legacy}&checkout=success`);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('settings');
    await waitFor(() => {
      const params = new URLSearchParams(
        screen.getByTestId('search').textContent ?? '',
      );
      expect(params.get('tab')).toBe('settings');
      expect(params.get('section')).toBe(section);
      expect(params.get('checkout')).toBe('success');
    });
  });

  it('redirects a newly locked primary tab to Overview', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/project-1?tab=activity']}>
        <Probe hasBothConnections={false} hasJobs={false} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-tab')).toHaveTextContent('overview');
    });
  });
});
