import { ArrowRight, Check, CheckCircle2, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { connectionsApi } from '@/api/connections';
import { platformsApi, type SyncPlatform } from '@/api/platforms';
import { projectsApi } from '@/api/projects';
import { CRED_SCHEMAS } from '@/components/connections/platformMeta';
import FormDialog from '@/components/form/FormDialog';
import { PlatformIcon } from '@/components/platform';
import HelpText from '@/components/shared/HelpText';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Connection, PlatformId } from '@/types';

const TOTAL_STEPS = 5;

const EMPTY_HS = { privateAppToken: '' };

interface OnboardingWizardProps {
  onDismiss: () => void;
}

interface ConnectResult {
  ok: boolean;
  msg: string;
}

export default function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [platforms, setPlatforms] = useState<SyncPlatform[]>([]);
  const [sourcePlatformId, setSourcePlatformId] = useState('');
  const [destPlatformId, setDestPlatformId] = useState('');

  useEffect(() => {
    platformsApi
      .list()
      .then(setPlatforms)
      .catch(() => {});
  }, []);

  // HubSpot is the only supported destination — pick it automatically instead
  // of asking the user to choose from a list of one.
  useEffect(() => {
    const hubspot = platforms.find((p) => p.platformId === 'hubspot');
    if (hubspot && destPlatformId !== hubspot.platformId) {
      setDestPlatformId(hubspot.platformId);
    }
  }, [platforms, destPlatformId]);

  const sourceSchema = CRED_SCHEMAS[sourcePlatformId];
  const [sourceForm, setSourceForm] = useState<Record<string, string>>({});
  const [stLoading, setStLoading] = useState(false);
  const [stResult, setStResult] = useState<ConnectResult | null>(null);

  // Reset the credentials form whenever the chosen source platform changes so
  // stale field values from a different platform's schema never leak through.
  useEffect(() => {
    setSourceForm({});
    setStResult(null);
  }, [sourcePlatformId]);

  const [hsForm, setHsForm] = useState(EMPTY_HS);
  const [hsLoading, setHsLoading] = useState(false);
  const [hsResult, setHsResult] = useState<ConnectResult | null>(null);

  const dismiss = () => {
    localStorage.setItem('onboardingComplete', 'true');
    onDismiss();
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setCreateError('Please enter a workspace name.');
      return;
    }
    if (!sourcePlatformId) {
      setCreateError('Please select a source platform.');
      return;
    }
    if (!destPlatformId) {
      setCreateError('Please select a destination platform.');
      return;
    }
    if (sourcePlatformId === destPlatformId) {
      setCreateError('Source and destination cannot be the same platform.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const project = await projectsApi.createProject({
        name: workspaceName.trim(),
        sourcePlatformId: sourcePlatformId as PlatformId,
        destPlatformId: destPlatformId as PlatformId,
      });
      setProjectId(project.id);
      setStep(3);
    } catch (err) {
      const e = err as {
        response?: {
          data?: { message?: string; errors?: Array<{ message: string }> };
        };
      };
      const apiErr = e?.response?.data;
      const msg = Array.isArray(apiErr?.errors)
        ? apiErr!.errors!.map((er) => er.message).join('. ')
        : (apiErr?.message ?? 'Failed to create workspace. Please try again.');
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleConnectSource = async () => {
    if (!sourceSchema) return;
    const missing = sourceSchema.fields.find(
      (f) => !f.optional && !sourceForm[f.key]?.trim(),
    );
    if (missing) {
      setStResult({ ok: false, msg: `${missing.label} is required.` });
      return;
    }
    setStLoading(true);
    setStResult(null);
    try {
      const credentials: Record<string, string> = {};
      sourceSchema.fields.forEach((f) => {
        const val = sourceForm[f.key]?.trim();
        if (val || f.requiredAlways) credentials[f.key] = val ?? '';
      });
      const conn = await connectionsApi.createConnection(projectId!, {
        platformId: sourcePlatformId,
        type: sourceSchema.connectionType,
        environment: sourceSchema.environment,
        credentials,
        status: 'disconnected',
      } as unknown as Connection);
      const result = await connectionsApi.testConnection(projectId!, conn.id);
      setStResult({
        ok: result?.success === true,
        msg:
          result?.message ??
          (result?.success
            ? 'Connected!'
            : 'Verification failed — check your credentials.'),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setStResult({
        ok: false,
        msg:
          e?.response?.data?.message ??
          'Failed to connect. Please check your credentials.',
      });
    } finally {
      setStLoading(false);
    }
  };

  const handleConnectHS = async () => {
    if (!hsForm.privateAppToken.trim()) {
      setHsResult({ ok: false, msg: 'Private App Token is required.' });
      return;
    }
    setHsLoading(true);
    setHsResult(null);
    try {
      const conn = await connectionsApi.createConnection(projectId!, {
        platformId: 'hubspot',
        type: 'destination',
        environment: 'sandbox',
        credentials: { privateAppToken: hsForm.privateAppToken.trim() },
        status: 'disconnected',
      } as unknown as Connection);
      const result = await connectionsApi.testConnection(projectId!, conn.id);
      setHsResult({
        ok: result?.success === true,
        msg:
          result?.message ??
          (result?.success
            ? 'Connected!'
            : 'Verification failed — check your token.'),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setHsResult({
        ok: false,
        msg:
          e?.response?.data?.message ??
          'Failed to connect. Please check your token.',
      });
    } finally {
      setHsLoading(false);
    }
  };

  function PlatformPickerGrid({
    role,
    value,
    onSelect,
    options,
  }: {
    role: string;
    value: string;
    onSelect: (id: string) => void;
    options: SyncPlatform[];
  }) {
    return (
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          {role}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((p) => {
            const selected = value === p.platformId;
            return (
              <button
                key={p.platformId}
                type="button"
                onClick={() => {
                  onSelect(p.platformId);
                  setCreateError('');
                }}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'bg-muted/40 hover:bg-muted',
                )}
              >
                {selected && (
                  <span className="bg-primary absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full">
                    <Check className="size-2.5 text-white" />
                  </span>
                )}
                <PlatformIcon platformId={p.platformId} size={28} />
                <span
                  className={cn(
                    'text-xs font-medium',
                    selected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dirty once the user has advanced past the welcome step or entered any
  // data — drives the "Discard changes?" confirmation on close.
  const isDirty =
    step > 1 ||
    workspaceName !== '' ||
    sourcePlatformId !== '' ||
    Object.values(sourceForm).some((v) => v !== '') ||
    hsForm !== EMPTY_HS;

  const sourceLabel = sourceSchema?.title ?? 'Source';
  const STEP_TITLES: Record<number, string> = {
    1: 'Welcome to synkazo',
    2: 'Name your workspace',
    3: `Connect ${sourceLabel}`,
    4: 'Connect HubSpot',
    5: "You're all set!",
  };
  const STEP_SHORT_LABELS = [
    'Welcome',
    'Workspace',
    sourceLabel,
    'HubSpot',
    'Done',
  ];
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && dismiss()}
      title={STEP_TITLES[step]}
      size="lg"
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      stepLabels={STEP_SHORT_LABELS}
      isDirty={isDirty}
    >
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-muted flex size-12 items-center justify-center rounded-2xl">
            <Rocket className="text-foreground size-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-sm leading-relaxed">
              synkazo automatically keeps your field-service data updated in
              HubSpot. Let's get you set up — it takes about 5 minutes.
            </p>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">
            Get started <ArrowRight />
          </Button>
          <Button onClick={dismiss} variant="link" className="w-full">
            Skip setup
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              A workspace holds all sync settings for one company or
              integration. You can have multiple workspaces.
            </p>
          </div>

          <FieldGroup>
            <Field data-invalid={!!createError}>
              <FieldLabel htmlFor="workspace-name" required>
                Workspace name
              </FieldLabel>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                  setCreateError('');
                }}
                placeholder="e.g. Acme Corp"
                aria-invalid={!!createError}
              />
              {createError && (
                <p className="text-destructive text-xs">{createError}</p>
              )}
            </Field>

            <div className="space-y-3">
              <PlatformPickerGrid
                role="Source"
                value={sourcePlatformId}
                onSelect={setSourcePlatformId}
                options={platforms.filter((p) => p.platformId !== 'hubspot')}
              />

              {destPlatformId && (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Destination
                  </p>
                  <div className="border-primary bg-primary/5 flex items-center gap-3 rounded-xl border px-3 py-2.5">
                    <PlatformIcon platformId="hubspot" size={28} />
                    <div>
                      <span className="text-xs font-medium">HubSpot</span>
                      <p className="text-muted-foreground text-[11px]">
                        Automatically selected
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateWorkspace}
              disabled={creating}
              className="w-full"
            >
              {creating ? <Spinner /> : null}
              {creating ? 'Creating…' : 'Create workspace'}
            </Button>
          </FieldGroup>
        </div>
      )}

      {step === 3 && sourceSchema && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              Your credentials are stored securely and encrypted.
            </p>
          </div>

          <FieldGroup>
            {sourceSchema.fields.map((f) => (
              <Field key={f.key}>
                <FieldLabel required={!f.optional}>{f.label}</FieldLabel>
                <Input
                  type={f.type}
                  value={sourceForm[f.key] || ''}
                  onChange={(e) =>
                    setSourceForm((form) => ({
                      ...form,
                      [f.key]: e.target.value,
                    }))
                  }
                  placeholder={f.placeholder}
                />
              </Field>
            ))}

            {sourceSchema.note && (
              <p className="text-muted-foreground text-xs">
                {sourceSchema.note}
              </p>
            )}

            {stResult && (
              <Alert variant={stResult.ok ? 'default' : 'destructive'}>
                {stResult.ok && <CheckCircle2 />}
                <AlertDescription>{stResult.msg}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleConnectSource}
              disabled={stLoading}
              className="w-full"
            >
              {stLoading ? <Spinner /> : null}
              {stLoading ? 'Testing…' : 'Test & Connect'}
            </Button>
          </FieldGroup>

          <Button onClick={() => setStep(4)} variant="link" size="sm">
            {stResult?.ok ? 'Next' : "I'll connect this later"} <ArrowRight />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              Your credentials are stored securely and encrypted.
            </p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel className="flex items-center gap-1">
                Private App Token
                <span className="text-destructive -ml-1.5">*</span>
                <HelpText>
                  Create a Private App in HubSpot: Settings → Integrations →
                  Private Apps → Create. Copy the token from the Auth tab.
                </HelpText>
              </FieldLabel>
              <Input
                type="password"
                value={hsForm.privateAppToken}
                onChange={(e) =>
                  setHsForm((f) => ({ ...f, privateAppToken: e.target.value }))
                }
                placeholder="pat-na1-xxxxxxxx"
              />
            </Field>

            {hsResult && (
              <Alert variant={hsResult.ok ? 'default' : 'destructive'}>
                {hsResult.ok && <CheckCircle2 />}
                <AlertDescription>{hsResult.msg}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleConnectHS}
              disabled={hsLoading}
              className="w-full"
            >
              {hsLoading ? <Spinner /> : null}
              {hsLoading ? 'Testing…' : 'Test & Connect'}
            </Button>
          </FieldGroup>

          <Button onClick={() => setStep(5)} variant="link" size="sm">
            {hsResult?.ok ? 'Next' : "I'll connect this later"} <ArrowRight />
          </Button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 text-center">
          <div className="bg-success/10 mx-auto flex size-14 items-center justify-center rounded-full">
            <CheckCircle2 className="text-success size-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your workspace is created. Next, create your first sync job to
              start moving data.
            </p>
          </div>
          <Button
            onClick={() => {
              dismiss();
              if (projectId) navigate(`/projects/${projectId}`);
            }}
            className="w-full"
          >
            Create your first sync job <ArrowRight />
          </Button>
        </div>
      )}
    </FormDialog>
  );
}
