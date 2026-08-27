import { Check } from 'lucide-react';

import { PASSWORD_CHECKS } from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

const SCORE_LABELS = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];

const BAR_TONE = [
  'bg-border',
  'bg-destructive',
  'bg-destructive',
  'bg-warning',
  'bg-warning',
  'bg-success',
];

const TEXT_TONE = [
  'text-muted-foreground',
  'text-destructive',
  'text-destructive',
  'text-warning',
  'text-warning',
  'text-success',
];

export default function PasswordStrength({ password }: { password: string }) {
  const checks = PASSWORD_CHECKS.map((c) => ({
    label: c.label,
    ok: c.test(password),
  }));
  const score = checks.filter((c) => c.ok).length;
  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= score ? BAR_TONE[score] : 'bg-border',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <span
              key={c.label}
              className={cn(
                'flex items-center gap-1 text-xs',
                c.ok ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {c.ok && <Check className="size-2.5" />}
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={cn('text-xs font-medium', TEXT_TONE[score])}>
            {SCORE_LABELS[score]}
          </span>
        )}
      </div>
    </div>
  );
}
