import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import FormDialog from '@/components/form/FormDialog';
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
import { useUpdateUserMutation } from '@/queries/useUsers';
import type { Permission, User, UserRole } from '@/types';

interface EditPermissionsDialogProps {
  user: User | null;
  onClose: () => void;
}

export default function EditPermissionsDialog({
  user,
  onClose,
}: EditPermissionsDialogProps) {
  const { currentUser } = useSynkazoAuth();
  const updateUserMutation = useUpdateUserMutation();
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [role, setRole] = useState<UserRole>('editor');

  // Org admins can promote/demote between editor and org_admin; only a super admin
  // can grant the super_admin role itself.
  const roleOptions: UserRole[] =
    currentUser?.role === 'super_admin'
      ? ['editor', 'org_admin', 'super_admin']
      : ['editor', 'org_admin'];
  const isSuperAdminRole = role === 'super_admin';

  useEffect(() => {
    // A user with no explicit `permissions` row is running on the role's default set (see
    // getPermissionsForRole) — falling back to `[]` here showed every checkbox unchecked even
    // though the user does have real access, since role-derived permissions were never written
    // to the row. Only an *explicit* [] (the user really has zero permissions) should render as
    // all-unchecked, so this checks for the field's absence, not its emptiness.
    if (!user) {
      setEditPerms([]);
      setRole('editor');
      return;
    }
    setEditPerms(
      user.permissions
        ? (user.permissions as Permission[])
        : getPermissionsForRole(user.role),
    );
    setRole(user.role);
  }, [user]);

  const togglePerm = (perm: Permission) =>
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );

  const savePermissions = () => {
    if (!user) return;
    updateUserMutation.mutate(
      {
        id: user.id,
        data: {
          role,
          permissions: isSuperAdminRole ? ALL_PERMISSIONS : editPerms,
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

        {isSuperAdminRole ? (
          <p className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
            Super Admins have unrestricted access to all functionality —
            granular permissions don't apply.
          </p>
        ) : (
          PERMISSION_GROUPS.map((group) => (
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
          ))
        )}
      </div>
    </FormDialog>
  );
}
