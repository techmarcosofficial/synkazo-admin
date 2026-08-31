import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { authApi } from '@/api/auth';
import BrandMark from '@/components/auth/BrandMark';
import OtpInput from '@/components/auth/OtpInput';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getPasswordError } from '@/lib/passwordValidation';
import { consumePendingPlan, savePendingPlan } from '@/lib/pendingPlan';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';

type Step = 'form' | 'otp';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { register, verifyOtp, currentUser, isLoading } = useSynkazoAuth();

  // An unverified user redirected here from /login arrives straight on the code
  // step; we send them a fresh code on arrival since their original may have expired.
  const seededEmail = (location.state as { verifyEmail?: string } | null)
    ?.verifyEmail;

  // A visitor who picked a plan on the marketing site's /pricing page lands here with
  // `?plan=<id>&interval=<month|year>` on the URL — remember it (same-origin from here on)
  // so the post-auth redirect below can resume straight into checkout.
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      savePendingPlan({
        plan,
        interval: searchParams.get('interval') === 'year' ? 'year' : 'month',
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && currentUser) {
      const pending = consumePendingPlan();
      navigate(
        pending
          ? `/checkout?plan=${pending.plan}&interval=${pending.interval}`
          : '/dashboard',
        { replace: true },
      );
    }
  }, [currentUser, isLoading, navigate]);

  const [step, setStep] = useState<Step>(seededEmail ? 'otp' : 'form');
  const [form, setForm] = useState({
    fullName: '',
    email: seededEmail ?? '',
    orgName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP step state
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Fire a fresh code once when arriving on the code step from /login.
  const autoSent = useRef(false);
  useEffect(() => {
    if (seededEmail && !autoSent.current) {
      autoSent.current = true;
      authApi.resendVerification(seededEmail).catch(() => {});
    }
  }, [seededEmail]);

  if (isLoading || currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (
      !form.fullName ||
      !form.email ||
      !form.password ||
      !form.orgName ||
      !form.confirmPassword
    ) {
      setError('Please fill in all required fields.');
      return;
    }
    const passwordError = getPasswordError(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      setStep('otp');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e.response?.data?.message || 'Registration failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    setOtpError('');
    try {
      // Auto-logs in and sets currentUser — the effect above handles redirect.
      await verifyOtp(form.email, value);
      showToast.success('Email verified — welcome to synkazo!');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setOtpError(
        e.response?.data?.message || 'Invalid code. Please try again.',
      );
      setCode('');
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setOtpError('');
    try {
      await authApi.resendVerification(form.email);
    } catch {
      /* backend always returns success to avoid enumeration */
    } finally {
      setResendSent(true);
      setResendLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <SplitAuthLayout>
        <BrandMark />

        <div className="mt-9 space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">
            Verify your email
          </h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code we sent to{' '}
            <span className="text-foreground font-medium">{form.email}</span>
          </p>
        </div>

        {otpError && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{otpError}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(code);
          }}
          className="mt-8"
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Verification code</FieldLabel>
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (v.length === 6) handleVerify(v);
                }}
                disabled={verifying}
                autoFocus
              />
            </Field>

            <Button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full"
            >
              {verifying ? (
                <Spinner />
              ) : (
                <>
                  Verify &amp; Continue <ArrowRight />
                </>
              )}
            </Button>
          </FieldGroup>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          {resendSent ? (
            <p className="text-success flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4" /> New code sent — check your
              inbox.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Didn't get it?{' '}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending…' : 'Resend code'}
              </Button>
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setCode('');
              setOtpError('');
              setResendSent(false);
            }}
            className="text-muted-foreground inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Use a different email
          </button>
        </div>
      </SplitAuthLayout>
    );
  }

  return (
    <SplitAuthLayout>
      <BrandMark />

      <div className="mt-9 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Get started — your first project is free
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="fullName" required>
              Full Name
            </FieldLabel>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email" required>
              Email
            </FieldLabel>
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
            <FieldLabel htmlFor="orgName" required>
              Organization Name
            </FieldLabel>
            <Input
              id="orgName"
              value={form.orgName}
              onChange={(e) => setForm({ ...form, orgName: e.target.value })}
              placeholder="Acme Corp"
              autoComplete="organization"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password" required>
              Password
            </FieldLabel>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            <PasswordStrength password={form.password} />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword" required>
              Confirm Password
            </FieldLabel>
            <PasswordInput
              id="confirmPassword"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Spinner />
            ) : (
              <>
                Create Account <ArrowRight />
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            By creating an account you agree to our{' '}
            <a
              href={`${import.meta.env.VITE_FRONTEND_URL}/terms`}
              className="text-primary hover:underline"
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              href={`${import.meta.env.VITE_FRONTEND_URL}/privacy`}
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </FieldGroup>
      </form>

      <p className="text-muted-foreground mt-6 text-sm">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </SplitAuthLayout>
  );
}
