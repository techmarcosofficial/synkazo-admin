import { Building2, Lock, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import SecurityTab from './SecurityTab';

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
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { useUpdateMeMutation } from '@/queries/useUsers';

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

/**
 * Personal details and account security live together. Identity, role,
 * organisation, and status are deliberately shown only in SettingsHeader.
 */
export default function ProfileTab() {
  const { currentUser, refreshUser } = useSynkazoAuth();
  const updateMeMutation = useUpdateMeMutation();

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
    <div className="grid w-full gap-4 lg:grid-cols-2">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="text-muted-foreground size-4" /> Personal Details
          </CardTitle>
          <CardDescription>
            Keep your personal information accurate and up to date.
          </CardDescription>
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

      <SecurityTab />
    </div>
  );
}
