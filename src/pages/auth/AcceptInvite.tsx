import { AlertCircle, ArrowRight, CheckCircle, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { invitationsApi } from '@/api/invitations';
import AuthInput from '@/components/auth/AuthInput';
import AuthStatus from '@/components/auth/AuthStatus';
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
import { Spinner } from '@/components/ui/spinner';
import { getPasswordError } from '@/lib/passwordValidation';
import { roleLabel } from '@/lib/permissions';
import { type UserRole } from '@/types';

interface AcceptResult {
  organisationName?: string;
  role?: string;
}

type Status = 'form' | 'submitting' | 'success' | 'error';
type InviteFieldErrors = Partial<
  Record<'fullName' | 'password' | 'confirmPassword', string>
>;

export default function AcceptInvite() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [status, setStatus] = useState<Status>(token ? 'form' : 'error');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});
  const [data, setData] = useState<AcceptResult | null>(null);
  const [errorMsg, setErrorMsg] = useState(
    token ? '' : 'No invitation token found.',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: InviteFieldErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    setErrorMsg('');
    setStatus('submitting');
    try {
      const result = await invitationsApi.acceptInvitation({
        token: token ?? '',
        fullName: fullName.trim(),
        password,
      });
      setData(result);
      setStatus('success');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        e.response?.data?.message ??
          'This invitation is invalid or has expired.',
      );
      setStatus('error');
    }
  };

  return (
    <SplitAuthLayout variant="immersive" showBackToHome={false}>
      {(status === 'form' || status === 'submitting') && (
        <>
          <div className="synkazo-login-heading">
            <p className="synkazo-login-eyebrow">YOU'RE INVITED.</p>
            <h1>Accept your invitation</h1>
            <p>Set up your account to join your organisation.</p>
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="synkazo-register-alert">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit}
            className="synkazo-login-form synkazo-register-form"
            aria-busy={status === 'submitting'}
            noValidate
          >
            <FieldGroup className="synkazo-login-fields synkazo-register-fields">
              <Field data-invalid={!!fieldErrors.fullName}>
                <FieldLabel htmlFor="invite-name" required>
                  Full Name
                </FieldLabel>
                <AuthInput
                  icon={UserRound}
                  id="invite-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      fullName: undefined,
                    }));
                  }}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  aria-invalid={!!fieldErrors.fullName}
                  aria-describedby={
                    fieldErrors.fullName ? 'invite-name-error' : undefined
                  }
                  required
                  autoFocus
                />
                <FieldError id="invite-name-error">
                  {fieldErrors.fullName}
                </FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.password}>
                <FieldLabel htmlFor="invite-password" required>
                  Password
                </FieldLabel>
                <PasswordInput
                  id="invite-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      password: undefined,
                    }));
                  }}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? 'invite-password-error' : undefined
                  }
                  required
                  minLength={8}
                />
                <PasswordStrength password={password} />
                <FieldError id="invite-password-error">
                  {fieldErrors.password}
                </FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.confirmPassword}>
                <FieldLabel htmlFor="invite-confirm" required>
                  Confirm Password
                </FieldLabel>
                <PasswordInput
                  id="invite-confirm"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      confirmPassword: undefined,
                    }));
                  }}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? 'invite-confirm-error'
                      : undefined
                  }
                  required
                />
                <FieldError id="invite-confirm-error">
                  {fieldErrors.confirmPassword}
                </FieldError>
              </Field>
              <Button
                type="submit"
                size="lg"
                disabled={status === 'submitting'}
                className="synkazo-login-submit"
              >
                {status === 'submitting' ? (
                  <>
                    <Spinner /> Creating account…
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight />
                  </>
                )}
              </Button>
            </FieldGroup>
          </form>
          <p className="synkazo-register-signin">
            Already have an account?{' '}
            <Link to="/login" className="synkazo-register-link">
              Sign in
            </Link>
          </p>
        </>
      )}

      {status === 'success' && (
        <div className="synkazo-invite-status">
          <AuthStatus
            icon={CheckCircle}
            tone="success"
            title="Account Created!"
            description={
              <>
                You've joined{' '}
                <strong className="text-foreground">
                  {data?.organisationName || 'the organisation'}
                </strong>{' '}
                as{' '}
                <strong className="text-primary">
                  {roleLabel(data?.role as UserRole)}
                </strong>
                .
              </>
            }
          >
            <Button asChild size="lg" className="synkazo-login-submit">
              <Link to="/login">
                Go to Login <ArrowRight />
              </Link>
            </Button>
          </AuthStatus>
        </div>
      )}

      {status === 'error' && (
        <div className="synkazo-invite-status">
          <AuthStatus
            icon={AlertCircle}
            tone="danger"
            title="Invitation Failed"
            description={
              errorMsg || 'This invitation is invalid or has expired.'
            }
          >
            <Button
              asChild
              variant="outline"
              size="lg"
              className="synkazo-login-submit"
            >
              <Link to="/login">Back to Login</Link>
            </Button>
          </AuthStatus>
        </div>
      )}
    </SplitAuthLayout>
  );
}
