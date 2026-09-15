import { z } from 'zod';

import { getPasswordError } from './passwordValidation';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email address is required.')
  .email('Enter a valid email address.');

const registrationPasswordSchema = z.string().superRefine((password, ctx) => {
  if (!password) {
    ctx.addIssue({
      code: 'custom',
      message: 'Password is required.',
    });
    return;
  }

  const message = getPasswordError(password);
  if (message) {
    ctx.addIssue({ code: 'custom', message });
  }
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .max(100, 'Full name must be 100 characters or fewer.'),
    email: emailSchema,
    orgName: z
      .string()
      .trim()
      .min(1, 'Organization name is required.')
      .max(160, 'Organization name must be 160 characters or fewer.'),
    password: registrationPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
