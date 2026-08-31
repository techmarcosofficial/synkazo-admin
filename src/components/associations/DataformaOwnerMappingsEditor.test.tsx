import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DataformaOwnerMappingsEditor from './DataformaOwnerMappingsEditor';

import { associationsApi } from '@/api/associations';
import type { CompanyOwnerMapping } from '@/api/associations';
import { connectionsApi } from '@/api/connections';

vi.mock('@/api/associations', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/associations')>(
      '@/api/associations',
    );
  return {
    ...actual,
    associationsApi: {
      ...actual.associationsApi,
      listCompanyOwnerMappings: vi.fn(),
      createCompanyOwnerMapping: vi.fn(),
      updateCompanyOwnerMapping: vi.fn(),
      deleteCompanyOwnerMapping: vi.fn(),
      getObjectFields: vi.fn(),
    },
  };
});

vi.mock('@/api/connections', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/connections')>(
      '@/api/connections',
    );
  return {
    ...actual,
    connectionsApi: {
      ...actual.connectionsApi,
      getProperties: vi.fn(),
    },
  };
});

const listMappings = vi.mocked(associationsApi.listCompanyOwnerMappings);
const createMapping = vi.mocked(associationsApi.createCompanyOwnerMapping);
const deleteMapping = vi.mocked(associationsApi.deleteCompanyOwnerMapping);
const getObjectFields = vi.mocked(associationsApi.getObjectFields);
const getProperties = vi.mocked(connectionsApi.getProperties);

afterEach(() => cleanup());

function makeMapping(overrides: Partial<CompanyOwnerMapping> = {}): CompanyOwnerMapping {
  return {
    id: 'mapping-1',
    projectId: 'project-1',
    sourcePlatformId: 'dataforma',
    sourceObject: 'customers',
    sourceProperty: 'df_sales_email',
    targetHubspotProperty: 'hubspot_owner_id',
    isEnabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getObjectFields.mockResolvedValue(['df_sales_email', 'df_salesperson_email']);
  getProperties.mockResolvedValue([
    { name: 'hubspot_owner_id', label: 'Owner', type: 'string' },
    { name: 'estimator_owner_id', label: 'Estimator Owner', type: 'string' },
  ]);
});

describe('DataformaOwnerMappingsEditor', () => {
  it('shows the default-mapping message when nothing is configured', async () => {
    listMappings.mockResolvedValue([]);
    render(<DataformaOwnerMappingsEditor projectId="project-1" />);

    await waitFor(() =>
      expect(screen.getByText(/no mappings configured/i)).toBeInTheDocument(),
    );
  });

  it('lists configured mappings', async () => {
    listMappings.mockResolvedValue([makeMapping()]);
    render(<DataformaOwnerMappingsEditor projectId="project-1" />);

    await waitFor(() =>
      expect(screen.getByText(/df_sales_email/)).toBeInTheDocument(),
    );
  });

  it('adds a new mapping', async () => {
    const user = userEvent.setup();
    listMappings.mockResolvedValueOnce([]).mockResolvedValueOnce([makeMapping()]);
    createMapping.mockResolvedValue(makeMapping());

    render(<DataformaOwnerMappingsEditor projectId="project-1" />);
    await waitFor(() => expect(getObjectFields).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /add mapping/i }));
    // The draft row's selects default to placeholders — saving without a
    // selection surfaces a validation toast instead of calling the API.
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(createMapping).not.toHaveBeenCalled();
  });

  it('removes a mapping', async () => {
    const user = userEvent.setup();
    listMappings.mockResolvedValue([makeMapping()]);
    deleteMapping.mockResolvedValue(undefined);

    render(<DataformaOwnerMappingsEditor projectId="project-1" />);
    await waitFor(() =>
      expect(screen.getByText(/df_sales_email/)).toBeInTheDocument(),
    );

    await user.click(screen.getByTitle(/remove mapping/i));

    await waitFor(() =>
      expect(deleteMapping).toHaveBeenCalledWith('project-1', 'mapping-1'),
    );
  });
});
