import { Filter, ShieldCheck, X } from 'lucide-react';
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
}: JobFiltersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const totalCount = sourceConditions.length + destinationConditions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        padding="none"
        className="flex max-h-[85vh] w-full flex-col gap-0 p-0 overflow-hidden sm:max-w-[700px]"
      >
        {/* Fixed Header */}
        <DialogHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-muted-foreground text-[11px] font-medium"
            >
              Job Configuration
            </Badge>
            {totalCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-[11px]"
              >
                <Filter className="mr-1 size-3" />
                {totalCount} Active Filter{totalCount !== 1 ? 's' : ''}
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

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-xl border p-3 text-xs">
              {error}
            </div>
          )}

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
            layout="grid"
          />
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="bg-muted/20 shrink-0 border-t px-6 py-3">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
