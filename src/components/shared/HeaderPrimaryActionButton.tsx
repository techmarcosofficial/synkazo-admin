import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useHeaderStore } from '@/stores/useHeaderStore';

// Renders whatever primary action the active tab has registered via
// useHeaderPrimaryAction — the page header itself never knows which tab is
// active or which button that implies.
export default function HeaderPrimaryActionButton() {
  const primaryAction = useHeaderStore((s) => s.primaryAction);

  if (!primaryAction) return null;

  const { label, icon: Icon, onClick, loading, disabled } = primaryAction;

  return (
    <Button onClick={onClick} disabled={disabled || loading}>
      {loading ? <Spinner /> : Icon ? <Icon /> : null}
      {label}
    </Button>
  );
}
