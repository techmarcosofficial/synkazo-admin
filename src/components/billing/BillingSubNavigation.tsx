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
      <Tabs
        value={activeId}
        onValueChange={onSelect}
        className="w-full"
      >
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-10 p-1 bg-muted/60 dark:bg-muted/40 rounded-2xl gap-1 min-w-max border border-border/40">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="h-8 text-xs font-medium px-3.5 rounded-xl gap-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold cursor-pointer"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge != null && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[10px] px-1.5 py-0 font-normal rounded-full"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
