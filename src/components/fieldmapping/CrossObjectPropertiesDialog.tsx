import { Link2 } from 'lucide-react';

import CrossObjectPropertiesPanel from './CrossObjectPropertiesPanel';
import type { FieldDef } from './FieldMappingCanvas';

import type { CrossObjectProperty } from '@/api/jobs';
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

export interface CrossObjectPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  jobId: string;
  platformId: string;
  sourceObject: string;
  sourceFields: FieldDef[];
  properties: CrossObjectProperty[];
  onPropertiesChange: (properties: CrossObjectProperty[]) => void;
}

export default function CrossObjectPropertiesDialog({
  open,
  onOpenChange,
  projectId,
  jobId,
  platformId,
  sourceObject,
  sourceFields,
  properties,
  onPropertiesChange,
}: CrossObjectPropertiesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        padding="none"
        className="flex max-h-[85vh] w-full flex-col gap-0 p-0 overflow-hidden sm:max-w-[650px]"
      >
        {/* Fixed Header */}
        <DialogHeader className="bg-background shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-muted-foreground text-[11px] font-medium"
            >
              Related Objects
            </Badge>
            {properties.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-[11px]"
              >
                {properties.length} Imported
              </Badge>
            )}
          </div>
          <DialogTitle className="text-foreground mt-1 flex items-center gap-2 text-base font-semibold">
            <Link2 className="text-primary size-5" />
            Cross-Object Properties
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Import properties from related objects (e.g. customer name or
            location on a job) to use in your field mappings.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <CrossObjectPropertiesPanel
            projectId={projectId}
            jobId={jobId}
            platformId={platformId}
            sourceObject={sourceObject}
            sourceFields={sourceFields}
            properties={properties}
            onPropertiesChange={onPropertiesChange}
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
