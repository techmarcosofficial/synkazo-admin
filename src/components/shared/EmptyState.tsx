import type { LucideIcon } from 'lucide-react';
import {
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ActionButton {
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  label: string;
}

interface EmptyStateProps {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactElement | ActionButton | null;
  secondaryAction?: ReactElement | ActionButton | null;
  /** Overrides the default icon media (e.g. a custom SVG illustration). */
  illustration?: ReactNode;
  viewMode?: 'list' | 'table' | 'card';
}

function renderAction(
  action: ReactElement | ActionButton,
  variant?: 'outline',
) {
  if (isValidElement(action)) return action;
  const { onClick, icon: ActionIcon, label } = action as ActionButton;
  return (
    <Button onClick={onClick} variant={variant}>
      {ActionIcon && <ActionIcon />}
      {label}
    </Button>
  );
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null,
  secondaryAction = null,
  illustration,
  viewMode,
}: EmptyStateProps) {
  const content = (
    <Empty>
      <EmptyHeader>
        {illustration ?? (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {(action || secondaryAction) && (
        <EmptyContent>
          <div className="flex items-center gap-2">
            {action && renderAction(action)}
            {secondaryAction && renderAction(secondaryAction, 'outline')}
          </div>
        </EmptyContent>
      )}
    </Empty>
  );

  if (viewMode === 'list' || viewMode === 'table') {
    return (
      <div className="bg-card flex h-full w-full flex-col overflow-hidden rounded-4xl border">
        <div className="bg-muted px-3 py-1.5 text-sm font-semibold">
          No any data
        </div>
        {content}
      </div>
    );
  }

  if (viewMode === 'card') {
    return <Card className="h-full w-full">{content}</Card>;
  }

  return content;
}
