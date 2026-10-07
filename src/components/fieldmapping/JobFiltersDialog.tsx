import { AlertCircle, Filter, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import type { FieldDef } from './FieldMappingCanvas';
import SkipRecordEditor from './SkipRecordEditor';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  DestinationSkipCondition,
  ExcludeCondition,
} from '@/types/conditions';

export interface JobFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFields: FieldDef[];
  destinationFields: FieldDef[];
  sourceConditions: ExcludeCondition[];
  sourceConditionLogic: 'AND' | 'OR';
  destinationConditions: DestinationSkipCondition[];
  onSourceChange: (conditions: ExcludeCondition[], logic: 'AND' | 'OR') => void;
  onDestinationChange: (conditions: DestinationSkipCondition[]) => void;
  onPreviewSource?: () => void;
  previewingSource?: boolean;
  error?: string | null;
  mappedSourceKeys?: string[];
  mappedDestinationKeys?: string[];
}

export default function JobFiltersDialog({
  open,
  onOpenChange,
  sourceFields,
  destinationFields,
  sourceConditions,
  sourceConditionLogic,
  destinationConditions,
  onSourceChange,
  onDestinationChange,
  onPreviewSource,
  previewingSource,
  error,
  mappedSourceKeys,
  mappedDestinationKeys,
}: JobFiltersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<
    'all' | 'source' | 'destination'
  >('all');
  const totalCount = sourceConditions.length + destinationConditions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        padding="none"
        size="lg"
        className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[860px] data-[size]:sm:max-w-[860px]"
      >
        {/* Fixed Header */}
        <DialogHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" size="xs">
              Job Configuration
            </Badge>
            {totalCount > 0 ? (
              <Badge
                variant="secondary"
                size="xs"
                className="gap-1 font-medium"
              >
                <Filter className="text-primary size-3 shrink-0" />
                <span>
                  {totalCount} Active Filter{totalCount !== 1 ? 's' : ''}
                </span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                size="xs"
                className="text-muted-foreground border-dashed font-normal"
              >
                No Filters Configured
              </Badge>
            )}
            {error && (
              <Badge
                variant="destructive"
                size="xs"
                className="animate-pulse gap-1 font-medium"
              >
                <AlertCircle className="size-3 shrink-0" />
                <span>Incomplete Rule</span>
              </Badge>
            )}
          </div>
          <DialogTitle className="text-foreground mt-1 flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="text-primary size-5" />
            Job-Level Record Filters
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Filter records out of the sync process based on source conditions or
            destination skip rules.
          </DialogDescription>
        </DialogHeader>

        {/* Flat Segmented Section Switcher */}
        <div className="border-border/80 bg-muted/15 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5">
          <div className="border-border/70 bg-muted/40 inline-flex rounded-xl border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none',
                activeSection === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All Filters ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('source')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none',
                activeSection === 'source'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Filter className="size-3 shrink-0" />
              <span>Source Filters</span>
              <Badge
                size="xs"
                variant="secondary"
                className="h-4.5 px-1.5 text-[10px]"
              >
                {sourceConditions.length}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('destination')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none',
                activeSection === 'destination'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ShieldAlert className="size-3 shrink-0" />
              <span>Destination Guards</span>
              <Badge
                size="xs"
                variant="secondary"
                className="h-4.5 px-1.5 text-[10px]"
              >
                {destinationConditions.length}
              </Badge>
            </button>
          </div>
        </div>

        {/* Scrollable Body on Flat Surface (zero card-in-card nesting) */}
        <div className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <SkipRecordEditor
            sourceFields={sourceFields}
            destinationFields={destinationFields}
            sourceConditions={sourceConditions}
            sourceConditionLogic={sourceConditionLogic}
            destinationConditions={destinationConditions}
            onSourceChange={onSourceChange}
            onDestinationChange={onDestinationChange}
            searchQuery={searchQuery}
            showSourceAddButton
            onPreviewSource={onPreviewSource}
            previewingSource={previewingSource}
            mappedSourceKeys={mappedSourceKeys}
            mappedDestinationKeys={mappedDestinationKeys}
            layout="grid"
            activeSection={activeSection}
          />
        </div>

        {/* Fixed Footer with Inline Status */}
        <DialogFooter className="bg-muted/20 flex shrink-0 flex-row items-center justify-between border-t px-6 py-3 sm:justify-between">
          {error ? (
            <div className="text-destructive mr-auto flex items-center gap-1.5 text-xs font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <span className="text-muted-foreground mr-auto text-xs">
              {totalCount === 0
                ? 'All records will sync directly without skip filtering.'
                : `${totalCount} filter rule${totalCount !== 1 ? 's' : ''} configured.`}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={!!error}
            className="ml-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
