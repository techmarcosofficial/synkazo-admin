import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const typeChip = cva('', {
  variants: {
    tone: {
      string: 'bg-success/10 text-success',
      number: 'bg-info/10 text-info',
      boolean: 'bg-paused/10 text-paused',
      date: 'bg-warning/10 text-warning',
      enum: 'bg-primary/10 text-primary',
      object: 'bg-muted text-muted-foreground',
      unknown: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { tone: 'unknown' },
});

type Tone = NonNullable<VariantProps<typeof typeChip>['tone']>;

const TYPE_TONE: Record<string, Tone> = {
  string: 'string',
  phone: 'string',
  email: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  datetime: 'date',
  enum: 'enum',
  object: 'object',
  array: 'object',
};

interface TypeChipProps {
  type: string;
  showWarning?: boolean;
}

export default function TypeChip({ type, showWarning = false }: TypeChipProps) {
  const tone = TYPE_TONE[type] ?? 'unknown';

  return (
    <Badge
      className={cn(
        typeChip({ tone }),
        'rounded font-mono',
        showWarning && 'ring-warning ring-1',
      )}
    >
      {type || '?'}
      {showWarning && <AlertTriangle className="text-warning size-3" />}
    </Badge>
  );
}
