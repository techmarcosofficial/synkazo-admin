import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getPasswordError } from '@/lib/passwordValidation';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import {
  useChangePasswordMutation,
  useDeactivateMeMutation,
} from '@/queries/useUsers';

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

/**
 * Password and account-lifecycle sections composed into Profile & Account.
 */
export default function SecurityTab() {
  const { currentUser, logout } = useSynkazoAuth();
  const changePasswordMutation = useChangePasswordMutation();
  const deactivateMeMutation = useDeactivateMeMutation();
  const { confirm } = useConfirmDialog();

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  const handleChangePassword = async () => {
    if (!pwForm.current) {
      showToast.error('Enter your current password');
      return;
    }
    const passwordError = getPasswordError(pwForm.newPw);
    if (passwordError) {
      showToast.error(passwordError);
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showToast.error('Passwords do not match');
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: pwForm.current,
        newPassword: pwForm.newPw,
      });
      showToast.success('Password changed.');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      showToast.error(errorMessage(err, 'Failed to change password'));
    }
  };

  const handleDeactivateAccount = () => {
    let typedConfirmation = '';
    confirm({
      variant: 'danger',
      title: 'Deactivate your account?',
      description: `You will be signed out immediately. An administrator can reactivate your account later.${currentUser?.role === 'super_admin' ? '' : ' Jobs you created will be paused.'}`,
      body: (
        <Input
          aria-label="Type DEACTIVATE to confirm"
          placeholder='Type "DEACTIVATE" to confirm'
          onChange={(e) => {
            typedConfirmation = e.target.value;
          }}
        />
      ),
      confirmLabel: 'Deactivate Account',
      onConfirm: async () => {
        if (typedConfirmation.trim().toUpperCase() !== 'DEACTIVATE') {
          showToast.error('Type "DEACTIVATE" to confirm.');
          throw new Error('confirmation text mismatch');
        }
        try {
          await deactivateMeMutation.mutateAsync();
          logout();
        } catch (err) {
          showToast.error(errorMessage(err, 'Failed to deactivate account'));
          throw err;
        }
      },
    });
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader visualLevel="section">
          <CardTitle className="flex items-center gap-2">
            <Lock className="text-muted-foreground size-4" /> Password &
            Security
          </CardTitle>
          <CardDescription>
            Protect your account with a strong, unique password.
          </CardDescription>
          <Badge size="md" className="bg-success/10 text-success mt-2 gap-1.5">
            <ShieldCheck className="size-3.5" /> Account protected
          </Badge>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-pw" required>
                Current Password
              </FieldLabel>
              <PasswordInput
                id="current-pw"
                value={pwForm.current}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, current: e.target.value }))
                }
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-pw" required>
                New Password
              </FieldLabel>
              <PasswordInput
                id="new-pw"
                value={pwForm.newPw}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, newPw: e.target.value }))
                }
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <PasswordStrength password={pwForm.newPw} />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-pw" required>
                Confirm New Password
              </FieldLabel>
              <PasswordInput
                id="confirm-pw"
                value={pwForm.confirm}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, confirm: e.target.value }))
                }
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Button
              className="w-fit"
              onClick={handleChangePassword}
              loading={changePasswordMutation.isPending}
            >
              Change Password
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 lg:col-span-2">
        <CardHeader visualLevel="section">
          <CardTitle className="text-destructive flex items-center gap-2">
            <ShieldAlert className="size-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Manage access to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-3xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Deactivate Account</p>
              <p className="text-muted-foreground text-xs">
                Sign out and disable access until an administrator reactivates
                your account.
              </p>
            </div>
            <Button
              className="w-fit shrink-0"
              variant="destructive"
              onClick={handleDeactivateAccount}
              loading={deactivateMeMutation.isPending}
            >
              Deactivate Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
