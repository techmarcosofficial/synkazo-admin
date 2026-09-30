import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ZeroStateIntegrationValueCard from './ZeroStateIntegrationValueCard';

describe('ZeroStateIntegrationValueCard', () => {
  afterEach(cleanup);

  it('renders pipeline flow overview and value highlights', () => {
    render(<ZeroStateIntegrationValueCard />);

    expect(screen.getByText('Connect Field Operations ➔ HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Integration Blueprint')).toBeInTheDocument();
    expect(screen.getByText('ServiceTitan')).toBeInTheDocument();
    expect(screen.getByText('Dataforma')).toBeInTheDocument();
    expect(screen.getByText('Texada')).toBeInTheDocument();
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Synkazo Middleware')).toBeInTheDocument();

    // Visual highlights
    expect(screen.getByText('Continuous Sync')).toBeInTheDocument();
    expect(screen.getByText('Safe 5-Record Test')).toBeInTheDocument();
    expect(screen.getByText('Zero Overwrite')).toBeInTheDocument();

    // Reassurance notice (points to storyline above, no duplicate primary button)
    expect(
      screen.getByText(/follow the next step in the setup storyline above to create your project and begin/i),
    ).toBeInTheDocument();
  });

  it('does not render a duplicate primary create button', () => {
    render(<ZeroStateIntegrationValueCard />);

    expect(screen.queryByRole('button', { name: /create integration project/i })).not.toBeInTheDocument();
  });
});
