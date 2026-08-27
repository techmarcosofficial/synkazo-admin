import { cva, type VariantProps } from 'class-variance-authority';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const statusDot = cva('shrink-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      warning: 'bg-warning',
      info: 'bg-info',
      paused: 'bg-paused',
      danger: 'bg-destructive',
      muted: 'bg-muted-foreground',
    },
    size: {
      xs: 'size-1',
      sm: 'size-1.5',
      md: 'size-2',
      lg: 'size-2.5',
      default: 'size-1.5',
    },
  },
  defaultVariants: {
    tone: 'muted',
    size: 'default',
  },
});

export const statusBadge = cva('', {
  variants: {
    variant: {
      default: 'rounded-full bg-muted text-muted-foreground',
      menu: 'bg-transparent rounded-none px-0 py-0 text-foreground shadow-none border-0',
    },
    tone: {
      success: '',
      warning: '',
      info: '',
      paused: '',
      danger: '',
      muted: '',
    },
    size: {
      xs: 'h-4 px-1.5 text-[10px] gap-1',
      sm: 'h-5 px-2 text-xs gap-1.5',
      md: 'h-6 px-2.5 text-sm gap-1.5',
      lg: 'h-7 px-3 text-sm gap-2',
      default: '',
    },
  },
  compoundVariants: [
    {
      variant: 'menu',
      size: 'default',
      className: 'h-auto gap-2 text-sm font-medium',
    },
  ],
  defaultVariants: {
    variant: 'default',
    tone: 'muted',
    size: 'default',
  },
});

export type Tone = NonNullable<VariantProps<typeof statusBadge>['tone']>;
export type Size = NonNullable<VariantProps<typeof statusBadge>['size']>;
export type Variant = NonNullable<VariantProps<typeof statusBadge>['variant']>;

const STATUS_CONFIG: Record<
  string,
  {
    tone: Tone;
    label: string;
    description?: string;
  }
> = {
  active: {
    tone: 'success',
    label: 'Active',
    description: 'Project syncs normally',
  },
  draft: {
    tone: 'warning',
    label: 'Draft',
    description: 'Not ready for syncing',
  },
  paused: {
    tone: 'paused',
    label: 'Paused',
    description: 'Scheduled syncs are stopped',
  },
  error: {
    tone: 'danger',
    label: 'Error',
    description: 'Requires attention',
  },

  running: { tone: 'success', label: 'Running' },
  connected: { tone: 'success', label: 'Connected' },
  success: { tone: 'success', label: 'Success' },
  completed: { tone: 'success', label: 'Completed' },

  pending: { tone: 'warning', label: 'Pending' },
  partial: { tone: 'warning', label: 'Partial' },

  failed: { tone: 'danger', label: 'Failed' },
  disconnected: { tone: 'danger', label: 'Disconnected' },

  idle: { tone: 'muted', label: 'Idle' },
  skipped: { tone: 'muted', label: 'Skipped' },
  inactive: { tone: 'muted', label: 'Inactive' },

  invited: { tone: 'info', label: 'Invited' },

  missing: { tone: 'warning', label: 'Missing' },
  conflict: { tone: 'danger', label: 'Conflict' },
  in_sync: { tone: 'success', label: 'In Sync' },
  ready_to_transfer: { tone: 'info', label: 'Ready to transfer' },

  healthy: {
    tone: 'success',
    label: 'Healthy',
    description: 'All systems operational',
  },
  degraded: {
    tone: 'warning',
    label: 'Attention',
    description: 'Some issues need review',
  },
  unhealthy: {
    tone: 'danger',
    label: 'Critical',
    description: 'Sync is impacted',
  },
  accepted: { tone: 'success', label: 'Accepted' },
  revoked: { tone: 'danger', label: 'Revoked' },
  expired: { tone: 'danger', label: 'Expired' },
};

interface StatusBadgeProps {
  status: string;
  size?: Size;
  variant?: Variant;
  showDescription?: boolean;
}

export default function StatusBadge({
  status,
  size = 'default',
  variant = 'default',
  showDescription = false,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    tone: 'muted' as Tone,
    label: status,
  };

  if (variant === 'menu') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 font-medium">
          <span
            className={statusDot({
              tone: cfg.tone,
              size: 'md',
            })}
          />
          {cfg.label}
        </div>

        {showDescription && cfg.description && (
          <span className="text-muted-foreground ml-4 text-xs">
            {cfg.description}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge
      className={cn(
        'font-semibold',
        statusBadge({
          variant,
          tone: cfg.tone,
          size,
        }),
      )}
    >
      <span
        className={statusDot({
          tone: cfg.tone,
          size,
        })}
      />
      {cfg.label}
    </Badge>
  );
}
