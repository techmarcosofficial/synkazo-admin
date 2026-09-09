import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useProjectSettingsSections } from './useProjectSettingsSections';

afterEach(cleanup);

function Probe() {
  const location = useLocation();
  const { activeSection, sections } = useProjectSettingsSections({
    hasBothConnections: true,
    hasJobs: false,
  });

  return (
    <>
      <output data-testid="active-section">{activeSection.id}</output>
      <output data-testid="schedule-locked">
        {String(sections.find((section) => section.id === 'schedule')?.locked)}
      </output>
      <output data-testid="search">{location.search}</output>
    </>
  );
}

describe('project settings section navigation', () => {
  it('canonicalizes a direct Settings URL to General', async () => {
    render(
      <MemoryRouter
        initialEntries={['/projects/project-1?tab=settings&checkout=success']}
      >
        <Probe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('active-section')).toHaveTextContent('general');
    await waitFor(() => {
      const params = new URLSearchParams(
        screen.getByTestId('search').textContent ?? '',
      );
      expect(params.get('tab')).toBe('settings');
      expect(params.get('section')).toBe('general');
      expect(params.get('checkout')).toBe('success');
    });
  });

  it('falls back from an invalid section and exposes prerequisite state', async () => {
    render(
      <MemoryRouter
        initialEntries={['/projects/project-1?tab=settings&section=unknown']}
      >
        <Probe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('active-section')).toHaveTextContent('general');
    expect(screen.getByTestId('schedule-locked')).toHaveTextContent('true');
    await waitFor(() => {
      expect(screen.getByTestId('search')).toHaveTextContent('section=general');
    });
  });
});
