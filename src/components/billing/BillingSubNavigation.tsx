import type { ComponentType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface BillingNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
}

export default function BillingSubNavigation({
  activeId,
  items,
  onSelect,
  title = 'Billing',
  selectId = 'billing-section-select',
  className,
}: {
  activeId: string;
  items: readonly BillingNavItem[];
  onSelect: (id: string) => void;
  title?: string;
  selectId?: string;
  className?: string;
}) {
  return (
    <aside className={cn('min-w-0', className)} aria-label={title}>
      <Card
        size="sm"
        className="top-[calc(var(--detail-sticky-top,4rem)+var(--detail-header-height,0px)+(--spacing(4)))] gap-0 py-0 lg:sticky"
      >
        <CardHeader className="px-3.5 py-3">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 pb-2.5">
          {/* Mobile dropdown selector */}
          <div className="space-y-1.5 lg:hidden">
            <label
              htmlFor={selectId}
              className="sr-only text-xs font-medium text-muted-foreground"
            >
              {title} section
            </label>
            <Select value={activeId} onValueChange={onSelect}>
              <SelectTrigger
                id={selectId}
                className="w-full text-xs font-medium"
                aria-label={`${title} section`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge != null && (
                        <Badge
                          variant="secondary"
                          className="ml-auto rounded-full px-1.5 py-0 text-[10px] font-normal"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop vertical sidebar navigation */}
          <nav className="hidden space-y-1 lg:block" aria-label={title}>
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'h-8.5 w-full justify-start px-2.5 text-xs font-medium',
                    active && 'font-semibold',
                  )}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {item.label}
                  </span>
                  {item.badge != null && (
                    <Badge
                      variant="secondary"
                      className="ml-auto rounded-full px-1.5 py-0 text-[10px] font-normal"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}
