import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import apiClient from '@/api/apiClient';
import AuthStatus from '@/components/auth/AuthStatus';
import SplitAuthLayout from '@/components/auth/SplitAuthLayout';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/lib/authValidation';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await apiClient.post('/auth/forgot-password', {
        email: values.email.toLowerCase(),
      });
    } catch {
      /* Always show success to avoid email enumeration */
    } finally {
      setSentEmail(values.email);
      setSent(true);
    }
  };

  return (
    <SplitAuthLayout variant="immersive">
      {sent ? (
        <div>
          <AuthStatus
            icon={CheckCircle2}
            tone="success"
            title="Check your email"
            description={
              <>
                If an account exists for{' '}
                <span className="text-foreground font-medium">{sentEmail}</span>
                , you'll receive a password reset link shortly.
              </>
            }
          >
            <Button asChild variant="link" size="sm">
              <Link to="/login">
                <ArrowLeft /> Back to sign in
              </Link>
            </Button>
          </AuthStatus>
        </div>
      ) : (
        <>
          <div className="synkazo-login-heading">
            <p className="synkazo-login-eyebrow">SECURE ACCOUNT RECOVERY.</p>
            <h1>Forgot password?</h1>
            <p>Enter your email and we'll send a reset link.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email" required>
                  Email address
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!errors.email}
                  aria-describedby={
                    errors.email ? 'forgot-email-error' : undefined
                  }
                  {...register('email')}
                />
                <FieldError id="forgot-email-error" errors={[errors.email]} />
              </Field>
              <Button type="submit" size="lg" loading={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-6 text-center">
            <Button asChild variant="link" size="sm">
              <Link to="/login">
                <ArrowLeft /> Back to sign in
              </Link>
            </Button>
          </div>
        </>
      )}
    </SplitAuthLayout>
  );
}
