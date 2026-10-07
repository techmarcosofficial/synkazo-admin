import {
  Calendar,
  Check,
  GitBranch,
  Hash,
  Info,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RULE_CATEGORIES,
  RULE_DEFINITIONS,
  type Rule,
  type RuleDefinition,
} from '@/lib/ruleEngine';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<
  string,
  ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean | 'true' | 'false' }>
> = {
  text: TypeIcon,
  length: Ruler,
  validation: ShieldCheck,
  conditional: GitBranch,
  number: Hash,
  date: Calendar,
  split: Scissors,
  conversion: RefreshCw,
};

export interface RuleLibraryPopoverProps {
  currentRules: Rule[];
  onAddRule: (def: RuleDefinition) => void;
  onClose?: () => void;
  className?: string;
}

export default function RuleLibraryPopover({
  currentRules,
  onAddRule,
  onClose,
  className,
}: RuleLibraryPopoverProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const optionsListRef = useRef<HTMLDivElement>(null);

  const addedTypes = useMemo(
    () => new Set(currentRules.map((r) => r.type)),
    [currentRules],
  );

  // Robust native wheel listener to ensure mouse wheel scrolling always works
  // even when hovering over option items inside dialog/sheet portals
  useEffect(() => {
    const el = optionsListRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        // Prevent parent portal or sheet from blocking scroll
        e.stopPropagation();
        el.scrollTop += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, []);

  const filteredRules = useMemo(() => {
    let list = RULE_DEFINITIONS;
    if (selectedCategory !== 'all') {
      list = list.filter((r) => r.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, search]);

  const isSearchingEmptyPolicy = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q.length > 0 && /empty|blank|default|fallback/i.test(q);
  }, [search]);

  return (
    <div
      className={cn(
        'flex flex-col text-xs bg-popover text-popover-foreground max-h-[inherit] overflow-hidden',
        className,
      )}
    >
      {/* Fixed Header with Search & Flex-Wrap Category Pills */}
      <div className="shrink-0 p-2.5 space-y-2.5 bg-muted/40 dark:bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="font-semibold text-foreground text-xs">
              Add Transformation Rule
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="border-0 bg-primary/10 text-primary text-[10px] font-mono">
              {filteredRules.length} available
            </Badge>
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onClose}
                aria-label="Close rule library"
                className="size-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-secondary cursor-pointer"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search regex, replace, dates, math, formatting..."
            className="pl-8 h-8 text-xs font-normal bg-background/80 dark:bg-secondary/40 border-border/70 text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills (flex-wrap with rounded-lg, no carousel slider) */}
        <div
          role="group"
          aria-label="Filter rules by category"
          className="flex flex-wrap items-center gap-1.5 pt-0.5"
        >
          {/* All Pill with rounded-lg */}
          <button
            type="button"
            aria-pressed={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                : 'bg-card dark:bg-secondary/70 text-muted-foreground border-border hover:bg-muted dark:hover:bg-secondary hover:text-foreground',
            )}
          >
            <Sparkles aria-hidden="true" className="size-3 shrink-0" />
            <span>All</span>
            <span
              aria-hidden="true"
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-md font-mono font-normal',
                selectedCategory === 'all'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted dark:bg-muted/60 text-muted-foreground',
              )}
            >
              {RULE_DEFINITIONS.length}
            </span>
          </button>

          {/* Category Pills with rounded-lg */}
          {RULE_CATEGORIES.map((cat) => {
            const count = RULE_DEFINITIONS.filter(
              (r) => r.category === cat.id,
            ).length;
            const isSelected = selectedCategory === cat.id;
            const Icon = CATEGORY_ICONS[cat.id] || TypeIcon;

            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                    : 'bg-card dark:bg-secondary/70 text-muted-foreground border-border hover:bg-muted dark:hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-3 shrink-0" />
                <span>{cat.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono font-normal',
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted dark:bg-muted/60 text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules Option List with direct wheel handler */}
      <div
        ref={optionsListRef}
        onWheelCapture={(e) => {
          if (e.deltaY !== 0) {
            e.stopPropagation();
            if (optionsListRef.current) {
              optionsListRef.current.scrollTop += e.deltaY;
            }
          }
        }}
        className="flex-1 overflow-y-auto px-2 focus:outline-none"
      >
        {isSearchingEmptyPolicy && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-[11px] text-muted-foreground flex items-start gap-2 mb-2">
            <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground block">
                Looking for empty value handling?
              </span>
              <span>
                Default values and &quot;Skip if empty&quot; are configured in <strong>Section 3: Empty Value Policy &amp; Fallback</strong> below.
              </span>
            </div>
          </div>
        )}

        {filteredRules.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground space-y-1">
            <p className="font-semibold text-xs text-foreground">No matching rules found</p>
            <p className="text-[11px]">Try searching for another keyword or selecting "All"</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredRules.map((def) => {
              const isAdded = addedTypes.has(def.type);
              const Icon = CATEGORY_ICONS[def.category] || TypeIcon;

              return (
                <div
                  key={def.type}
                  onClick={() => {
                    if (!isAdded) onAddRule(def);
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2.5 rounded-xl px-2.5 mt-1.5 last:mb-1.5 py-1 transition-all border outline-none',
                    isAdded
                      ? 'border-border/40 bg-muted/30 dark:bg-muted/15 text-muted-foreground opacity-65 cursor-default'
                      : 'border-border/70 bg-card hover:bg-accent/40 dark:hover:bg-secondary/50 hover:border-primary/50 text-foreground cursor-pointer group shadow-2xs',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors border-0">
                      <Icon aria-hidden="true" className="size-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {def.label}
                        </span>
                        <Badge
                          className="border-0 bg-secondary text-secondary-foreground text-[9px] px-1.5 py-0 font-normal capitalize"
                        >
                          {def.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-1">
                    {isAdded ? (
                      <span className="text-success flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-success/10 rounded-md">
                        <Check className="size-3" /> Added
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        className="h-6 gap-1 px-2.5 text-[11px] font-medium cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddRule(def);
                        }}
                      >
                        <Plus className="size-3 text-primary" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
