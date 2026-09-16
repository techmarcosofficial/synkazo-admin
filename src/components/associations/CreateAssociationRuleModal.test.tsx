import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CreateAssociationRuleModal from './CreateAssociationRuleModal';

import { associationsApi } from '@/api/associations';

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
    },
  };
});

const getProjectObjects = vi.mocked(associationsApi.getProjectObjects);

describe('CreateAssociationRuleModal', () => {
  beforeEach(() => {
    getProjectObjects.mockResolvedValue([
      { sourceObject: 'Customer', hsObjectType: 'contacts' },
      { sourceObject: 'Job', hsObjectType: 'deals' },
    ] as never);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses the shared dialog and groups record matching into one meaningful step', async () => {
    render(
      <CreateAssociationRuleModal
        projectId="project-1"
        onCreated={vi.fn()}
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
});
