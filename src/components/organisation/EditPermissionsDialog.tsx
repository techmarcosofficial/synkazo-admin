import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ProjectAccessGrant } from '@/api/invitations';
import FormDialog from '@/components/form/FormDialog';
import ProjectMultiSelect from '@/components/shared/ProjectMultiSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getPermissionsForRole,
  roleLabel,
} from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import {
  useUpdateUserMutation,
  useUserProjectAccessQuery,
} from '@/queries/useUsers';
import type { Permission, User, UserRole } from '@/types';

interface EditPermissionsDialogProps {
  user: User | null;
  onClose: () => void;
}

// Connections/Team/Logs are org-wide surfaces, not something this dialog needs to
// gate per-user — dropped from the editable set here without touching the shared
// PERMISSION_GROUPS constant, which the Org Admin Dashboard's read-only legend
// still lists in full.
const EDITABLE_PERMISSION_GROUPS = PERMISSION_GROUPS.filter(
  (group) => !['Connections', 'Team', 'Logs'].includes(group.label),
);

export default function EditPermissionsDialog({
  user,
  onClose,
}: EditPermissionsDialogProps) {
  const { currentUser } = useSynkazoAuth();
  const updateUserMutation = useUpdateUserMutation();
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [role, setRole] = useState<UserRole>('editor');
  const [projectIds, setProjectIds] = useState<string[]>([]);

  // Org admins can promote/demote between editor and org_admin; only a super admin
  // can grant the super_admin role itself.
  const roleOptions: UserRole[] =
    currentUser?.role === 'super_admin'
      ? ['editor', 'org_admin', 'super_admin']
      : ['editor', 'org_admin'];
  // Both admin roles get unrestricted org access — granular checkboxes and the
  // per-project scoping below would be no-ops for them, so hide both.
  const hasFullAccess = role === 'org_admin' || role === 'super_admin';
  const isEditorRole = role === 'editor';

  const projectAccessQuery = useUserProjectAccessQuery(user?.id, {
    enabled: !!user && user.role === 'editor',
  });

  useEffect(() => {
    // A user with no explicit `permissions` row is running on the role's default set (see
    // getPermissionsForRole) — falling back to `[]` here showed every checkbox unchecked even
    // though the user does have real access, since role-derived permissions were never written
    // to the row. Only an *explicit* [] (the user really has zero permissions) should render as
    // all-unchecked, so this checks for the field's absence, not its emptiness.
    if (!user) {
      setEditPerms([]);
      setRole('editor');
      setProjectIds([]);
      return;
    }
    setEditPerms(
      user.permissions
        ? (user.permissions as Permission[])
        : getPermissionsForRole(user.role),
    );
    setRole(user.role);
  }, [user]);

  useEffect(() => {
    if (projectAccessQuery.data) {
      setProjectIds(projectAccessQuery.data.map((grant) => grant.projectId));
    }
  }, [projectAccessQuery.data]);

  const togglePerm = (perm: Permission) =>
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );

  const savePermissions = () => {
    if (!user) return;
    const projectAccess: ProjectAccessGrant[] | undefined = isEditorRole
      ? projectIds.map((projectId) => ({
          projectId,
          permissions: ['read', 'write'],
        }))
      : undefined;
    updateUserMutation.mutate(
      {
        id: user.id,
        data: {
          role,
          permissions: hasFullAccess ? ALL_PERMISSIONS : editPerms,
          projectAccess,
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(
            e?.response?.data?.message ?? 'Failed to save permissions',
          );
        },
      },
    );
  };

  return (
    <FormDialog
      open={!!user}
      onOpenChange={(open) => !open && onClose()}
      title="Edit Permissions"
      description={user?.email}
      size="md"
      footer={(requestClose) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            onClick={savePermissions}
            loading={updateUserMutation.isPending}
          >
            Save Permissions
          </Button>
        </>
      )}
    >
      <div className="max-h-[60vh] min-h-100 space-y-5 overflow-y-auto">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Role
          </p>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as UserRole)}
            className="flex gap-3"
          >
            {roleOptions.map((r) => (
              <Label
                key={r}
                htmlFor={`edit-role-${r}`}
                className="hover:bg-muted flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2 font-normal"
              >
                <RadioGroupItem value={r} id={`edit-role-${r}`} />
                <span className="text-sm">{roleLabel(r)}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {hasFullAccess ? (
          <p className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
            {role === 'super_admin'
              ? "Super Admins have unrestricted access to all functionality — granular permissions don't apply."
              : "Org Admins have full access to this organisation's functionality — granular permissions don't apply."}
          </p>
        ) : (
          <>
            {EDITABLE_PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.perms.map((perm) => (
                    <Label
                      key={perm}
                      className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md p-2 font-normal"
                    >
                      <Checkbox
                        checked={editPerms.includes(perm as Permission)}
                        onCheckedChange={() => togglePerm(perm as Permission)}
                      />
                      <span className="text-sm">
                        {PERMISSION_LABELS[perm] || perm}
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {perm}
                        </span>
                      </span>
                    </Label>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Project Access
              </p>
              <ProjectMultiSelect value={projectIds} onChange={setProjectIds} />
              <p className="text-muted-foreground mt-1.5 text-xs">
                Only the selected projects will be visible to this team
                member. Leave empty to grant no project access.
              </p>
            </div>
          </>
        )}
      </div>
    </FormDialog>
  );
}
