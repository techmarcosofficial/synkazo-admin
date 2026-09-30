import { useEffect, useState } from 'react';

import { CRED_SCHEMAS } from './platformMeta';

import { connectionsApi } from '@/api/connections';
import FormDialog from '@/components/form/FormDialog';
import { PlatformIcon } from '@/components/platform';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogDescription } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Connection } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../ui/popover';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  KeyRound,
} from 'lucide-react';

interface ConnectionPayload {
  platformId?: string;
  connectionType?: string;
  environment?: string;
  credentials?: Record<string, string | undefined>;
  status?: string;
}

type VerifyStep = 'idle' | 'validating' | 'verifying' | 'connected';

interface CredentialsModalProps {
  projectId: string;
  conn: Partial<Connection> & {
    platformId?: string;
    connectionType?: string;
    environment?: string;
    providerMetadata?: { installSource?: 'marketplace' | 'manual' };
  };
  syncMode?: 'one_way' | 'two_way' | null;
  onOAuth?: () => void;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
  onContinue?: () => void;
  willCompleteBoth?: boolean;
  initialError?: string | null;
  onVerificationError?: (message: string) => void;
  onTestingChange?: (testing: boolean) => void;
}

type ModalPhase = 'method' | 'form' | 'success';

export default function CredentialsModal({
  projectId,
  conn,
  syncMode = null,
  onOAuth,
  onSaved,
  onClose,
  onContinue,
  willCompleteBoth = false,
  initialError = null,
  onVerificationError,
  onTestingChange,
}: CredentialsModalProps) {
  const platformId = conn.platformId ?? 'servicetitan';
  const schema = CRED_SCHEMAS[platformId] ?? CRED_SCHEMAS.servicetitan;
  const isEdit = !!conn?.id;
  const supportsOAuth = platformId === 'hubspot' && !!onOAuth;
  const manualDisabled = platformId === 'hubspot' && syncMode === 'two_way';
  const manualEnabled = !manualDisabled;

  const initialPhase: ModalPhase = !isEdit && supportsOAuth ? 'method' : 'form';
  const [phase, setPhase] = useState<ModalPhase>(initialPhase);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(schema.fields.map((f) => [f.key, ''])),
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(isEdit);
  const [verifyError, setVerifyError] = useState<string | null>(initialError);
  const [currentConnId, setCurrentConnId] = useState<string | undefined>(conn?.id);

  useEffect(() => {
    if (!isEdit) return;
    connectionsApi
      .getCredentialsPreview(projectId, conn.id!)
      .then((preview) => setForm((f) => ({ ...f, ...preview })))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, []);

  const setField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setVerifyError(null);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    schema.fields.forEach((f) => {
      const required = !f.optional && (f.requiredAlways || !isEdit);
      if (required && !form[f.key]?.trim()) next[f.key] = 'Required';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const getFieldErrorMessage = (fieldKey: string) => {
    if (errors[fieldKey]) return errors[fieldKey];
    if (!verifyError) return undefined;
    const lower = verifyError.toLowerCase();

    // Specific field matches
    const hasClientId =
      lower.includes('client id') ||
      lower.includes('client key') ||
      lower.includes('client_id') ||
      lower.includes('client_key') ||
      lower.includes('invalid_client') ||
      lower.includes('invalid client') ||
      lower.includes('unauthorized_client') ||
      lower.includes('unknown client');

    const hasClientSecret =
      lower.includes('client secret') ||
      lower.includes('client_secret') ||
      lower.includes('invalid_secret') ||
      lower.includes('invalid secret') ||
      /\bsecret\b/.test(lower);

    const hasAppKey =
      lower.includes('app key') ||
      lower.includes('app_key') ||
      lower.includes('application key') ||
      lower.includes('st-app-key') ||
      lower.includes('st_app_key') ||
      lower.includes('st-app');

    const hasTenantId =
      lower.includes('tenant') ||
      lower.includes('tenant id') ||
      lower.includes('tenant_id') ||
      lower.includes('tenantid');

    const hasToken =
      lower.includes('token') ||
      lower.includes('pat') ||
      lower.includes('private app') ||
      lower.includes('private_app');

    const hasPortalId =
      lower.includes('portal') ||
      lower.includes('portal id') ||
      lower.includes('portal_id') ||
      lower.includes('hub id') ||
      lower.includes('hub_id') ||
      lower.includes('account id');

    const hasApiKey =
      lower.includes('api key') ||
      lower.includes('api_key') ||
      lower.includes('df-auth');

    const hasCompanyServiceCode =
      lower.includes('service code') ||
      lower.includes('servicecode') ||
      lower.includes('company code') ||
      lower.includes('df-servicecode');

    if (fieldKey === 'clientId' && hasClientId) {
      return 'Check Client ID value';
    }
    if (fieldKey === 'clientSecret' && hasClientSecret) {
      return 'Check Client Secret value';
    }
    if (fieldKey === 'appKey' && hasAppKey) {
      return 'Check Application Key value';
    }
    if (fieldKey === 'tenantId' && hasTenantId) {
      return 'Check Tenant ID value';
    }
    if (fieldKey === 'privateAppToken' && hasToken) {
      return 'Check Private App Token value';
    }
    if (fieldKey === 'portalId' && hasPortalId) {
      return 'Check Portal ID value';
    }
    if (fieldKey === 'apiKey' && hasApiKey) {
      return 'Check API Key value';
    }
    if (fieldKey === 'companyServiceCode' && hasCompanyServiceCode) {
      return 'Check Company Service Code value';
    }

    return undefined;
  };

  const handleVerify = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    setVerifyError(null);
    setVerifyStep('validating');
    onTestingChange?.(true);

    try {
      const credentials: Record<string, string> = {};
      schema.fields.forEach((f) => {
        const val = form[f.key]?.trim();
        // Fields with an edit-mode-only placeholder are optional on edit — omit
        // when blank so the backend keeps the existing stored value.
        if (val || f.requiredAlways) credentials[f.key] = val;
      });

      const payload: ConnectionPayload = {
        credentials,
        status: 'disconnected',
      };

      let connId = currentConnId;
      if (connId) {
        await connectionsApi.updateConnection(
          projectId,
          connId,
          payload as Partial<Connection>,
        );
      } else {
        const saved = await connectionsApi.createConnection(projectId, {
          ...payload,
          platformId,
          connectionType: conn?.connectionType ?? schema.connectionType,
          environment: conn?.environment ?? schema.environment,
        } as Partial<Connection>);
        connId = saved?.id;
        if (connId) {
          setCurrentConnId(connId);
        }
      }

      if (!connId) {
        throw new Error('Connection could not be saved. Please try again.');
      }
      setVerifyStep('verifying');

      const result = await connectionsApi.testConnection(projectId, connId);

      if (result?.success) {
        await onSaved();
        setVerifyStep('connected');
        if (willCompleteBoth) {
          setPhase('success');
        } else {
          onClose();
        }
      } else {
        const errorMsg =
          result?.message ||
          'Invalid credentials — please check the values and try again.';
        setVerifyError(errorMsg);
        onVerificationError?.(errorMsg);
        setVerifyStep('idle');
      }
    } catch (err) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      const errorMsg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to save credentials. Please check your values and try again.';
      setVerifyError(errorMsg);
      onVerificationError?.(errorMsg);
      setVerifyStep('idle');
    } finally {
      setLoading(false);
      onTestingChange?.(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleDone = () => {
    onClose();
    onContinue?.();
  };

  const fieldsDisabled = loading || previewLoading;
  const environmentLabel = conn.environment === 'sandbox' ? 'Sandbox' : 'Production';

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title={
        phase === 'success'
          ? `${environmentLabel} connections ready`
          : phase === 'method'
            ? `Connect ${schema.title}`
            : isEdit
              ? `Edit ${schema.title} Connection`
              : `Connect ${schema.title}`
      }
      description={
        phase === 'success'
          ? undefined
          : phase === 'method'
            ? 'Choose how to authenticate'
            : isEdit
              ? 'Update your API credentials'
              : 'Enter your API credentials'
      }
      size={phase === 'success' ? 'xs' : 'sm'}
      compact={phase === 'success'}
      preventOutsideClose={loading}
      footer={(requestClose) => {
        if (phase === 'method') {
          return (
            <Button
              variant="outline"
              onClick={requestClose}
              className="w-full"
            >
              Cancel
            </Button>
          );
        }

        if (phase === 'success') {
          return (
            <div className="flex w-full items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={requestClose}
                className="flex-1"
              >
                Close
              </Button>
              {onContinue && (
                <Button size="sm" onClick={handleDone} className="flex-1">
                  Create Sync Flow
                </Button>
              )}
            </div>
          );
        }

        return (
          <>
            <Button
              variant="outline"
              onClick={requestClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={fieldsDisabled}
              className="flex-1"
            >
              {verifyStep === 'validating' || verifyStep === 'verifying' ? (
                <span className="flex items-center justify-center gap-1.5" role="status">
                  <Spinner className="size-4" />
                  <span>{verifyStep === 'validating' ? 'Validating…' : 'Verifying with server…'}</span>
                </span>
              ) : verifyError ? (
                'Retry verification'
              ) : (
                'Submit'
              )}
            </Button>
          </>
        );
      }}
    >
      {/* Phase 0: Method Selection State */}
      {phase === 'method' && (
        <div className="space-y-3">
          {manualDisabled && (
            <Alert className="mb-1">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                This project is set to Two Way sync, which relies on HubSpot
                webhooks to catch changes in real time — HubSpot has no way to
                manage webhook subscriptions for a Private App (manual) token,
                only for an OAuth connection. Use &ldquo;Login with HubSpot&rdquo; below to
                connect.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={manualEnabled ? () => setPhase('form') : undefined}
              disabled={!manualEnabled}
              className={cn(
                'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                manualEnabled
                  ? 'hover:border-primary/50 hover:bg-muted/60 bg-muted/30 cursor-pointer active:scale-[0.99]'
                  : 'bg-muted/10 cursor-not-allowed opacity-40',
              )}
            >
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl',
                  manualEnabled
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <KeyRound className="size-4" />
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
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {manualEnabled
                    ? 'Enter API credentials'
                    : 'Not available for two-way sync'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={supportsOAuth ? onOAuth : undefined}
              disabled={!supportsOAuth}
              className={cn(
                'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                supportsOAuth
                  ? 'hover:border-hubspot/50 hover:bg-muted/60 bg-muted/30 cursor-pointer active:scale-[0.99]'
                  : 'bg-muted/10 cursor-not-allowed opacity-40',
              )}
            >
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl',
                  supportsOAuth
                    ? 'bg-hubspot/15 text-hubspot'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <KeyRound className="size-4" />
              </div>
              <div>
                <div
                  className={cn(
                    'mb-0.5 text-sm font-semibold',
                    !supportsOAuth && 'text-muted-foreground',
                  )}
                >
                  {platformId === 'hubspot' ? 'Login with HubSpot' : 'OAuth'}
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {supportsOAuth
                    ? 'Continue with HubSpot account'
                    : platformId === 'hubspot'
                      ? 'Not available — use Manual Setup'
                      : 'Not applicable'}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {previewLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner className="size-3" /> Loading saved details…
        </div>
      )}

      {/* Pair-complete confirmation appears only after the second verification. */}
      {phase === 'success' && (
        <div className="flex items-start gap-3 py-1">
          <div className="bg-success/15 text-success motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:fade-in-0 flex size-9 shrink-0 items-center justify-center rounded-xl duration-300">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <DialogDescription className="text-xs leading-relaxed">
              Both connections verified. Your project activates automatically; create a sync flow next.
            </DialogDescription>
          </div>
        </div>
      )}

      {/* The form remains visible while validation and server verification run. */}
      {phase === 'form' && (
        <>
          {!isEdit && supportsOAuth && (
            <div className="mb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhase('method')}
                className="text-muted-foreground hover:text-foreground -ml-2 h-7 gap-1.5 px-2 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                Back to authentication methods
              </Button>
            </div>
          )}

          {verifyError && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-2xl border border-destructive/20 p-3 text-xs mb-4"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold">Verification Failed</p>
                <p className="text-destructive/90 break-words">{verifyError}</p>
              </div>
            </div>
          )}

          <FieldGroup>
            {schema.fields.map((f) => {
              const isMarketplacePrivateAppToken =
                conn?.providerMetadata?.installSource === 'marketplace' &&
                f.key === 'privateAppToken';
              if (isMarketplacePrivateAppToken) return null;

              const fieldError = getFieldErrorMessage(f.key);

              return (
                <Field key={f.key} data-invalid={!!fieldError}>
                  <FieldLabel htmlFor={f.key}>
                    {f.label}{' '}
                    <KnowMore
                      label={f.label}
                      helpText={f.helpText}
                      helpUrl={f.helpUrl}
                    />{' '}
                  </FieldLabel>
                  <Input
                    id={f.key}
                    type={f.type}
                    value={form[f.key] || ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={
                      isEdit && f.editPlaceholder
                        ? f.editPlaceholder
                        : f.placeholder
                    }
                    disabled={fieldsDisabled}
                    aria-invalid={!!fieldError}
                    className={cn(
                      fieldError &&
                        'border-destructive ring-0.5 ring-[0.5px] ring-destructive aria-invalid:border-destructive aria-invalid:ring-0.5 aria-invalid:ring-[0.5px] aria-invalid:ring-destructive',
                    )}
                  />
                  {fieldError && (
                    <p className="text-destructive text-xs">{fieldError}</p>
                  )}
                </Field>
              );
            })}
          </FieldGroup>

          {schema.note && (
            <p className="text-muted-foreground text-xs mt-3">{schema.note}</p>
          )}
        </>
      )}
    </FormDialog>
  );
}

interface KnowMoreProps {
  label: string;
  helpText?: string;
  helpUrl?: string;
}

function KnowMore({ label, helpText, helpUrl }: KnowMoreProps) {
  if (!helpText && !helpUrl) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
                className="text-muted-foreground hover:text-foreground size-5"
          aria-label={`Help with ${label}`}
        >
          <CircleHelp className="size-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="top" className="w-72">
        <PopoverHeader>
          <PopoverTitle className="text-sm">{label}</PopoverTitle>

          {helpText && (
            <PopoverDescription className="text-xs leading-relaxed">
              {helpText}
            </PopoverDescription>
          )}
        </PopoverHeader>

        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            View documentation
            <ExternalLink className="size-3" />
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
