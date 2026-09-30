import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CrossObjectPropertiesPanel from './CrossObjectPropertiesPanel';

import { connectionsApi } from '@/api/connections';
import { jobsApi } from '@/api/jobs';

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getCrossObjectPropertyOptions: vi.fn(),
    createCrossObjectProperty: vi.fn(),
  },
}));
vi.mock('@/api/connections', () => ({
  connectionsApi: { getProperties: vi.fn() },
}));

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
  vi.mocked(jobsApi.getCrossObjectPropertyOptions).mockResolvedValue({
    platformId: 'texada',
    supported: true,
    objects: [
      {
        objectType: 'customer-contacts',
        label: 'Customer Contact',
        lookupModes: ['id'],
      },
      { objectType: 'customers', label: 'Customer', lookupModes: ['id'] },
      {
        objectType: 'opportunities',
        label: 'Opportunity',
        lookupModes: ['id'],
      },
      { objectType: 'contacts', label: 'Contact', lookupModes: ['id'] },
    ],
  });
  vi.mocked(connectionsApi.getProperties).mockResolvedValue([
    { name: 'Email', label: 'Email', type: 'string' },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Texada cross-object builder', () => {
  it('offers only supported objects and requires InfluencerId for Customer Contact', async () => {
    const user = userEvent.setup();
    render(
      <CrossObjectPropertiesPanel
        projectId="project-1"
        jobId="job-1"
        platformId="texada"
        sourceObject="opportunities"
        sourceFields={[
          { key: 'InfluencerId', label: 'Influencer ID', type: 'string' },
          { key: 'customerId', label: 'Customer ID', type: 'string' },
        ]}
        properties={[]}
        onPropertiesChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Related object' }));
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Customer Contact', 'Customer', 'Opportunity', 'Contact']);
    await user.click(screen.getByRole('option', { name: 'Customer Contact' }));
    await user.click(
      screen.getByRole('combobox', { name: 'Current object field' }),
    );
    expect(
      screen.getByRole('option', { name: 'Influencer ID' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Customer ID' }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Add property' })).toBeDisabled();
  });
});
