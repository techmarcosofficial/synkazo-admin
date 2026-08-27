import { FolderPlus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useCreateProjectStore } from '@/features/projects/store';

export default function DashboardOnboardingEmptyState() {
  const openCreateProjectDialog = useCreateProjectStore((s) => s.open);

  return (
    <Empty className="min-h-[60vh] border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderPlus />
        </EmptyMedia>
        <EmptyTitle>Welcome to Synkazo</EmptyTitle>
        <EmptyDescription>
          Create your first project to start syncing data between your
          platforms.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="lg" onClick={() => openCreateProjectDialog()}>
          <Plus /> Create Your First Project
        </Button>
        <p className="text-muted-foreground text-xs">
          Setup takes just a few minutes.
        </p>
      </EmptyContent>
    </Empty>
  );
}
