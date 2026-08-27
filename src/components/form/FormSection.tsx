import type { LucideIcon } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'danger';
}

export default function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  variant = 'default',
}: FormSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle
          className={cn(
            'flex items-center gap-2',
            variant === 'danger' && 'text-destructive',
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                'size-4',
                variant === 'danger'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            />
          )}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}
