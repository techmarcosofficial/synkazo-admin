import { AlertTriangle, KeyRound } from 'lucide-react';

import { PLATFORM_META } from './platformMeta';

import FormDialog from '@/components/form/FormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ConnectMethodModalProps {
  platform: string;
  onManual: () => void;
  onOAuth?: () => void;
  onClose: () => void;
  /**
   * Disables the Manual (API-token) option. Used for HubSpot in a two-way
   * project: reverse-sync webhooks can't be managed with a Private App token,
   * so OAuth ("Login with HubSpot") is the only supported method there.
   */
  manualDisabled?: boolean;
}

export default function ConnectMethodModal({
  platform,
  onManual,
  onOAuth,
  onClose,
  manualDisabled = false,
}: ConnectMethodModalProps) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.servicetitan;
  const oauthEnabled = platform === 'hubspot' && !!onOAuth;
  const manualEnabled = !manualDisabled;

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Connect ${meta.label}`}
      description="Choose how to authenticate"
      size="xs"
    >
      {manualDisabled && (
        <Alert className="mb-1">
          <AlertTriangle />
          <AlertDescription>
            This project is set to Two Way sync, which relies on HubSpot
            webhooks to catch changes in real time — HubSpot has no way to
            manage webhook subscriptions for a Private App (manual) token, only
            for an OAuth connection. Use "Login with HubSpot" below to connect.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={manualEnabled ? onManual : undefined}
          disabled={!manualEnabled}
          className={cn(
            'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors',
            manualEnabled
              ? 'hover:border-primary bg-muted/40 cursor-pointer'
              : 'bg-muted/20 cursor-not-allowed opacity-35',
          )}
        >
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              manualEnabled && 'bg-primary/10',
            )}
          >
            <KeyRound
              className={cn(
                'size-4',
                manualEnabled ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          </div>
          <div>
            <div
              className={cn(
                'mb-0.5 text-sm font-semibold',
                !manualEnabled && 'text-muted-foreground',
              )}
            >
              Manual Setup
            </div>
            <div className="text-muted-foreground text-xs">
              {manualEnabled
                ? 'Enter API credentials'
                : 'Not available for two-way sync'}
            </div>
          </div>
        </button>

        <button
          onClick={oauthEnabled ? onOAuth : undefined}
          className={cn(
            'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors',
            oauthEnabled
              ? 'bg-muted/40 hover:border-hubspot cursor-pointer'
              : 'bg-muted/20 cursor-not-allowed opacity-35',
          )}
        >
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              oauthEnabled && 'bg-hubspot/15',
            )}
          >
            <KeyRound
              className={cn(
                'size-4',
                oauthEnabled ? 'text-hubspot' : 'text-muted-foreground',
              )}
            />
          </div>
          <div>
            <div
              className={cn(
                'mb-0.5 text-sm font-semibold',
                !oauthEnabled && 'text-muted-foreground',
              )}
            >
              {platform === 'hubspot' ? 'Login with HubSpot' : 'OAuth'}
            </div>
            <div className="text-muted-foreground text-xs">
              {oauthEnabled
                ? 'Continue with HubSpot account'
                : platform === 'hubspot'
                  ? 'Not available — use Manual Setup'
                  : 'Not applicable'}
            </div>
          </div>
        </button>
      </div>
    </FormDialog>
  );
}
