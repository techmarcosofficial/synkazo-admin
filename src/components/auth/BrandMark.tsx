import { SynkazoMark } from '@/components/branding/SynkazoMark';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  inverse?: boolean;
}

export default function BrandMark({ className, inverse }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <SynkazoMark className="size-9" />
      <span
        className={`text-lg font-bold tracking-tight ${inverse ? 'text-footer-foreground' : 'text-foreground'}`}
      >
        synkazo
      </span>
    </div>
  );
}
