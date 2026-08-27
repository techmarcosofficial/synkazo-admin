import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PlanBadge({
  planName,
  highlighted,
  className,
}: {
  planName: string;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        'rounded-full font-semibold',
        highlighted
          ? 'bg-accent text-accent-foreground'
          : 'bg-primary/10 text-primary',
        className,
      )}
    >
      {planName}
    </Badge>
  );
}
