import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ZeroStateIntegrationValueCard from './ZeroStateIntegrationValueCard';

describe('ZeroStateIntegrationValueCard', () => {
  afterEach(cleanup);

  it('explains the integration outcome, user controls, and sample test', () => {
    render(<ZeroStateIntegrationValueCard />);

    expect(
      screen.getByRole('region', { name: 'What your integration will do' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose your source')).toBeInTheDocument();
    expect(screen.getByText('ServiceTitan')).toBeInTheDocument();
    expect(screen.getByText('Dataforma')).toBeInTheDocument();
    expect(screen.getByText('Texada')).toBeInTheDocument();
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Synkazo applies your rules')).toBeInTheDocument();
    expect(screen.getByText('Choose records')).toBeInTheDocument();
    expect(screen.getByText('Match fields')).toBeInTheDocument();
    expect(screen.getByText('Apply sync rules')).toBeInTheDocument();
    expect(screen.getByText('records')).toBeInTheDocument();
    expect(screen.getByText('updates')).toBeInTheDocument();
    expect(screen.getByText('You control what syncs')).toBeInTheDocument();
    expect(screen.getByText('Match existing records')).toBeInTheDocument();
    expect(screen.getByText('Test before automating')).toBeInTheDocument();
    expect(
      screen.getByText(/review a small sample before the full sync/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('does not render a duplicate primary create button', () => {
    render(<ZeroStateIntegrationValueCard />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
