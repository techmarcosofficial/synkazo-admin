import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { marketplaceApi } from '@/api/marketplace';
import AuthStatus from '@/components/auth/AuthStatus';
import { PlatformIcon } from '@/components/platform';
import HelpText from '@/components/shared/HelpText';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const EMPTY_ST = { appKey: '', clientId: '', clientSecret: '', tenantId: '' };

export default function WelcomeOnboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get('projectId');
  const token = params.get('token');

  const [stForm, setStForm] = useState(EMPTY_ST);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [done, setDone] = useState(false);

  const handleConnect = async () => {
    if (!stForm.appKey.trim()) {
      setResult({ ok: false, msg: 'App Key is required.' });
      return;
    }
    if (!stForm.clientId.trim()) {
      setResult({ ok: false, msg: 'Client ID is required.' });
      return;
    }
    if (!stForm.clientSecret.trim()) {
      setResult({ ok: false, msg: 'Client Secret is required.' });
      return;
    }
    if (!stForm.tenantId.trim()) {
      setResult({ ok: false, msg: 'Tenant ID is required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await marketplaceApi.connectSource({
        projectId: projectId as string,
        token: token as string,
        credentials: {
          appKey: stForm.appKey.trim(),
          clientId: stForm.clientId.trim(),
          clientSecret: stForm.clientSecret.trim(),
          tenantId: stForm.tenantId.trim(),
        },
      });
      const data = res as { success?: boolean; message?: string };
      const ok = data?.success === true;
      setResult({
        ok,
        msg:
          data?.message ??
          (ok ? 'Connected!' : 'Verification failed — check your credentials.'),
      });
      if (ok) setDone(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setResult({
        ok: false,
        msg:
          e?.response?.data?.message ??
          'Failed to connect. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !projectId || !token;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent>
          {invalidLink ? (
            <AuthStatus
              icon={Mail}
              tone="danger"
              title="This link is invalid"
              description="The onboarding link is missing or has expired. Please reinstall Synkazo from the HubSpot Marketplace, or log in if you already have an account."
            >
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to login
              </Button>
            </AuthStatus>
          ) : done ? (
            <AuthStatus
              icon={CheckCircle2}
              tone="success"
              title="You're all set!"
              description="HubSpot and ServiceTitan are both connected. Your sync workspace is ready."
            >
              <Alert className="text-left">
                <Mail />
                <AlertDescription>
                  Check your email to set your password, then log in to manage
                  your syncs.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to login <ArrowRight />
              </Button>
            </AuthStatus>
          ) : (
            <div className="space-y-5">
              <Alert className="bg-success/10 border-success/20">
                <PlatformIcon platformId="hubspot" size={28} />
                <AlertDescription className="text-success flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-3.5" /> HubSpot connected
                </AlertDescription>
              </Alert>

              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  Connect ServiceTitan
                </h2>
                <p className="text-muted-foreground text-sm">
                  One last step — add your ServiceTitan credentials to start
                  syncing. They're stored securely and encrypted.
                </p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel className="flex items-center gap-1">
                    App Key
                    <span className="text-destructive -ml-1.5">*</span>
                    <HelpText>
                      Your App Key is provided when you register an application
                      in the ServiceTitan developer portal.
                    </HelpText>
                  </FieldLabel>
                  <Input
                    value={stForm.appKey}
                    onChange={(e) =>
                      setStForm((f) => ({ ...f, appKey: e.target.value }))
                    }
                    placeholder="st_appkey_xxxxxxxx"
                  />
                </Field>
                <Field>
                  <FieldLabel className="flex items-center gap-1">
                    Client ID
                    <span className="text-destructive -ml-1.5">*</span>
                    <HelpText>
                      Log in to ServiceTitan → Settings → Integrations → API
                      Applications. Your Client ID is listed there.
                    </HelpText>
                  </FieldLabel>
                  <Input
                    value={stForm.clientId}
                    onChange={(e) =>
                      setStForm((f) => ({ ...f, clientId: e.target.value }))
                    }
                    placeholder="st_client_xxxxxxxx"
                  />
                </Field>
                <Field>
                  <FieldLabel className="flex items-center gap-1">
                    Client Secret
                    <span className="text-destructive -ml-1.5">*</span>
                    <HelpText>
                      Found under Settings → Integrations → API Applications —
                      shown once when you create the app.
                    </HelpText>
                  </FieldLabel>
                  <Input
                    type="password"
                    value={stForm.clientSecret}
                    onChange={(e) =>
                      setStForm((f) => ({ ...f, clientSecret: e.target.value }))
                    }
                    placeholder="••••••••••••••••"
                  />
                </Field>
                <Field>
                  <FieldLabel className="flex items-center gap-1">
                    Tenant ID
                    <span className="text-destructive -ml-1.5">*</span>
                    <HelpText>
                      Your Tenant ID is the number in your ServiceTitan URL:
                      app.servicetitan.com/[TenantId]/...
                    </HelpText>
                  </FieldLabel>
                  <Input
                    value={stForm.tenantId}
                    onChange={(e) =>
                      setStForm((f) => ({ ...f, tenantId: e.target.value }))
                    }
                    placeholder="1234567"
                  />
                </Field>

                {result && (
                  <Alert variant={result.ok ? 'default' : 'destructive'}>
                    {result.ok && <CheckCircle2 />}
                    <AlertDescription>{result.msg}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleConnect}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Spinner /> : null}
                  {loading ? 'Testing…' : 'Test & Connect'}
                </Button>
              </FieldGroup>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
