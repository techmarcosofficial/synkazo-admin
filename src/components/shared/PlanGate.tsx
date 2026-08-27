import { Lock } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';

import EmptyState from './EmptyState';
import UpgradeRequiredDialog from './UpgradeRequiredDialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Plan-gating affordances. Out-of-plan controls stay visible but inert, badged with a lock,
 * and clicking one explains what's missing via the existing UpgradeRequiredDialog — the same
 * dialog the backend's PLAN_LIMIT_* rejections already surface.
 */

export function PlanLockBadge({
  label = 'Upgrade',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('text-muted-foreground gap-1', className)}
    >
      <Lock aria-hidden />
      {label}
    </Badge>
  );
}

/**
 * Wraps a control the plan doesn't allow. The child is rendered greyed out and click-through
 * disabled, while the wrapper captures the click to open the upgrade dialog — a natively
 * `disabled` element fires no events, so the prompt has to live on the wrapper.
 *
 * `locked={false}` renders the child untouched, so callers can use this unconditionally.
 */
export function PlanLock({
  locked,
  message,
  children,
  className,
}: {
  locked: boolean;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  const { prompt, dialog } = usePlanUpgradePrompt();

  if (!locked) return <>{children}</>;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-disabled
        onClick={() => prompt(message)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            prompt(message);
          }
        }}
        className={cn('cursor-not-allowed', className)}
      >
        <div className="pointer-events-none opacity-50">{children}</div>
      </div>
      {dialog}
    </>
  );
}

/**
 * Whole-surface gate for a feature the plan doesn't include — replaces a tab or panel's body
 * with an explanation and an upgrade link, instead of rendering controls whose every action
 * the API would reject.
 */
export function PlanFeatureGate({
  allowed,
  title,
  description,
  children,
}: {
  allowed: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;

  return (
    <EmptyState
      icon={Lock}
      title={title}
      description={description}
      action={
        <Button asChild>
          <a href={`${import.meta.env.VITE_FRONTEND_URL}/pricing`}>
            Upgrade plan
          </a>
        </Button>
      }
    />
  );
}

/**
 * For call sites that need to trigger the prompt themselves (e.g. a `disabled` button whose
 * own layout must not change). Render `dialog` anywhere in the subtree.
 */
export function usePlanUpgradePrompt() {
  const [message, setMessage] = useState<string | null>(null);

  const prompt = useCallback((text: string) => setMessage(text), []);

  const dialog = (
    <UpgradeRequiredDialog
      open={message !== null}
      onOpenChange={(open) => {
        if (!open) setMessage(null);
      }}
      message={message ?? ''}
    />
  );

  return { prompt, dialog };
}
