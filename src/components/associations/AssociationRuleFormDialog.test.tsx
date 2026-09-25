import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AssociationRuleFormDialog from './AssociationRuleFormDialog';

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
      getAssociationTypes: vi.fn(),
      createRule: vi.fn(),
      updateRule: vi.fn(),
    },
  };
});

const getProjectObjects = vi.mocked(associationsApi.getProjectObjects);
const getObjectFields = vi.mocked(associationsApi.getObjectFields);

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
