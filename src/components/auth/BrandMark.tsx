import { RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  inverse?: boolean;
}

export default function BrandMark({ className, inverse }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
        <RefreshCw className="size-4.5" />
      </div>
      <span
        className={`text-lg font-bold tracking-tight ${inverse ? 'text-footer-foreground' : 'text-foreground'}`}
      >
        Synkazo
      </span>
    </div>
  );
}
