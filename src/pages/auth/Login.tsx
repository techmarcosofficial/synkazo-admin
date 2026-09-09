import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import apiClient from '@/api/apiClient';
import PasswordInput from '@/components/auth/PasswordInput';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { consumePendingPlan, savePendingPlan } from '@/lib/pendingPlan';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { tokenStorage } from '@/lib/tokenStorage';
import { authPagesSettingsApi } from '@/api/auth-pages-settings';

export default function Login() {
  const { login, currentUser, isLoading } = useSynkazoAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password, form.remember);
      showToast.success("Welcome back! You've logged in successfully.");
      navigate(redirectTo ?? resumeTarget(), {
        replace: true,
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(form.email.trim().toLowerCase());
        setError('email_not_verified');
      } else {
        setError(msg || 'Invalid email or password.');
      }
      setLoading(false);
    }
  };

  return (
    <SplitAuthLayout variant="immersive">
      <div className="synkazo-login-heading">
        <p className="synkazo-login-eyebrow">SECURE. SYNC. SCALE.</p>
        <h1>Welcome back</h1>
        <p>
          Access your Synkazo account and keep your
          <br className="synkazo-wide-only" /> data perfectly in sync.
        </p>
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

      <form onSubmit={handleSubmit} className="synkazo-login-form">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.remember}
                onCheckedChange={(v) =>
                  setForm({ ...form, remember: v === true })
                }
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-primary text-sm font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                Sign in <ArrowRight />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      <div className="synkazo-login-divider">
        <span>or continue with</span>
      </div>

      <div className="synkazo-login-socials">
        <Button variant="outline" size="lg" asChild>
          <a href={`${import.meta.env.VITE_FRONTEND_URL}/install`}>
            <img src="/hubspot-logo.svg" alt="" className="size-4" />
            Login with HubSpot
          </a>
        </Button>
      </div>

      {/* Registration link hidden when registration is disabled */}
      {registrationEnabled && (
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-primary font-semibold hover:underline"
          >
            Create one free
          </Link>
        </p>
      )}

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
    </SplitAuthLayout>
  );
}
