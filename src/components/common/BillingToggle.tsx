import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PublicBillingInterval } from '@/types/pricing';

interface BillingToggleProps {
  value: PublicBillingInterval;
  onChange: (interval: PublicBillingInterval) => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="bg-card inline-flex items-center gap-1 rounded-3xl border p-1">
        {(['month', 'year'] as const).map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => onChange(iv)}
            className={cn(
              'rounded-2xl px-4 py-1.5 text-sm font-medium transition-colors',
              value === iv
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {iv === 'month' ? 'Monthly' : 'Annual'}
          </button>
        ))}
      </div>
      <Badge className="bg-primary/10 text-primary">Save ~15% annually</Badge>
    </div>
  );
}
