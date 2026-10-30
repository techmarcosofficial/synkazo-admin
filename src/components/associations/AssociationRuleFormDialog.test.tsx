import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AssociationRuleFormDialog, {
  sourceFieldOptionLabel,
  type AssociationRuleFormOperations,
} from './AssociationRuleFormDialog';

import { associationsApi } from '@/api/associations';
import type { AssociationRule } from '@/api/associations';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

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

  it('uses scoped operations and requires an operator reason before editing', async () => {
    const updateRule = vi.fn().mockResolvedValue({});
    const operations: AssociationRuleFormOperations = {
      getProjectObjects: vi
        .fn()
        .mockResolvedValue([
          { sourceObject: 'Customer', hsObjectType: 'contacts' },
        ]),
      getAssociationFields: vi
        .fn()
        .mockResolvedValue([
          { field: 'company_domain', label: 'Company domain', isArray: false },
        ]),
      getOwnerFields: vi.fn().mockResolvedValue([]),
      getAssociationTypes: vi.fn().mockResolvedValue([]),
      createRule: vi.fn().mockResolvedValue({}),
      updateRule,
    };
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={rule}
        operations={operations}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('Enter a reason of at least 10 characters'),
    ).toBeInTheDocument();
    expect(updateRule).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Operator reason/),
      'Customer requested association update',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateRule).toHaveBeenCalledWith(
        'project-1',
        'rule-1',
        expect.objectContaining({ name: 'Contact to company' }),
        'Customer requested association update',
      ),
    );
    expect(associationsApi.updateRule).not.toHaveBeenCalled();
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

  it('saves edited name, cardinality, and condition values for the selected rule', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    vi.mocked(associationsApi.updateRule).mockResolvedValue(rule);
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={{
          ...rule,
          cardinality: 'one_to_one',
          conditions: [{ field: 'status', operator: 'equals', value: 'old' }],
        }}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );

    expect(screen.getByDisplayValue('old')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Contact to company');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated link');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'One-to-Many' }));
    await user.clear(screen.getByPlaceholderText('Comparison value'));
    await user.type(screen.getByPlaceholderText('Comparison value'), 'ready');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(associationsApi.updateRule).toHaveBeenCalledWith(
        'project-1',
        'rule-1',
        expect.objectContaining({
          name: 'Updated link',
          cardinality: 'one_to_many',
          conditions: [
            expect.objectContaining({
              field: 'status',
              operator: 'equals',
              value: 'ready',
            }),
          ],
          conditionLogic: 'AND',
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not submit unsaved edits after the dialog is closed and reopened', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={rule}
        onSuccess={vi.fn()}
        onClose={onClose}
      />,
    );
    const nameInput = screen.getByDisplayValue('Contact to company');
    await user.clear(nameInput);
    await user.type(nameInput, 'Unsaved link');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(useConfirmDialogStore.getState().title).toBe('Discard changes?');
    await useConfirmDialogStore.getState().handleConfirm();
    expect(onClose).toHaveBeenCalledOnce();
    expect(associationsApi.updateRule).not.toHaveBeenCalled();
    view.unmount();
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={rule}
        onSuccess={vi.fn()}
        onClose={onClose}
      />,
    );
    expect(screen.getByDisplayValue('Contact to company')).toBeInTheDocument();
    expect(associationsApi.updateRule).not.toHaveBeenCalled();
  });

  it('keeps the modal open with the server error and blocks duplicate saves', async () => {
    let rejectSave!: (error: unknown) => void;
    vi.mocked(associationsApi.updateRule).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={rule}
        onSuccess={vi.fn()}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('button', { name: /Saving…/ })).toBeDisabled();
    expect(associationsApi.updateRule).toHaveBeenCalledTimes(1);
    rejectSave({ response: { data: { message: ['Cardinality is invalid'] } } });
    expect(
      await screen.findByText('Cardinality is invalid'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('skips association type settings for a Record Owner rule', async () => {
    render(
      <AssociationRuleFormDialog
        mode="edit"
        projectId="project-1"
        rule={{
          ...rule,
          name: 'Customer owner',
          targetObject: 'record_owner',
          targetMatchField: 'email',
          destTargetObjectType: 'owners',
          assocTypeId: 0,
          assocCategory: 'OWNER_ASSIGNMENT',
          assocLabel: 'Record Owner',
        }}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByDisplayValue('Customer owner'),
    ).toBeInTheDocument();
    expect(screen.getByText('Record Owner.email')).toBeInTheDocument();
    expect(
      screen.queryByText('HubSpot association type'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Cardinality')).not.toBeInTheDocument();
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
