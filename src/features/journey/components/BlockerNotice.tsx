import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BlockerNoticeProps {
  title: string;
  description: string;
  reason?: string;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
  className?: string;
  secondaryAction?: ReactNode;
}

export default function BlockerNotice({
  title,
  description,
  reason,
  actionLabel,
  actionUrl,
  onAction,
  className,
  secondaryAction,
}: BlockerNoticeProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionUrl) {
      navigate(actionUrl);
    }
  };

  return (
    <Card
      className={cn('border-warning/40 bg-warning/5 rounded-3xl', className)}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-warning/15 text-warning mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <AlertTriangle className="size-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold tracking-tight">{title}</h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {description}
            </p>
            {reason && (
              <p className="text-warning text-[11px] font-medium">
                Prerequisite: {reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:self-center">
          {secondaryAction}
          {actionLabel && (actionUrl || onAction) && (
            <Button
              size="sm"
              variant="default"
              onClick={handleAction}
              className="gap-1.5 text-xs font-semibold"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
