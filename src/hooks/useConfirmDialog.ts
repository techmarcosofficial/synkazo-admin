import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

export function useConfirmDialog() {
  const confirm = useConfirmDialogStore((s) => s.confirm);
  return { confirm };
}
