import { useEffect, useId, useRef } from 'react';

import {
  useHeaderStore,
  type HeaderPrimaryAction,
} from '@/stores/useHeaderStore';

export interface PrimaryActionInput extends Omit<HeaderPrimaryAction, 'key'> {
  visible?: boolean;
}

// Lets the active tab of a tab-based page declare its own header primary
// action instead of the page header hardcoding which button belongs to which
// tab. Pass null/undefined, or visible: false, to register no action —
// whatever was previously registered is cleared on unmount either way.
export function useHeaderPrimaryAction(
  action: PrimaryActionInput | null | undefined,
) {
  const key = useId();
  const setPrimaryAction = useHeaderStore((s) => s.setPrimaryAction);
  const clearPrimaryAction = useHeaderStore((s) => s.clearPrimaryAction);

  // onClick is read through a ref so callers don't need to memoize it — only
  // the primitives below trigger a re-registration.
  const onClickRef = useRef(action?.onClick);
  onClickRef.current = action?.onClick;

  const isVisible = !!action && action.visible !== false;
  const label = action?.label;
  const Icon = action?.icon;
  const loading = action?.loading;
  const disabled = action?.disabled;

  useEffect(() => {
    if (!isVisible || !label) {
      clearPrimaryAction(key);
      return;
    }
    setPrimaryAction({
      key,
      label,
      icon: Icon,
      loading,
      disabled,
      onClick: () => onClickRef.current?.(),
    });
    return () => clearPrimaryAction(key);
  }, [key, isVisible, label, Icon, loading, disabled]);
}
