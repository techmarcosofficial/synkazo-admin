import { createContext, useContext, type ReactNode } from 'react';

import type { WorkspaceKind } from './workspace';

const WorkspaceContext = createContext<WorkspaceKind | null>(null);

export function WorkspaceProvider({
  kind,
  children,
}: {
  kind: WorkspaceKind;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={kind}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceKind(): WorkspaceKind | null {
  return useContext(WorkspaceContext);
}
