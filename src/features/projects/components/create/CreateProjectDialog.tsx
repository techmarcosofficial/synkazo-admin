// features/projects/components/CreateProjectDialog.tsx

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CreateProjectFormRef } from '../../types';

import { CreateProjectForm } from '.';

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
            onSuccess={(project) => {
              close();

              navigate(`/projects/${project.id}`);
              openSetupWizard(project.id);
            }}
          />
        </div>

        <DialogFooter className="bg-muted/40 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={() => formRef.current?.submit()}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
