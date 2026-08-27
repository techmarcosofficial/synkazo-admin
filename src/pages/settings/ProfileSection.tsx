import { Building2, Lock, Mail, ShieldAlert, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import apiClient from '@/api/apiClient';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import PlanBadge from '@/components/shared/PlanBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getPasswordError } from '@/lib/passwordValidation';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { usePlanQuery } from '@/queries/useBilling';
import {
  useDeleteMeMutation,
  useMyOwnershipSummaryQuery,
  useUpdateMeMutation,
} from '@/queries/useUsers';

export default function ProfileSection({
  onManageBilling,
}: {
  onManageBilling: () => void;
}) {
  const { currentUser, hasRole, logout } = useSynkazoAuth();
  const navigate = useNavigate();
  const updateMeMutation = useUpdateMeMutation();
  const deleteMeMutation = useDeleteMeMutation();
  const ownershipSummaryQuery = useMyOwnershipSummaryQuery();
  const { confirm } = useConfirmDialog();
  const { data: plan } = usePlanQuery();

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    department: '',
  });

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfile({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        department: currentUser.department || '',
      });
    }
  }, [currentUser]);

  const avatarInitials = profile.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : profile.email?.charAt(0)?.toUpperCase() || '?';

  const handleSave = async () => {
    try {
      await updateMeMutation.mutateAsync({
        fullName: profile.fullName,
        department: profile.department,
      });
      showToast.success('Profile updated.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to save changes');
    }
  };

  const handleSaveEmail = async () => {
    const normalized = newEmail.trim().toLowerCase();
    if (!normalized) {
      toast.error('Enter a new email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.error('Enter a valid email');
      return;
    }
    if (normalized === profile.email.toLowerCase()) {
      toast.error('Same as current email');
      return;
    }
    setEmailSaving(true);
    try {
      await updateMeMutation.mutateAsync({ email: normalized });
      setProfile((p) => ({ ...p, email: normalized }));
      setEditingEmail(false);
      setNewEmail('');
      toast.success('Email updated.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) {
      toast.error('Enter your current password');
      return;
    }
    const passwordError = getPasswordError(pwForm.newPw);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.newPw,
      });
      toast.success('Password changed.');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const runFinalDelete = async () => {
    try {
      await deleteMeMutation.mutateAsync();
      logout();
      navigate('/login');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to delete account');
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
          toast.error('Type "DELETE" to confirm.');
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
          <div className="bg-muted overflow-hidden rounded-lg">
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
          <div className="bg-muted overflow-hidden rounded-lg">
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

  const roleBadge = currentUser?.role?.replace('_', ' ');

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="space-y-1">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <p className="truncate text-base font-semibold">
            {profile.fullName || profile.email}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {profile.email}
          </p>
          <div className="mt-3 flex gap-2">
            {roleBadge && (
              <Badge className="bg-primary/10 text-primary capitalize">
                {roleBadge}
              </Badge>
            )}
            {plan && <PlanBadge planName={plan.planName} />}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                Update you profile informations
              </h3>
              <p className="text-xs font-light">
                Update you profile informations
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="text-muted-foreground size-4" /> Personal
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                    <Input
                      id="fullName"
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, fullName: e.target.value }))
                      }
                      placeholder="Your full name"
                    />
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="flex items-center gap-1.5">
                        <Mail className="size-3" /> Email
                      </FieldLabel>
                      {!editingEmail && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => {
                            setEditingEmail(true);
                            setNewEmail('');
                          }}
                        >
                          Change
                        </Button>
                      )}
                    </div>
                    {editingEmail ? (
                      <div className="flex flex-col gap-2">
                        <div className="bg-muted text-muted-foreground rounded-3xl px-4 py-2 text-xs">
                          Current:{' '}
                          <span className="text-foreground">
                            {profile.email}
                          </span>
                        </div>
                        <Input
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          type="email"
                          autoFocus
                          placeholder="New email address"
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleSaveEmail()
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEmail}
                            loading={emailSaving}
                          >
                            Confirm Change
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingEmail(false);
                              setNewEmail('');
                            }}
                            disabled={emailSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted text-muted-foreground flex h-9 items-center gap-2 rounded-3xl px-4 text-sm">
                        <Lock className="size-3 shrink-0" />
                        {profile.email}
                      </div>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="department"
                      className="flex items-center gap-1.5"
                    >
                      <Building2 className="size-3" /> Department
                    </FieldLabel>
                    <Input
                      id="department"
                      value={profile.department}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          department: e.target.value,
                        }))
                      }
                      placeholder="e.g. Operations, IT, Sales"
                    />
                  </Field>

                  <Button
                    className="w-fit"
                    onClick={handleSave}
                    loading={updateMeMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="text-muted-foreground size-4" /> Change
                  Password
                </CardTitle>
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
                    loading={pwSaving}
                  >
                    Change Password
                  </Button>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
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
