import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SideNavItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Small count after the label (rules added, etc.). Hidden when 0. */
  count?: number;
  /** Shows a dot when something here is configured. */
  configured?: boolean;
  /** Starts a new labelled group in the list. */
  group?: string;
  /**
   * Bump to flash this item (and pop its count) once, e.g. when something
   * done elsewhere in the panel landed here. 0 = never flashed.
   */
  flashKey?: number;
}

/**
 * The left-hand section list inside a settings tab, with the chosen
 * section's content on the right. On narrow screens the list becomes a
 * horizontal strip above the content.
 */
export default function SettingsSideNavLayout({
  label,
  items,
  active,
  onSelect,
  header,
  children,
}: {
  /** Accessible name for the list, e.g. "Data cleaning sections". */
  label: string;
  items: SideNavItem[];
  active: string;
  onSelect: (id: string) => void;
  /** Optional control above the list (e.g. a search box). */
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-0 gap-4 md:grid-cols-[12.5rem_minmax(0,1fr)]">
      <div className="min-w-0 md:sticky md:top-0 md:self-start">
        <nav
          aria-label={label}
          className="bg-card rounded-xl border p-1.5"
        >
          {header && <div className="p-1 pb-2">{header}</div>}
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {items.map((item) => {
              const isActive = item.id === active;
              const Icon = item.icon;
              return (
                <li key={item.id} className="contents md:block">
                  {item.group && (
                    <p className="text-muted-foreground hidden px-2.5 pt-3 pb-1 text-[11px] font-medium md:block">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'relative flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs whitespace-nowrap transition-colors outline-none',
                      'focus-visible:ring-ring/50 focus-visible:ring-2',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium',
                    )}
                  >
                    {!!item.flashKey && (
                      <span
                        key={item.flashKey}
                        aria-hidden="true"
                        className="side-nav-flash pointer-events-none absolute inset-0 rounded-lg"
                      />
                    )}
                    {Icon && (
                      <span aria-hidden="true" className="flex shrink-0">
                        <Icon className="size-3.5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.count ? (
                      <span
                        key={item.flashKey}
                        className={cn(
                          item.flashKey && 'side-nav-count-pop',
                          'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                          isActive
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {item.count}
                      </span>
                    ) : item.configured ? (
                      <span
                        className="bg-success size-1.5 rounded-full"
                        aria-label="Configured"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <div className="bg-card min-w-0 rounded-xl border px-4 py-4 sm:px-5">
        {children}
      </div>
    </div>
  );
}
