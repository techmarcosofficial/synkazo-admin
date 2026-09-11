import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { authApi } from '@/api/auth';
import OtpInput from '@/components/auth/OtpInput';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { registerSchema, type RegisterFormValues } from '@/lib/authValidation';
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
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(seededEmail ?? '');
  const {
    register: registerField,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: seededEmail ?? '',
      orgName: '',
      password: '',
      confirmPassword: '',
    },
  });
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

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

  // Once confirmation has been touched, changing the original password should
  // update the match error immediately rather than waiting for another blur.
  useEffect(() => {
    if (touchedFields.confirmPassword) {
      void trigger();
    }
  }, [password, confirmPassword, touchedFields.confirmPassword, trigger]);

  if (isLoading || currentUser) return null;

  const onSubmit = async (values: RegisterFormValues) => {
    setError('');
    try {
      await register(values);
      setVerificationEmail(values.email);
      setStep('otp');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e.response?.data?.message || 'Registration failed. Please try again.',
      );
    }
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    setOtpError('');
    try {
      // Auto-logs in and sets currentUser — the effect above handles redirect.
      await verifyOtp(verificationEmail, value);
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
      await authApi.resendVerification(verificationEmail);
    } catch {
      /* backend always returns success to avoid enumeration */
    } finally {
      setResendSent(true);
      setResendLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <SplitAuthLayout variant="immersive">
        <div className="synkazo-login-heading">
          <p className="synkazo-login-eyebrow">ONE LAST STEP.</p>
          <h1>Verify your email</h1>
          <p>
            Enter the 6-digit code we sent to{' '}
            <span className="text-foreground font-medium">
              {verificationEmail}
            </span>
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
              size="lg"
              disabled={verifying || code.length !== 6}
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
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending…' : 'Resend code'}
              </Button>
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep('form');
              setCode('');
              setOtpError('');
              setResendSent(false);
            }}
          >
            <ArrowLeft /> Use a different email
          </Button>
        </div>
      </SplitAuthLayout>
    );
  }

  return (
    <SplitAuthLayout variant="immersive">
      <div className="synkazo-login-heading">
        <p className="synkazo-login-eyebrow">START. SYNC. SCALE.</p>
        <h1>Create your account</h1>
        <p>Get started — your first project is free</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="fullName" required>
              Full Name
            </FieldLabel>
            <Input
              id="fullName"
              placeholder="Jane Smith"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              aria-describedby={
                errors.fullName ? 'register-name-error' : undefined
              }
              {...registerField('fullName')}
            />
            <FieldError id="register-name-error" errors={[errors.fullName]} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email" required>
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? 'register-email-error' : undefined
              }
              {...registerField('email')}
            />
            <FieldError id="register-email-error" errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.orgName}>
            <FieldLabel htmlFor="orgName" required>
              Organization Name
            </FieldLabel>
            <Input
              id="orgName"
              placeholder="Acme Corp"
              autoComplete="organization"
              aria-invalid={!!errors.orgName}
              aria-describedby={
                errors.orgName ? 'register-organization-error' : undefined
              }
              {...registerField('orgName')}
            />
            <FieldError
              id="register-organization-error"
              errors={[errors.orgName]}
            />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password" required>
              Password
            </FieldLabel>
            <PasswordInput
              id="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'register-password-error' : undefined
              }
              {...registerField('password')}
            />
            <PasswordStrength password={password} />
            <FieldError
              id="register-password-error"
              errors={[errors.password]}
            />
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword" required>
              Confirm Password
            </FieldLabel>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword
                  ? 'register-confirm-password-error'
                  : undefined
              }
              {...registerField('confirmPassword')}
            />
            <FieldError
              id="register-confirm-password-error"
              errors={[errors.confirmPassword]}
            />
          </Field>

          <Button type="submit" size="lg" loading={isSubmitting}>
            {isSubmitting ? (
              'Creating account…'
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
