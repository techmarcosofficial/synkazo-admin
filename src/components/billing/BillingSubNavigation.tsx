import type { ComponentType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div className={cn('w-full', className)}>
      <Tabs value={activeId} onValueChange={onSelect} className="w-full">
        <TabsList>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge != null && (
                  <Badge
                    variant="secondary"
                    className="ml-1 rounded-full px-1.5 py-0 text-[10px] font-normal"
                  >
                    {item.badge}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
