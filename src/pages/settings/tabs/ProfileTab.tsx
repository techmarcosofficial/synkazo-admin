import { Building2, Lock, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { useMyOrgQuery } from '@/queries/useOrganisations';
import { useUpdateMeMutation } from '@/queries/useUsers';

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

/**
 * Who the signed-in user is. Strictly personal — the organisation name appears
 * only as read-only context so the user can tell which tenant they are in, and
 * plan, billing, team and invitations all live under /organization instead.
 */
export default function ProfileTab() {
  const { currentUser, refreshUser } = useSynkazoAuth();
  const updateMeMutation = useUpdateMeMutation();
  const { data: org } = useMyOrgQuery();

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    department: '',
  });
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setProfile({
      fullName: currentUser.fullName || '',
      email: currentUser.email || '',
      department: currentUser.department || '',
    });
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
      await refreshUser();
      showToast.success('Profile updated.');
    } catch (err) {
      showToast.error(errorMessage(err, 'Failed to save changes'));
    }
  };

  const handleSaveEmail = async () => {
    const normalized = newEmail.trim().toLowerCase();
    if (!normalized) {
      showToast.error('Enter a new email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      showToast.error('Enter a valid email');
      return;
    }
    if (normalized === profile.email.toLowerCase()) {
      showToast.error('Same as current email');
      return;
    }
    setEmailSaving(true);
    try {
      await updateMeMutation.mutateAsync({ email: normalized });
      await refreshUser();
      setProfile((p) => ({ ...p, email: normalized }));
      setEditingEmail(false);
      setNewEmail('');
      showToast.success('Email updated.');
    } catch (err) {
      showToast.error(errorMessage(err, 'Failed to update email'));
    } finally {
      setEmailSaving(false);
    }
  };

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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {currentUser?.role && (
              <Badge className="bg-primary/10 text-primary">
                {roleLabel(currentUser.role)}
              </Badge>
            )}
            {org?.name && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Building2 className="size-3" />
                {org.name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="text-muted-foreground size-4" /> Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-lg">
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
                    <span className="text-foreground">{profile.email}</span>
                  </div>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                    autoFocus
                    placeholder="New email address"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
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
                  setProfile((p) => ({ ...p, department: e.target.value }))
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
    </div>
  );
}
