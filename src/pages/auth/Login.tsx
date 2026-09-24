import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import apiClient from '@/api/apiClient';
import AuthInput from '@/components/auth/AuthInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { loginSchema, type LoginFormValues } from '@/lib/authValidation';
import {
  consumePendingPlan,
  readPendingPlan,
  savePendingPlan,
} from '@/lib/pendingPlan';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { tokenStorage } from '@/lib/tokenStorage';
import { authPagesSettingsApi } from '@/api/auth-pages-settings';
import { PlatformIcon } from '@/components/platform';

const HUBSPOT_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'HubSpot login was cancelled. No changes were made.',
  state_missing: 'The HubSpot login request is incomplete. Please try again.',
  state_expired:
    'The HubSpot login expired or was already used. Please try again.',
  invalid_hubspot_identity:
    'HubSpot did not return enough information to identify your account.',
  account_blocked: 'Your Synkazo account is blocked. Contact an administrator.',
  organisation_suspended:
    'Your Synkazo organisation is suspended. Contact an administrator.',
  registration_disabled:
    'New account registration is currently disabled. Existing users can still sign in.',
  portal_already_linked:
    'This HubSpot account is already connected to a Synkazo organisation. Ask its administrator to invite you.',
  identity_conflict:
    'This HubSpot identity cannot be linked safely. Contact Synkazo support.',
  callback_failed: 'We could not complete HubSpot login. Please try again.',
};

export default function Login() {
  const { login, currentUser, isLoading } = useSynkazoAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [hubspotRedirecting, setHubspotRedirecting] = useState(false);
  const {
    register: registerField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  // Only ever a same-origin path — an absolute URL here would be an open redirect.
  const rawRedirect = new URLSearchParams(window.location.search).get(
    'redirect',
  );
  const redirectTo =
    rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : null;

  // A visitor who picked a plan on the marketing site's /pricing page lands here with
  // `?plan=<id>&interval=<month|year>` on the URL — remember it (same-origin from here on)
  // so the redirects below can resume straight into checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan) {
      savePendingPlan({
        plan,
        interval: params.get('interval') === 'year' ? 'year' : 'month',
      });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('hubspot_error');
    if (!code) return;
    setError(
      HUBSPOT_ERROR_MESSAGES[code] ?? HUBSPOT_ERROR_MESSAGES.callback_failed,
    );
    params.delete('hubspot_error');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, []);

  // Fetch auth pages settings to check if registration is enabled
  useEffect(() => {
    let isMounted = true;

    authPagesSettingsApi
      .get()
      .then((settings) => {
        if (isMounted) {
          setRegistrationEnabled(settings.register);
        }
      })
      .catch((err) => {
        // On error or no response, default to showing the registration link (enabled)
        if (isMounted) {
          console.error('Failed to fetch auth pages settings:', err);
          setRegistrationEnabled(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const resumeTarget = () => {
    const pending = consumePendingPlan();
    return pending
      ? `/checkout?plan=${pending.plan}&interval=${pending.interval}`
      : '/dashboard';
  };

  useEffect(() => {
    if (isLoading || !currentUser) return;
    // A redirect target means another flow (the HubSpot install) needs a
    // specific account. Drop whatever session this browser is holding instead
    // of silently dumping the visitor into it; the reload keeps the target.
    if (redirectTo) {
      apiClient
        .post('/auth/logout', {
          refreshToken: tokenStorage.getToken('refreshToken'),
        })
        .catch(() => {});
      tokenStorage.clearTokens();
      window.location.reload();
      return;
    }
    navigate(resumeTarget(), { replace: true });
  }, [currentUser, isLoading, navigate, redirectTo]);

  if (isLoading || currentUser) return null;

  const onSubmit = async (values: LoginFormValues) => {
    setError('');
    setUnverifiedEmail('');
    try {
      await login(values.email, values.password, values.remember);
      showToast.success("Welcome back! You've logged in successfully.");
      navigate(redirectTo ?? resumeTarget(), {
        replace: true,
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email);
        setError('email_not_verified');
      } else {
        setError(msg || 'Invalid email or password.');
      }
    }
  };

  const handleHubSpotLogin = () => {
    if (hubspotRedirecting) return;
    setHubspotRedirecting(true);
    const pending = readPendingPlan();
    const returnTo =
      redirectTo ??
      (pending
        ? `/checkout?plan=${encodeURIComponent(pending.plan)}&interval=${pending.interval}`
        : '/dashboard');
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    window.location.assign(
      `${apiBase}/marketplace/hubspot/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  };

  return (
    <SplitAuthLayout
      variant="immersive"
      panelFooter={
        <div className="synkazo-login-trust" aria-label="Security features">
          <div>
            <ShieldCheck />
            <span>
              <strong>Secure access</strong>
              <small>Your data stays protected</small>
            </span>
          </div>
          <div>
            <LockKeyhole />
            <span>
              <strong>Encrypted connections</strong>
              <small>End-to-end security</small>
            </span>
          </div>
          <div>
            <UsersRound />
            <span>
              <strong>Role-based access</strong>
              <small>Control team permissions</small>
            </span>
          </div>
        </div>
      }
    >
      <div className="synkazo-login-heading">
        <p className="synkazo-login-eyebrow">SECURE. SYNC. SCALE.</p>
        <h1>Welcome back</h1>
      </div>

      {error === 'email_not_verified' ? (
        <Alert variant="destructive" className="mt-6">
          <Mail />
          <AlertTitle>Your email address hasn't been verified yet.</AlertTitle>
          <AlertDescription>
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0"
              onClick={() =>
                navigate('/register', {
                  state: { verifyEmail: unverifiedEmail },
                })
              }
            >
              Enter verification code
            </Button>
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-7 space-y-5">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full"
          aria-label="Login with HubSpot"
          disabled={hubspotRedirecting}
          onClick={handleHubSpotLogin}
        >
          <PlatformIcon platformId="hubspot" size={20} />
          {hubspotRedirecting
            ? 'Redirecting to HubSpot…'
            : 'Login with HubSpot'}
        </Button>
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs font-medium uppercase">
            or
          </span>
          <span className="bg-border h-px flex-1" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="synkazo-login-form"
        noValidate
      >
        <FieldGroup className="synkazo-login-fields">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <AuthInput
              icon={Mail}
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...registerField('email')}
            />
            <FieldError id="login-email-error" errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              {...registerField('password')}
            />
            <FieldError id="login-password-error" errors={[errors.password]} />
          </Field>

          <div className="synkazo-login-options">
            <label className="synkazo-login-remember">
              <Controller
                name="remember"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="remember"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    onBlur={field.onBlur}
                  />
                )}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="synkazo-login-forgot">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="synkazo-login-submit"
          >
            {isSubmitting ? (
              'Signing in…'
            ) : (
              <>
                Sign in <ArrowRight />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      {/* Registration link hidden when registration is disabled */}
      {registrationEnabled && (
        <p className="synkazo-login-register">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-primary font-semibold hover:underline"
          >
            Create one free
          </Link>
        </p>
      )}
    </SplitAuthLayout>
  );
}
