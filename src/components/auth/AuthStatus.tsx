import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const TONE_CLASS = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  danger: 'bg-destructive/10 text-destructive',
} as const;

interface AuthStatusProps {
  icon: LucideIcon;
  tone: keyof typeof TONE_CLASS;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AuthStatus({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: AuthStatusProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          TONE_CLASS[tone],
        )}
      >
        <Icon className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
