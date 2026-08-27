import { CloudSync } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export default function FlowConnector() {
  return (
    <Card className="relative z-10 flex w-full max-w-46 flex-col items-center gap-2 border border-dashed py-2 text-center shadow-none">
      <CardContent className="flex flex-col items-center gap-2 px-2">
        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
          <CloudSync className="text-primary size-5" />
        </div>
        <div className="font-semibold">Sync Flow</div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Data moves from Source to Destination
        </p>
      </CardContent>
    </Card>
  );
}
