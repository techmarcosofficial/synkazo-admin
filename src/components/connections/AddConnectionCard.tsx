import { PlugZap } from 'lucide-react';

import { PLATFORM_META } from './platformMeta';

import { PlatformIcon } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AddConnectionCardProps {
  platformId: string;
  connectionType: string;
  environment: string;
  onConnect: () => void;
}

export default function AddConnectionCard({
  platformId,
  connectionType,
  environment,
  onConnect,
}: AddConnectionCardProps) {
  const meta = PLATFORM_META[platformId] ?? { label: platformId };
  const envLabel = environment === 'sandbox' ? 'Sandbox' : 'Production';
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="opacity-50">
            <PlatformIcon platformId={platformId} size={36} />
          </div>
          <div>
            <div className="text-muted-foreground text-sm font-medium">
              {meta.label}
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs capitalize">
              {connectionType} · {envLabel} · Not connected
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-primary text-primary"
          onClick={onConnect}
        >
          <PlugZap /> Connect
        </Button>
      </CardContent>
    </Card>
  );
}
