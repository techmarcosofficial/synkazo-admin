import { Lock, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
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
  useDeleteMeMutation,
  useMyOwnershipSummaryQuery,
} from '@/queries/useUsers';

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

/**
 * Access and account lifecycle for the signed-in user. Split out of Profile so
 * that page stays purely informational, and so this one has somewhere obvious to
 * grow: two-factor auth, active sessions, recent sign-ins, connected providers.
 */
export default function SecurityTab() {
  const { logout } = useSynkazoAuth();
  const navigate = useNavigate();
  const changePasswordMutation = useChangePasswordMutation();
  const deleteMeMutation = useDeleteMeMutation();
  const ownershipSummaryQuery = useMyOwnershipSummaryQuery();
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

  const runFinalDelete = async () => {
    try {
      await deleteMeMutation.mutateAsync();
      logout();
      navigate('/login');
    } catch (err) {
      showToast.error(errorMessage(err, 'Failed to delete account'));
    }
  };

  const openFinalDeleteConfirm = () => {
    let typedConfirmation = '';
    confirm({
      variant: 'danger',
      title: 'Are you absolutely sure?',
      description:
        'This action is permanent and you will lose access immediately.',
      body: (
        <Input
          placeholder='Type "DELETE" to confirm'
          onChange={(e) => {
            typedConfirmation = e.target.value;
          }}
        />
      ),
      confirmLabel: 'Confirm Deletion',
      onConfirm: async () => {
        if (typedConfirmation.trim().toUpperCase() !== 'DELETE') {
          showToast.error('Type "DELETE" to confirm.');
          throw new Error('confirmation text mismatch');
        }
        await runFinalDelete();
      },
    });
  };

  const handleDeleteAccount = async () => {
    const { data: summary } = await ownershipSummaryQuery.refetch();
    confirm({
      variant: 'danger',
      title: 'Delete your account?',
      description: 'This cannot be undone.',
      body: (
        <div className="space-y-3 text-sm">
          <div className="bg-muted overflow-hidden rounded-4xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border/60 border-b text-left">
                  <th className="px-4 py-2 font-medium">Account Assets</th>
                  <th className="px-4 py-2 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-border/60 border-b">
                  <td className="px-4 py-2">Projects</td>
                  <td className="px-4 py-2 text-right">
                    {summary?.projectsCount ?? 0}
                  </td>
                </tr>
                <tr className="border-border/60 border-b">
                  <td className="px-4 py-2">Total Jobs</td>
                  <td className="px-4 py-2 text-right">
                    {summary?.jobsCount ?? 0}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Synced Records</td>
                  <td className="px-4 py-2 text-right">
                    {(summary?.totalRecordsSynced ?? 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-muted overflow-hidden rounded-4xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border/60 border-b text-left">
                  <th className="px-4 py-2 font-medium">Job Activity</th>
                  <th className="px-4 py-2 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-border/60 border-b">
                  <td className="px-4 py-2">Currently Running</td>
                  <td className="px-4 py-2 text-right">
                    {summary?.runningJobsCount ?? 0}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Active Scheduled</td>
                  <td className="px-4 py-2 text-right">
                    {summary?.scheduledJobsCount ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">
            This data will remain in the system but will no longer be attributed
            to your account.
          </p>
        </div>
      ),
      confirmLabel: 'Delete Account',
      onConfirm: () => {
        // Chain to the second (final) confirmation once this dialog's own
        // close animation/state reset has run — calling confirm() again
        // synchronously here would have it immediately clobbered by
        // handleConfirm's post-resolve `open: false`.
        setTimeout(openFinalDeleteConfirm, 0);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="text-muted-foreground size-4" /> Change Password
          </CardTitle>
          <CardDescription>
            Use a password you do not reuse anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-lg">
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

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <ShieldAlert className="size-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-muted-foreground text-xs">
              Permanently delete your account and sign out.
            </p>
          </div>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
