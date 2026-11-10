import { Lock } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

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

export interface ProjectSettingsNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  locked?: boolean;
  /** Starts a labelled group (e.g. "Activity") below a divider. */
  groupLabel?: string;
}

export default function ProjectSettingsNavigation({
  activeId,
  items,
  onSelect,
  renderLink,
  title = 'Project settings',
  selectId = 'project-settings-section',
}: {
  activeId: string;
  items: readonly ProjectSettingsNavItem[];
  onSelect: (id: string) => void;
  renderLink: (item: ProjectSettingsNavItem, children: ReactNode) => ReactNode;
  title?: string;
  selectId?: string;
}) {
  return (
    <aside className="min-w-0 self-start" aria-label={title}>
      <Card size="sm" className="gap-0 py-0">
        <CardHeader className="px-3.5 py-3">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 pb-2.5">
          <div className="space-y-2 lg:hidden">
            <label htmlFor={selectId} className="text-sm font-medium">
              Settings section
            </label>
            <Select value={activeId} onValueChange={onSelect}>
              <SelectTrigger
                id={selectId}
                className="w-full"
                aria-label="Settings section"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <Icon />
                      {item.label}
                      {item.locked && <Lock className="ml-auto" />}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <nav className="hidden space-y-1 lg:block">
            {items.map((item, index) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              const startsGroup =
                item.groupLabel &&
                item.groupLabel !== items[index - 1]?.groupLabel;
              return (
                <div key={item.id}>
                  {startsGroup && (
                    <p
                      className={cn(
                        'text-muted-foreground px-2.5 pb-1 text-[11px] font-medium tracking-wide uppercase',
                        index > 0 && 'border-border mt-2 border-t pt-3',
                      )}
                    >
                      {item.groupLabel}
                    </p>
                  )}
                  <Button
                    asChild
                    variant={active ? 'secondary' : 'ghost'}
                    className="h-8 w-full justify-start px-2.5 text-xs"
                  >
                    {renderLink(
                      item,
                      <>
                        <Icon />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {item.label}
                        </span>
                        {item.locked && (
                          <Lock className="text-muted-foreground" />
                        )}
                      </>,
                    )}
                  </Button>
                </div>
              );
            })}
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}
