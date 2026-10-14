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

export interface ProjectSettingsNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  locked?: boolean;
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
    <aside className="min-w-0" aria-label={title}>
      <Card
        size="sm"
        className="top-[calc(var(--detail-sticky-top)+var(--detail-header-height)+(--spacing(4)))] gap-0 py-0 lg:sticky"
      >
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
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <Button
                  key={item.id}
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
              );
            })}
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}
