import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AssociationRuleFormDialog, {
  sourceFieldOptionLabel,
} from './AssociationRuleFormDialog';

import { associationsApi } from '@/api/associations';
import type { AssociationRule } from '@/api/associations';

vi.mock('@/api/associations', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/associations')>(
      '@/api/associations',
    );
  return {
    ...actual,
    associationsApi: {
      ...actual.associationsApi,
      getProjectObjects: vi.fn(),
      getObjectFields: vi.fn(),
      getAssociationFields: vi.fn(),
      getOwnerFields: vi.fn(),
      getAssociationTypes: vi.fn(),
      createRule: vi.fn(),
      updateRule: vi.fn(),
    },
  };
});

const getProjectObjects = vi.mocked(associationsApi.getProjectObjects);
const getObjectFields = vi.mocked(associationsApi.getAssociationFields);

const rule: AssociationRule = {
  id: 'rule-1',
  projectId: 'project-1',
  name: 'Contact to company',
  sourceObject: 'Customer',
  sourceMatchField: 'company_domain',
  targetObject: 'Job',
  targetMatchField: 'domain',
  assocTypeId: 1,
  assocCategory: 'HUBSPOT_DEFINED',
  assocLabel: 'Primary company',
  conditions: [],
  conditionLogic: 'AND',
};

describe('AssociationRuleFormDialog', () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
    Element.prototype.scrollIntoView = () => undefined;
    getProjectObjects.mockResolvedValue([
      { sourceObject: 'Customer', hsObjectType: 'contacts' },
      { sourceObject: 'Job', hsObjectType: 'deals' },
    ] as never);
    getObjectFields.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses the shared dialog and groups record matching into one meaningful step', async () => {
    render(
      <AssociationRuleFormDialog
        mode="create"
        projectId="project-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Source record')).toBeInTheDocument();
    expect(screen.getByText('Target record')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Match records')).toBeInTheDocument();
    expect(screen.getByText('Rule details')).toBeInTheDocument();

    expect(screen.getByRole('dialog')).toHaveAttribute(
      'data-slot',
      'dialog-content',
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'lg');
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();
  });

  it('shows configured combined and imported source fields with labels', async () => {
    getObjectFields.mockResolvedValue([
      {
        field: '__combine__:one',
        label: 'Combined owner name',
        isArray: false,
      },
      {
        field: '__cross_object__:one',
        label: 'Customer · Email',
        isArray: false,
      },
    ]);
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="create"
        projectId="project-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await screen.findByText('Source record');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: /Customer/i }));
    expect(getObjectFields).toHaveBeenCalledWith('project-1', 'Customer');
    await user.click(
      await screen.findAllByRole('combobox').then((items) => items[1]),
    );
    expect(
      screen.getByRole('option', { name: 'Combined owner name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Customer · Email' }),
    ).toBeInTheDocument();
  });

  it('saves the original generated source key after showing its friendly label', async () => {
    getObjectFields.mockResolvedValue([
      {
        field: '__cross_object__:uuid-123',
        label: 'Technician Email',
        isArray: false,
      },
    ]);
    vi.mocked(associationsApi.getOwnerFields).mockResolvedValue([
      { field: 'email', label: 'Email', isArray: false },
    ]);
    vi.mocked(associationsApi.createRule).mockResolvedValue(rule);
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="create"
        projectId="project-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await screen.findByText('Source record');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: /Customer/i }));
    await user.click((await screen.findAllByRole('combobox'))[1]);
    await user.click(screen.getByRole('option', { name: 'Technician Email' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(
      screen.getByRole('option', { name: 'Record Owner (HubSpot)' }),
    );
    await user.click((await screen.findAllByRole('combobox'))[3]);
    await user.click(screen.getByRole('option', { name: 'Email' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Create Rule' }));
    await waitFor(() =>
      expect(associationsApi.createRule).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          sourceMatchField: '__cross_object__:uuid-123',
        }),
      ),
    );
  });

  it('loads owner fields and saves their API identifier without an association type', async () => {
    getObjectFields.mockResolvedValue([
      { field: 'ownerName', label: 'Owner name', isArray: false },
    ]);
    vi.mocked(associationsApi.getOwnerFields).mockResolvedValue([
      { field: 'email', label: 'Email', isArray: false },
      { field: 'firstName', label: 'First name', isArray: false },
    ]);
    vi.mocked(associationsApi.createRule).mockResolvedValue(rule);
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="create"
        projectId="project-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await screen.findByText('Source record');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: /Customer/i }));
    await user.click((await screen.findAllByRole('combobox'))[1]);
    await user.click(screen.getByRole('option', { name: 'Owner name' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(
      screen.getByRole('option', { name: 'Record Owner (HubSpot)' }),
    );
    expect(associationsApi.getOwnerFields).toHaveBeenCalledWith('project-1');
    await user.click((await screen.findAllByRole('combobox'))[3]);
    await user.click(screen.getByRole('option', { name: 'First name' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.queryByText('HubSpot association type'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Rule' }));
    await waitFor(() =>
      expect(associationsApi.createRule).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          targetObject: 'record_owner',
          targetMatchField: 'firstName',
          sourceMatchField: 'ownerName',
          assocTypeId: 0,
        }),
      ),
    );
  });

  it('uses the same stepped dialog for editing instead of a drawer', async () => {
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={rule}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Edit association rule' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'lg');
    expect(screen.getByDisplayValue('Contact to company')).toBeInTheDocument();
    expect(screen.getByText('Primary company')).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();
  });
});

describe('association source option labels', () => {
  it('preserves ordinary labels and hides generated keys when metadata has no label', () => {
    expect(
      sourceFieldOptionLabel(
        { field: 'email', label: 'Email', isArray: false },
        0,
      ),
    ).toBe('Email');
    expect(
      sourceFieldOptionLabel(
        { field: '__combine__:one', label: '__combine__:one', isArray: false },
        1,
      ),
    ).toBe('Combined property 2');
    expect(
      sourceFieldOptionLabel(
        { field: '__cross_object__:uuid-123', isArray: false },
        2,
      ),
    ).toBe('Imported property 3');
  });
});
