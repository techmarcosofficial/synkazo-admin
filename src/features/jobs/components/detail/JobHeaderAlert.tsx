import { useJobHeaderAlert } from './useJobHeaderAlert';

import PageContextAlert from '@/components/shared/PageContextAlert';
import { useAlertDismissStore } from '@/stores/useAlertDismissStore';

// Renders the single highest-priority page-context alert for the job detail
// page, below the header/tabs block and above tab content.
export default function JobHeaderAlert() {
  const resolved = useJobHeaderAlert();
  const dismissedMap = useAlertDismissStore((s) => s.dismissed);
  const dismiss = useAlertDismissStore((s) => s.dismiss);

  if (!resolved || dismissedMap[resolved.id]) return null;

  return (
    <PageContextAlert
      variant={resolved.variant}
      title={resolved.title}
      description={resolved.description}
      icon={resolved.icon}
      actions={resolved.actions}
      dismissible
      onDismiss={() => dismiss(resolved.id)}
    />
  );
}
