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

import { ActionTooltip } from '@/features/journey';

export interface ActionButton {
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  label: string;
  timeEstimate?: string;
  disabled?: boolean;
  tooltip?: string;
}

export interface EmptyStateProps {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactElement | ActionButton | null;
  secondaryAction?: ReactElement | ActionButton | null;
  helpLink?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Overrides the default icon media (e.g. a custom SVG illustration). */
  illustration?: ReactNode;
  viewMode?: 'list' | 'table' | 'card';
}

function renderAction(
  action: ReactElement | ActionButton,
  variant?: 'outline',
) {
  if (isValidElement(action)) return action;
  const {
    onClick,
    icon: ActionIcon,
    label,
    timeEstimate,
    disabled,
    tooltip,
  } = action as ActionButton;

  const button = (
    <Button onClick={onClick} variant={variant} disabled={disabled}>
      {ActionIcon && <ActionIcon />}
      <span>{label}</span>
      {timeEstimate && (
        <span className="text-muted-foreground/80 ml-1 text-xs font-normal">
          ({timeEstimate})
        </span>
      )}
    </Button>
  );

  if (disabled && tooltip) {
    return (
      <ActionTooltip tooltip={tooltip} disabled={disabled}>
        {button}
      </ActionTooltip>
    );
  }

  return button;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null,
  secondaryAction = null,
  helpLink,
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
      {(action || secondaryAction || helpLink) && (
        <EmptyContent className="space-y-3">
          {(action || secondaryAction) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {action && renderAction(action)}
              {secondaryAction && renderAction(secondaryAction, 'outline')}
            </div>
          )}
          {helpLink && (
            <div>
              {helpLink.href ? (
                <a
                  href={helpLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors"
                >
                  {helpLink.label}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={helpLink.onClick}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors"
                >
                  {helpLink.label}
                </button>
              )}
            </div>
          )}
        </EmptyContent>
      )}
    </Empty>
  );

  if (viewMode === 'list' || viewMode === 'table') {
    return (
      <div className="bg-card flex h-full w-full flex-col overflow-hidden rounded-4xl border">
        <div className="bg-muted px-3 py-1.5 text-sm font-semibold">
          No data found
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
