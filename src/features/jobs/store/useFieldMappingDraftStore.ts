import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ConsolidatedMapping } from '@/features/jobs/hooks';
import type { ExcludeCondition } from '@/types/conditions';

export type MappingWorkspaceTab =
  | 'field-mapping'
  | 'default-mapping'
  | 'skip-record';

export interface FieldMappingDraft {
  jobId: string;
  fieldMappings?: ConsolidatedMapping[];
  defaultMappings?: ConsolidatedMapping[];
  excludeConditions?: ExcludeCondition[];
  excludeConditionLogic?: 'AND' | 'OR';
  mappingMode?: 'edit' | 'fresh-setup';
  mappingDirty: boolean;
  defaultsDirty: boolean;
  conditionsDirty: boolean;
  updatedAt: number;
}

interface FieldMappingDraftStore {
  drafts: Record<string, FieldMappingDraft>;
  getDraft: (jobId: string) => FieldMappingDraft | undefined;
  hasDraft: (jobId: string) => boolean;
  saveDraft: (jobId: string, partial: Partial<FieldMappingDraft>) => void;
  clearTabDraft: (jobId: string, tab: MappingWorkspaceTab) => void;
  clearDraft: (jobId: string) => void;
}

export const useFieldMappingDraftStore = create<FieldMappingDraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      getDraft: (jobId) => get().drafts[jobId],
      hasDraft: (jobId) => {
        const draft = get().drafts[jobId];
        return (
          !!draft &&
          (Boolean(draft.mappingDirty) ||
            Boolean(draft.defaultsDirty) ||
            Boolean(draft.conditionsDirty))
        );
      },
      saveDraft: (jobId, partial) =>
        set((state) => {
          const existing = state.drafts[jobId] || {
            jobId,
            mappingDirty: false,
            defaultsDirty: false,
            conditionsDirty: false,
            updatedAt: Date.now(),
          };
          const updated: FieldMappingDraft = {
            ...existing,
            ...partial,
            jobId,
            updatedAt: Date.now(),
          };
          return {
            drafts: {
              ...state.drafts,
              [jobId]: updated,
            },
          };
        }),
      clearTabDraft: (jobId, tab) =>
        set((state) => {
          const existing = state.drafts[jobId];
          if (!existing) return state;

          const updated: FieldMappingDraft = {
            ...existing,
            mappingDirty:
              tab === 'field-mapping' ? false : existing.mappingDirty,
            defaultsDirty:
              tab === 'default-mapping' ? false : existing.defaultsDirty,
            conditionsDirty:
              tab === 'skip-record' ? false : existing.conditionsDirty,
            updatedAt: Date.now(),
          };

          if (
            !updated.mappingDirty &&
            !updated.defaultsDirty &&
            !updated.conditionsDirty
          ) {
            const { [jobId]: _, ...remaining } = state.drafts;
            return { drafts: remaining };
          }

          return {
            drafts: {
              ...state.drafts,
              [jobId]: updated,
            },
          };
        }),
      clearDraft: (jobId) =>
        set((state) => {
          if (!state.drafts[jobId]) return state;
          const { [jobId]: _, ...remaining } = state.drafts;
          return { drafts: remaining };
        }),
    }),
    {
      name: 'synkazo_field_mapping_drafts',
    },
  ),
);
