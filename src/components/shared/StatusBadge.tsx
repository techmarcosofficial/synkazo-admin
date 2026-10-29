import { cva, type VariantProps } from 'class-variance-authority';
import {
  ArrowLeftRight,
  ArrowRight,
  ListOrdered,
  Shuffle,
  type LucideIcon,
} from 'lucide-react';

import {
  Badge,
  badgeVariants,
  badgeToneClasses,
  useBadgeAppearance,
} from '@/components/ui/badge';
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
      xs: 'gap-1',
      sm: 'gap-1.5',
      md: 'gap-1.5',
      lg: 'gap-2',
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
    icon?: LucideIcon;
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
  needs_mapping: {
    tone: 'warning',
    label: 'Needs Mapping',
    description: 'Field mapping required before syncing',
  },
  ready_to_test: {
    tone: 'info',
    label: 'Ready to Test',
    description: 'Initial test run pending',
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
  in_progress: { tone: 'info', label: 'In progress' },
  connected: { tone: 'success', label: 'Connected' },
  success: { tone: 'success', label: 'Success' },
  completed: { tone: 'success', label: 'Completed' },
  associated: { tone: 'success', label: 'Associated' },

  pending: { tone: 'warning', label: 'Pending' },
  retry_pending: { tone: 'warning', label: 'Retry pending' },
  schedule_paused: { tone: 'paused', label: 'Schedule paused' },
  ready_to_connect: { tone: 'info', label: 'Ready to connect' },
  awaiting_connection: { tone: 'muted', label: 'Awaiting connection' },
  partial: { tone: 'warning', label: 'Partial' },
  scheduled: { tone: 'info', label: 'Scheduled' },
  sandbox: { tone: 'warning', label: 'Sandbox' },
  production: { tone: 'success', label: 'Production' },
  one_way: { tone: 'muted', label: 'One-way', icon: ArrowRight },
  two_way: { tone: 'muted', label: 'Two-way', icon: ArrowLeftRight },
  unrestricted: {
    tone: 'muted',
    label: 'Unrestricted',
    icon: ArrowLeftRight,
  },
  individual: { tone: 'info', label: 'Independent', icon: Shuffle },
  priority: { tone: 'info', label: 'Priority queue', icon: ListOrdered },

  failed: { tone: 'danger', label: 'Failed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
  limit_reached: { tone: 'muted', label: 'Limit reached' },
  time_limit_reached: { tone: 'warning', label: 'Time limit reached' },
  disconnected: { tone: 'danger', label: 'Disconnected' },
  queued: { tone: 'warning', label: 'Queued' },
  stopped: { tone: 'warning', label: 'Stopped' },

  idle: { tone: 'muted', label: 'Idle' },
  skipped: { tone: 'muted', label: 'Skipped' },
  inactive: { tone: 'muted', label: 'Inactive' },
  disabled: { tone: 'muted', label: 'Disabled' },

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

// Platform-only vocabulary; tenant status labels and tones keep their defaults.
const PLATFORM_STATUS_TONES: Record<string, Tone> = {
  warning: 'warning',
  danger: 'danger',
  enabled: 'success',
  on: 'success',
  paid: 'success',
  succeeded: 'success',
  ok: 'success',
  recovered: 'success',
  synced: 'success',
  suspended: 'warning',
  trialing: 'warning',
  pending_cancel: 'warning',
  incomplete: 'warning',
  overdue: 'warning',
  stale: 'warning',
  info: 'info',
  open: 'info',
  processing: 'info',
  provisioning: 'info',
  past_due: 'danger',
  unpaid: 'danger',
  uncollectible: 'danger',
  critical: 'danger',
  fatal: 'danger',
  archived: 'muted',
  canceled: 'muted',
  cancelled: 'muted',
  none: 'muted',
  off: 'muted',
  void: 'muted',
};

export function getStatusTone(status: string): Tone {
  const key = status.toLowerCase();
  return PLATFORM_STATUS_TONES[key] ?? STATUS_CONFIG[key]?.tone ?? 'muted';
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  title?: string;
  size?: Size;
  variant?: Variant;
  showDescription?: boolean;
  className?: string;
  tone?: Tone;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function StatusBadge({
  status,
  label: customLabel,
  title,
  size = 'default',
  variant = 'default',
  showDescription = false,
  className,
  tone,
  action,
}: StatusBadgeProps) {
  const tinted = useBadgeAppearance() === 'tinted';
  const statusKey = tinted ? status.toLowerCase() : status;
  const cfg = STATUS_CONFIG[statusKey] ?? {
    tone: 'muted' as Tone,
    label: status,
  };
  const label = customLabel ?? cfg.label;
  const resolvedTone = tone ?? (tinted ? getStatusTone(status) : cfg.tone);
  const Icon = tinted ? undefined : cfg.icon;

  if (action) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
        }}
        title={title ?? `${label} - Click to ${action.label.toLowerCase()}`}
        data-slot="badge"
        data-tone={tinted ? resolvedTone : undefined}
        data-appearance={tinted ? 'tinted' : undefined}
        className={cn(
          badgeVariants({
            variant: 'secondary',
            size: size === 'default' ? 'sm' : size,
          }),
          'hover:bg-muted/80 cursor-pointer font-semibold',
          statusBadge({ variant: 'default', tone: resolvedTone, size }),
          className,
          tinted && '[&_*]:text-foreground border-0 shadow-none',
          tinted && badgeToneClasses[resolvedTone],
        )}
      >
        {Icon ? (
          <Icon aria-hidden="true" />
        ) : (
          <span
            data-slot="badge-dot"
            aria-hidden="true"
            className={statusDot({
              tone: resolvedTone,
              size,
            })}
          />
        )}
        <span>{label}</span>
        <span className="text-destructive font-semibold lowercase underline underline-offset-2 hover:opacity-80">
          {action.label}
        </span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={cn('flex flex-col', className)} title={title}>
        <div className="flex items-center gap-2 font-medium">
          {Icon ? (
            <Icon className="size-3.5" aria-hidden="true" />
          ) : (
            <span
              data-slot="badge-dot"
              aria-hidden="true"
              className={statusDot({
                tone: resolvedTone,
                size: 'md',
              })}
            />
          )}
          {label}
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
      title={title}
      size={size === 'default' ? 'sm' : size}
      tone={resolvedTone}
      indicator={false}
      className={cn(
        'font-semibold',
        statusBadge({
          variant,
          tone: resolvedTone,
          size,
        }),
        className,
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" />
      ) : (
        <span
          data-slot="badge-dot"
          aria-hidden="true"
          className={statusDot({
            tone: resolvedTone,
            size,
          })}
        />
      )}
      {label}
    </Badge>
  );
}
