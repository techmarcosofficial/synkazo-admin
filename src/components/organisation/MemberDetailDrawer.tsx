import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Save,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { ProjectAccessGrant } from '@/api/invitations';
import FormDrawer from '@/components/form/FormDrawer';
import { cn } from '@/lib/utils';
import ProjectMultiSelect from '@/components/shared/ProjectMultiSelect';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getPermissionsForRole,
  roleLabel,
} from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  useResetPasswordByAdminMutation,
  useUpdateUserMutation,
  useUserProjectAccessQuery,
} from '@/queries/useUsers';
import type { Permission, UserRole } from '@/types';

export interface MemberDetailTarget {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
  isActive: boolean;
  isOwner?: boolean;
  organisationId?: string;
  organisationName?: string;
  department?: string | null;
  isEmailVerified?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  permissions?: string[] | null;
}

export interface MemberDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDetailTarget | null;
  isSuperAdmin?: boolean;
  onDeactivate?: (member: MemberDetailTarget, reason?: string) => Promise<void> | void;
  onReactivate?: (member: MemberDetailTarget) => Promise<void> | void;
  onTransferOwnership?: (member: MemberDetailTarget) => void;
}

const EDITABLE_PERMISSION_GROUPS = PERMISSION_GROUPS.filter(
  (group) => !['Connections', 'Team', 'Logs'].includes(group.label),
);

export default function MemberDetailDrawer({
  open,
  onOpenChange,
  member,
  isSuperAdmin = false,
  onDeactivate,
  onReactivate,
  onTransferOwnership,
}: MemberDetailDrawerProps) {
  const { currentUser } = useSynkazoAuth();
  const updateUserMutation = useUpdateUserMutation();
  const resetPasswordMutation = useResetPasswordByAdminMutation();

  const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');

  // Form states
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Inline lifecycle action state
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);

  // Password reset state
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [confirmManualPassword, setConfirmManualPassword] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const isCurrent = member?.id === currentUser?.id;
  const isEditor = role === 'editor';
  const hasFullAccess = role === 'org_admin' || role === 'super_admin';
  const orgId = member?.organisationId ?? '';

  const isSuperAdminActor = currentUser?.role === 'super_admin' || isSuperAdmin;
  const isOrgAdminActor = currentUser?.role === 'org_admin';
  const isRoleDisabled =
    isCurrent || member?.isOwner || member?.role === 'super_admin';
  const canResetPassword =
    !isCurrent &&
    (isSuperAdminActor ||
      (isOrgAdminActor &&
        member?.organisationId === currentUser?.organisationId &&
        member?.role !== 'super_admin'));

  // Load project access grants for editor
  const projectAccessQuery = useUserProjectAccessQuery(member?.id, {
    enabled: open && !!member?.id && member.role === 'editor',
  });

  // Sync state when drawer opens or target changes
  useEffect(() => {
    if (!member) {
      setFullName('');
      setDepartment('');
      setRole('editor');
      setEditPerms([]);
      setProjectIds([]);
      setIsActive(true);
      setConfirmAction(null);
      setActionReason('');
      setShowManualPassword(false);
      setManualPassword('');
      setConfirmManualPassword('');
      setActiveTab('details');
      return;
    }

    setFullName(member.fullName || '');
    setDepartment(member.department || '');
    setRole((member.role as UserRole) || 'editor');
    setIsActive(member.isActive !== false);
    setConfirmAction(null);
    setActionReason('');
    setShowManualPassword(false);
    setManualPassword('');
    setConfirmManualPassword('');
    setEditPerms(
      member.permissions
        ? (member.permissions as Permission[])
        : getPermissionsForRole(member.role as UserRole),
    );
  }, [member, open]);

  useEffect(() => {
    if (projectAccessQuery.data) {
      setProjectIds(projectAccessQuery.data.map((grant) => grant.projectId));
    }
  }, [projectAccessQuery.data]);

  const roleOptions: UserRole[] =
    currentUser?.role === 'super_admin'
      ? ['editor', 'org_admin', 'super_admin']
      : ['editor', 'org_admin'];

  const togglePerm = (perm: Permission) => {
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSave = async (requestClose: () => void) => {
    if (!member) return;

    const projectAccess: ProjectAccessGrant[] | undefined = isEditor
      ? projectIds.map((projectId) => ({
          projectId,
          permissions: ['read', 'write'],
        }))
      : undefined;

    try {
      await updateUserMutation.mutateAsync({
        id: member.id,
        data: {
          fullName: fullName.trim() || undefined,
          department: department.trim() || undefined,
          role,
          permissions: hasFullAccess ? ALL_PERMISSIONS : editPerms,
          projectAccess,
        },
      });

      toast.success('Member details and access updated successfully.');
      requestClose();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to update member');
    }
  };

  const handleExecuteLifecycleAction = async () => {
    if (!member || !confirmAction) return;
    setIsActionPending(true);
    const nextActive = confirmAction === 'reactivate';
    const reasonText = actionReason.trim();

    try {
      if (confirmAction === 'deactivate') {
        if (onDeactivate) {
          await onDeactivate(member, reasonText || undefined);
        } else {
          await updateUserMutation.mutateAsync({
            id: member.id,
            data: { isActive: false },
          });
          toast.success('Member deactivated.');
        }
      } else {
        if (onReactivate) {
          await onReactivate(member);
        } else {
          await updateUserMutation.mutateAsync({
            id: member.id,
            data: { isActive: true },
          });
          toast.success('Member reactivated.');
        }
      }

      setIsActive(nextActive);
      setConfirmAction(null);
      setActionReason('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Action failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!member) return;
    setIsSendingResetEmail(true);
    try {
      const res = await resetPasswordMutation.mutateAsync({ id: member.id });
      toast.success(res.message || 'Password reset link sent to user email.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ?? 'Failed to send password reset email',
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleSetManualPassword = async () => {
    if (!member) return;
    if (!manualPassword || manualPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (manualPassword !== confirmManualPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setIsSettingPassword(true);
    try {
      const res = await resetPasswordMutation.mutateAsync({
        id: member.id,
        newPassword: manualPassword,
      });
      toast.success(res.message || 'Password updated successfully.');
      setShowManualPassword(false);
      setManualPassword('');
      setConfirmManualPassword('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to update password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  if (!member) return null;

  const initials = (fullName || member.email)
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as 'details' | 'permissions')}
      className="gap-0"
    >
      <FormDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Member Details"
        description={member.email}
        size="compact"
        contentClassName="px-5 py-4"
        headerContent={
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground text-sm truncate">
                  {fullName || member.fullName || '—'}
                </span>
                {isCurrent && (
                  <span className="text-muted-foreground text-xs font-normal">
                    (You)
                  </span>
                )}
                {member.isOwner && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                    Owner
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                  {roleLabel(role)}
                </Badge>
                <StatusBadge
                  status={isActive ? 'active' : 'idle'}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span className="truncate">{member.email}</span>
                {member.isEmailVerified && (
                  <span className="flex items-center gap-1 text-success text-[11px] font-medium shrink-0">
                    <CheckCircle2 className="size-3 text-success shrink-0" />
                    Verified
                  </span>
                )}
              </div>
              {member.organisationName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                  {isSuperAdmin && member.organisationId ? (
                    <Link
                      to={`/super-admin/organisations/${member.organisationId}`}
                      className="text-primary hover:underline truncate font-medium text-[11px]"
                      title={`View organisation ${member.organisationName}`}
                    >
                      {member.organisationName}
                    </Link>
                  ) : (
                    <span className="truncate text-[11px]">{member.organisationName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        }
        headerBottom={
          <TabsList
            variant="line"
            className="h-10 min-w-max gap-6 p-0 border-0 bg-transparent -mb-px"
          >
            <TabsTrigger
              value="details"
              className="after:bg-primary py-2 text-xs font-semibold after:bottom-0! after:h-0.75!"
            >
              Profile & Details
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="after:bg-primary py-2 text-xs font-semibold after:bottom-0! after:h-0.75!"
            >
              Role & Permissions
            </TabsTrigger>
          </TabsList>
        }
        footer={(requestClose) => (
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {onTransferOwnership && member.isOwner && !isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onTransferOwnership(member)}
                >
                  Transfer ownership
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={requestClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                loading={updateUserMutation.isPending}
                onClick={() => handleSave(requestClose)}
              >
                <Save className="size-3.5" />
                Save changes
              </Button>
            </div>
          </div>
        )}
      >
        {/* TAB 1: Profile & Details */}
        <TabsContent value="details" className="space-y-5 outline-none py-1 mt-0">
          {/* User Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              User Information
            </h4>
            <div className="space-y-3">
              <Field>
                <FieldLabel className="text-xs">Full Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="h-8 text-xs"
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-xs">Department</FieldLabel>
                <FieldContent>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Operations, IT, Finance"
                    className="h-8 text-xs"
                  />
                </FieldContent>
              </Field>
            </div>
          </div>

          {/* Activity Timestamps */}
          <div className="border-t border-border/60 pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Activity & Dates
            </h4>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[11px]">Joined</p>
                <p className="font-medium text-foreground text-xs">
                  {member.createdAt
                    ? format(new Date(member.createdAt), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[11px]">Last Login</p>
                <p className="font-medium text-foreground text-xs">
                  {member.lastLoginAt
                    ? formatDistanceToNow(new Date(member.lastLoginAt), {
                        addSuffix: true,
                      })
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {/* Password & Security Section */}
          {canResetPassword && (
            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="size-3.5" />
                  Password & Security
                </h4>
                {!showManualPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-primary hover:text-primary px-1.5"
                    onClick={() => setShowManualPassword(true)}
                  >
                    Set password manually
                  </Button>
                )}
              </div>

              {!showManualPassword ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      Reset Password
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Send a secure password reset link to{' '}
                      <span className="font-mono text-foreground">
                        {member.email}
                      </span>
                      .
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    loading={isSendingResetEmail}
                    onClick={handleSendResetEmail}
                  >
                    <Mail className="size-3.5" />
                    Send Reset Link
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">
                      Set New Password
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Directly assign a temporary or new password for this user
                      (minimum 8 characters).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Field>
                      <FieldLabel className="text-xs">New Password</FieldLabel>
                      <FieldContent>
                        <Input
                          type="password"
                          placeholder="At least 8 characters"
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">
                        Confirm Password
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          type="password"
                          placeholder="Re-enter password"
                          value={confirmManualPassword}
                          onChange={(e) =>
                            setConfirmManualPassword(e.target.value)
                          }
                          className="h-8 text-xs bg-background"
                        />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setShowManualPassword(false);
                        setManualPassword('');
                        setConfirmManualPassword('');
                      }}
                      disabled={isSettingPassword}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs"
                      loading={isSettingPassword}
                      onClick={handleSetManualPassword}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Status & Inline Lifecycle Actions */}
          {!isCurrent && member.role !== 'super_admin' && (
            <div className="border-t border-border/60 pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account Status
              </h4>

              {confirmAction ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {confirmAction === 'deactivate'
                          ? `Deactivate ${member.fullName || member.email}?`
                          : `Reactivate ${member.fullName || member.email}?`}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {confirmAction === 'deactivate'
                          ? 'This member will lose access to all projects and sync jobs immediately until reactivated.'
                          : 'This member will regain their assigned project access and capabilities.'}
                      </p>
                    </div>
                  </div>
                  {confirmAction === 'deactivate' && (
                    <div className="space-y-1.5 pt-1">
                      <Label
                        htmlFor="deactivate-reason"
                        className="text-xs text-foreground font-medium"
                      >
                        Reason for deactivation
                      </Label>
                      <Input
                        id="deactivate-reason"
                        placeholder="e.g. Employee offboarding, inactive..."
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setConfirmAction(null);
                        setActionReason('');
                      }}
                      disabled={isActionPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={
                        confirmAction === 'deactivate'
                          ? 'destructive'
                          : 'default'
                      }
                      size="sm"
                      className="h-7 text-xs"
                      loading={isActionPending}
                      onClick={handleExecuteLifecycleAction}
                    >
                      {confirmAction === 'deactivate'
                        ? 'Confirm Deactivate'
                        : 'Confirm Reactivate'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {isActive ? 'Active Member' : 'Deactivated Member'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isActive
                        ? 'Has active access to assigned projects and organisation.'
                        : 'Access is suspended until reactivated.'}
                    </p>
                  </div>
                  <div>
                    {isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                        disabled={member.isOwner}
                        title={
                          member.isOwner
                            ? 'Cannot deactivate organisation owner'
                            : undefined
                        }
                        onClick={() => setConfirmAction('deactivate')}
                      >
                        <UserX className="size-3.5" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setConfirmAction('reactivate')}
                      >
                        <UserCheck className="size-3.5" />
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {member.isOwner && (
                <p className="text-[11px] text-muted-foreground italic">
                  This member is the organisation owner. Transfer ownership
                  before deactivating.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Role & Permissions */}
        <TabsContent
          value="permissions"
          className="space-y-5 outline-none py-1 mt-0"
        >
          {/* Role Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Role Assignment
            </h4>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isRoleDisabled}
              className="grid grid-cols-2 gap-2"
            >
              {roleOptions.map((r) => (
                <Label
                  key={r}
                  htmlFor={`drawer-role-${r}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-2.5 font-normal text-xs transition-colors',
                    isRoleDisabled
                      ? 'cursor-not-allowed opacity-60 bg-muted/20'
                      : 'hover:bg-muted/50 cursor-pointer',
                  )}
                >
                  <RadioGroupItem
                    value={r}
                    id={`drawer-role-${r}`}
                    disabled={isRoleDisabled}
                  />
                  <span className="font-medium">{roleLabel(r)}</span>
                </Label>
              ))}
            </RadioGroup>
            {isRoleDisabled && (
              <p className="text-[11px] text-muted-foreground">
                {isCurrent
                  ? 'You cannot change your own role.'
                  : member.isOwner
                    ? 'Organisation owner role is locked. Transfer ownership before changing roles.'
                    : 'Super Admin privileges cannot be modified.'}
              </p>
            )}
          </div>

          {hasFullAccess ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 flex items-start gap-2.5">
              <ShieldAlert className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {role === 'super_admin'
                    ? 'Super Admin Privileges'
                    : 'Full Administrator Privileges'}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {role === 'super_admin'
                    ? 'Super Admins have unrestricted access to all platform functionality across organisations.'
                    : 'Org Admins have complete access to all projects, configurations, and members in this organisation.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Project Access Grants for Editor */}
              <div className="border-t border-border/60 pt-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Project Access Grants
                </h4>
                <p className="text-muted-foreground text-[11px] leading-tight">
                  Only the selected projects will be accessible to this editor.
                  Leave empty for no project access.
                </p>
                <ProjectMultiSelect
                  value={projectIds}
                  onChange={setProjectIds}
                  organisationId={orgId}
                />
              </div>

              {/* Granular Capability Groups (Flat Checkbox Group) */}
              <div className="border-t border-border/60 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="size-3.5" />
                    Granular Capabilities
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {editPerms.length} assigned
                  </span>
                </div>
                <div className="space-y-3">
                  {EDITABLE_PERMISSION_GROUPS.map((group) => {
                    const groupCheckedCount = group.perms.filter((p) =>
                      editPerms.includes(p as Permission),
                    ).length;

                    return (
                      <div
                        key={group.label}
                        className="rounded-lg border border-border/60 bg-muted/10 p-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="font-semibold text-foreground text-xs">
                            {group.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {groupCheckedCount} / {group.perms.length} enabled
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {group.perms.map((perm) => (
                            <label
                              key={perm}
                              className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
                            >
                              <Checkbox
                                checked={editPerms.includes(perm as Permission)}
                                onCheckedChange={() =>
                                  togglePerm(perm as Permission)
                                }
                                id={`perm-${perm}`}
                              />
                              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                                <span className="text-xs font-medium text-foreground">
                                  {PERMISSION_LABELS[perm as Permission] ||
                                    perm}
                                </span>
                                <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                                  {perm}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </FormDrawer>
    </Tabs>
  );
}
