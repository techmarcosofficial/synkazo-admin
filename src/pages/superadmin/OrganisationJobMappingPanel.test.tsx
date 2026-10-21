import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrganisationJobMappingPanel from './OrganisationJobMappingPanel';

import { useFieldMappingDraftStore } from '@/features/jobs/store/useFieldMappingDraftStore';
import type { SuperAdminJobDetail, SuperAdminProjectDetail } from '@/types/superAdmin';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  update: vi.fn(),
  sample: vi.fn(),
}));

vi.mock('@/api/superAdminOperations', () => ({
  superAdminOperationsApi: { getJobFilterSample: mocks.sample },
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ currentUser: { id: 'operator-1' } }),
}));
vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({ state: 'expanded' }),
}));
vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminDiscoveredFieldsQuery: () => ({
    data: [{ name: 'id', label: 'ID', type: 'string' }, { name: 'name', label: 'Name', type: 'string' }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useReplaceSuperAdminJobMappingsMutation: () => ({ mutateAsync: mocks.replace }),
  useUpdateSuperAdminJobMutation: () => ({ mutateAsync: mocks.update }),
}));
vi.mock('@/components/fieldmapping/FieldMappingCanvas', () => ({
  default: ({ onMappingsChange }: { onMappingsChange: (rows: unknown[]) => void }) => (
    <button onClick={() => onMappingsChange([
      { sourceField: 'id', destField: 'id', matchDestKey: 'id' },
      { sourceField: 'name', destField: 'name' },
    ])}>Edit mappings</button>
  ),
  IconLegend: () => null,
}));
vi.mock('@/components/fieldmapping/DefaultValuesDialog', () => ({ default: () => null }));
vi.mock('@/components/fieldmapping/JobFiltersDialog', () => ({
  default: ({ onSourceChange, onPreviewSource }: {
    onSourceChange: (conditions: unknown[], logic: 'AND' | 'OR') => void;
    onPreviewSource: () => void;
  }) => <>
    <button onClick={() => onSourceChange([{ field: 'id', operator: 'equals', value: 'skip-me' }], 'AND')}>Edit filters</button>
    <button onClick={onPreviewSource}>Preview filters</button>
  </>,
}));
vi.mock('@/components/fieldmapping/CrossObjectPropertiesDialog', () => ({ default: () => null }));

const project = {
  id: 'project-1',
  sourcePlatformId: 'hubspot',
  destPlatformId: 'salesforce',
} as SuperAdminProjectDetail;
const job = {
  id: 'job-1',
  syncDirection: 'one_way',
  sourceObject: 'contacts',
  destObject: 'contacts',
  fieldMappings: [],
  excludeConditions: [],
  excludeConditionLogic: 'AND',
  destinationSkipConditions: [],
  defaultValues: null,
  isEnabled: false,
} as unknown as SuperAdminJobDetail;

describe('selected-organisation Field Mapping workspace', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.update.mockReset();
    mocks.sample.mockReset();
    useFieldMappingDraftStore.setState({ drafts: {} });
  });

  it('keeps edits in a scoped local draft until Save and restores saved state on Discard', async () => {
    mocks.replace.mockResolvedValue([
      { id: 'one', sourceField: 'id', destField: 'id', isMatchField: true, updatePolicy: 'always' },
      { id: 'two', sourceField: 'name', destField: 'name', isMatchField: false, updatePolicy: 'always' },
    ]);
    render(<OrganisationJobMappingPanel organisationId="org-1" project={project} job={job} />);

    expect(screen.getByText('Field Mappings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Job Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Default Values' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit mappings' }));
    expect(screen.getByText('Unsaved draft')).toBeInTheDocument();
    expect(useFieldMappingDraftStore.getState().hasDraft('super-admin:operator-1:org-1:project-1:job-1')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByText('Unsaved draft')).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit mappings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
    expect(mocks.replace.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceField: 'id', destField: 'id', isMatchField: true }),
    ]));
    await waitFor(() => expect(screen.queryByText('Unsaved draft')).not.toBeInTheDocument());
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('saves a filter-only draft through the scoped job update without replacing mappings', async () => {
    mocks.update.mockResolvedValue({ ...job, excludeConditions: [{ field: 'id', operator: 'equals', value: 'skip-me' }] });
    render(<OrganisationJobMappingPanel organisationId="org-1" project={project} job={job} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
    expect(screen.getByText('Unsaved draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      excludeConditions: [{ field: 'id', operator: 'equals', value: 'skip-me' }],
      excludeConditionLogic: 'AND',
    })));
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('loads a filter preview from the selected organisation job', async () => {
    mocks.sample.mockResolvedValue({ id: 'skip-me' });
    render(<OrganisationJobMappingPanel organisationId="org-1" project={project} job={job} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview filters' }));

    await waitFor(() => expect(mocks.sample).toHaveBeenCalledWith('org-1', 'project-1', 'job-1'));
  });
});
