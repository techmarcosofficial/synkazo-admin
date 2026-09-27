import { beforeEach, describe, expect, it } from 'vitest';

import { useFieldMappingDraftStore } from './useFieldMappingDraftStore';

describe('useFieldMappingDraftStore', () => {
  beforeEach(() => {
    useFieldMappingDraftStore.setState({ drafts: {} });
    localStorage.clear();
  });

  it('initially reports no draft for any jobId', () => {
    const store = useFieldMappingDraftStore.getState();
    expect(store.hasDraft('job-1')).toBe(false);
    expect(store.getDraft('job-1')).toBeUndefined();
  });

  it('saves and retrieves a field mapping draft', () => {
    const store = useFieldMappingDraftStore.getState();
    store.saveDraft('job-1', {
      fieldMappings: [
        {
          sourceField: 'email',
          destField: 'email',
          isRequired: true,
          matchPriority: null,
          destRules: {},
          destUpdatePolicy: {},
          destConflictScope: {},
          destOnEmpty: {},
          destDefaults: {},
          destReverseOnEmpty: {},
          destReverseDefaults: {},
        },
      ],
      mappingDirty: true,
    });

    const updated = useFieldMappingDraftStore.getState();
    expect(updated.hasDraft('job-1')).toBe(true);
    const draft = updated.getDraft('job-1');
    expect(draft).toBeDefined();
    expect(draft?.mappingDirty).toBe(true);
    expect(draft?.fieldMappings).toHaveLength(1);
    expect(draft?.fieldMappings?.[0].sourceField).toBe('email');
  });

  it('clears specific tab dirty state and cleans up draft when all clean', () => {
    const store = useFieldMappingDraftStore.getState();
    store.saveDraft('job-2', {
      mappingDirty: true,
      defaultsDirty: true,
    });

    expect(useFieldMappingDraftStore.getState().hasDraft('job-2')).toBe(true);

    // Clear mapping tab draft
    useFieldMappingDraftStore.getState().clearTabDraft('job-2', 'field-mapping');
    const partiallyCleared = useFieldMappingDraftStore.getState().getDraft('job-2');
    expect(partiallyCleared?.mappingDirty).toBe(false);
    expect(partiallyCleared?.defaultsDirty).toBe(true);
    expect(useFieldMappingDraftStore.getState().hasDraft('job-2')).toBe(true);

    // Clear defaults tab draft -> all tabs clean
    useFieldMappingDraftStore.getState().clearTabDraft('job-2', 'default-mapping');
    expect(useFieldMappingDraftStore.getState().hasDraft('job-2')).toBe(false);
    expect(useFieldMappingDraftStore.getState().getDraft('job-2')).toBeUndefined();
  });

  it('clears the entire job draft on clearDraft', () => {
    const store = useFieldMappingDraftStore.getState();
    store.saveDraft('job-3', {
      conditionsDirty: true,
      excludeConditions: [
        {
          field: 'status',
          operator: 'equals',
          value: 'inactive',
        },
      ],
    });

    expect(useFieldMappingDraftStore.getState().hasDraft('job-3')).toBe(true);

    useFieldMappingDraftStore.getState().clearDraft('job-3');
    expect(useFieldMappingDraftStore.getState().hasDraft('job-3')).toBe(false);
    expect(useFieldMappingDraftStore.getState().getDraft('job-3')).toBeUndefined();
  });
});
