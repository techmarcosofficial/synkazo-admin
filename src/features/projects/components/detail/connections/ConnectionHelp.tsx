import { Info } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export default function ConnectionHelp() {
  return (
    <Card className="bg-muted/30 border-dashed shadow-none">
      <CardContent className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
          <Info className="text-primary size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">How it works</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Data will flow from your selected Source platform to the Destination
            platform based on your Sync Jobs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
