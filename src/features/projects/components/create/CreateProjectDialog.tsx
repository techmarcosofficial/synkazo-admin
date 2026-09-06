// features/projects/components/CreateProjectDialog.tsx

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CreateProjectFormRef, CreateProjectSelection } from '../../types';

import { CreateProjectForm } from '.';

import { PlatformPair } from '@/components/platform';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateProjectStore,
  useSetupWizardStore,
} from '@/features/projects/store';

export default function CreateProjectDialog() {
  const navigate = useNavigate();

  const formRef = useRef<CreateProjectFormRef>(null);
  const [selection, setSelection] = useState<CreateProjectSelection>({
    sourcePlatformId: '',
    syncMode: '',
  });

  const isOpen = useCreateProjectStore((state) => state.isOpen);
  const close = useCreateProjectStore((state) => state.close);
  const setOpen = useCreateProjectStore((state) => state.setOpen);
  const openSetupWizard = useSetupWizardStore((state) => state.open);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-5xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-4 pr-14">
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new synchronization project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <CreateProjectForm
            ref={formRef}
            onSelectionChange={setSelection}
            onSuccess={(project) => {
              close();

              navigate(`/projects/${project.id}`);
              openSetupWizard(project.id);
            }}
          />
        </div>

        <DialogFooter className="bg-muted/40 shrink-0 flex-row items-center justify-between gap-2 border-t p-4">
          {selection.sourcePlatformId && selection.syncMode && (
            <div className="bg-background flex items-center gap-2 rounded-4xl border px-3 py-2">
              <PlatformPair
                sourcePlatformId={selection.sourcePlatformId}
                destPlatformId="hubspot"
                variant="icon-text"
                size="sm"
                direction={selection.syncMode}
              />
              <span className="text-muted-foreground text-xs">
                · {selection.syncMode === 'two_way' ? 'Two Way' : 'One Way'}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={() => formRef.current?.submit()}>
              Create Project
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
