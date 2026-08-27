// Central query-key factory. Add a namespace here for each API domain as
// it's migrated onto TanStack Query — keeps invalidation call sites
// consistent instead of hand-writing key arrays everywhere.
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
};
