import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { showToast } from '@/lib/toast';
import { useUpdateUserMutation } from '@/queries/useUsers';
import type { User } from '@/types';

/**
 * Confirm-then-toggle a member's access. Shared by the Members and Invitations
 * tabs, which previously carried byte-identical copies of this handler.
 *
 * Deactivate rather than hard-delete — it preserves the member's audit history,
 * lets an admin reverse the decision, and the backend already pauses everything
 * they created (UsersService.update → pauseAllForUser) so nothing keeps running
 * unattended.
 */
export function useSetMemberActive() {
  const { confirm } = useConfirmDialog();
  const updateUserMutation = useUpdateUserMutation();

  const setMemberActive = (member: User, active: boolean) => {
    const who = member.fullName || member.email;
    confirm({
      variant: active ? 'info' : 'danger',
      title: active ? `Reactivate ${who}?` : `Deactivate ${who}?`,
      description: active
        ? 'They will regain access to this organisation.'
        : 'They will lose access to this organisation, and any projects or jobs they created will be paused.',
      confirmLabel: active ? 'Yes, reactivate' : 'Yes, deactivate',
      onConfirm: async () => {
        try {
          await updateUserMutation.mutateAsync({
            id: member.id,
            data: { isActive: active },
          });
          showToast.success(
            active ? 'Member reactivated.' : 'Member deactivated.',
          );
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          showToast.error(
            e?.response?.data?.message ?? 'Something went wrong.',
          );
        }
      },
    });
  };

  return { setMemberActive, isPending: updateUserMutation.isPending };
}
